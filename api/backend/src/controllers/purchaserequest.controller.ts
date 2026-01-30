import { Response } from 'express';
import { query, queryOne, run, transaction } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';

export class PurchaseRequestController {
  // Get all purchase requests with filters
  getAllRequests = async (req: AuthRequest, res: Response) => {
    try {
      const { vendor_id, status, start_date, end_date } = req.query;
      let sql = `
        SELECT pr.*, v.name as vendor_name, v.phone as vendor_phone, u.name as created_by_name,
          (SELECT COUNT(*) FROM purchase_request_items WHERE request_id = pr.id) as item_count
        FROM purchase_requests pr
        INNER JOIN vendors v ON pr.vendor_id = v.id
        INNER JOIN users u ON pr.created_by = u.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (vendor_id) { sql += ' AND pr.vendor_id = ?'; params.push(vendor_id); }
      if (status) { sql += ' AND pr.status = ?'; params.push(status); }
      if (start_date) { sql += ' AND date(pr.request_date) >= ?'; params.push(start_date); }
      if (end_date) { sql += ' AND date(pr.request_date) <= ?'; params.push(end_date); }
      sql += ' ORDER BY pr.created_at DESC';

      const requests = await query(sql, params);
      res.json({ success: true, data: requests });
    } catch (error) {
      console.error('Get all purchase requests error:', error);
      res.status(500).json({ success: false, message: 'Error fetching purchase requests' });
    }
  };

  // Get pending requests (submitted but not fully received)
  getPendingRequests = async (req: AuthRequest, res: Response) => {
    try {
      const requests = await query(`
        SELECT pr.*, v.name as vendor_name, v.phone as vendor_phone, u.name as created_by_name,
          (SELECT COUNT(*) FROM purchase_request_items WHERE request_id = pr.id) as item_count,
          (SELECT SUM(quantity_ordered) FROM purchase_request_items WHERE request_id = pr.id) as total_ordered,
          (SELECT SUM(quantity_received) FROM purchase_request_items WHERE request_id = pr.id) as total_received
        FROM purchase_requests pr
        INNER JOIN vendors v ON pr.vendor_id = v.id
        INNER JOIN users u ON pr.created_by = u.id
        WHERE pr.status IN ('submitted', 'partial')
        ORDER BY pr.expected_date ASC, pr.created_at ASC
      `);
      res.json({ success: true, data: requests });
    } catch (error) {
      console.error('Get pending requests error:', error);
      res.status(500).json({ success: false, message: 'Error fetching pending requests' });
    }
  };

  // Get request by ID with items and receipts
  getRequestById = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const request = await queryOne(`
        SELECT pr.*, v.name as vendor_name, v.address as vendor_address, v.phone as vendor_phone,
          v.email as vendor_email, v.gst_number as vendor_gst, v.payment_days,
          u.name as created_by_name
        FROM purchase_requests pr
        INNER JOIN vendors v ON pr.vendor_id = v.id
        INNER JOIN users u ON pr.created_by = u.id
        WHERE pr.id = ?
      `, [id]);

      if (!request) {
        return res.status(404).json({ success: false, message: 'Purchase request not found' });
      }

      // Get items with raw material details
      const items = await query(`
        SELECT pri.*, rm.name as material_name, rm.hsn_code, rm.unit, rm.stock_quantity as current_stock
        FROM purchase_request_items pri
        INNER JOIN raw_materials rm ON pri.raw_material_id = rm.id
        WHERE pri.request_id = ?
      `, [id]);

      // Get related receipts
      const receipts = await query(`
        SELECT rmr.*, 
          (SELECT SUM(rmi.quantity) FROM raw_material_items rmi WHERE rmi.receipt_id = rmr.id) as items_received
        FROM raw_material_receipts rmr
        WHERE rmr.purchase_request_id = ?
        ORDER BY rmr.receipt_date DESC
      `, [id]);

      res.json({ success: true, data: { ...request, items, receipts } });
    } catch (error) {
      console.error('Get request by id error:', error);
      res.status(500).json({ success: false, message: 'Error fetching purchase request' });
    }
  };

  // Create new purchase request (immediately creates vendor bill)
  // Also handles creating new raw materials if they don't exist
  createRequest = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });

      const { vendor_id, items, expected_date, notes } = req.body;
      if (!vendor_id || !items || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Vendor and items are required' });
      }

      // Get vendor payment days for due date calculation
      const vendor = await queryOne('SELECT payment_days, name FROM vendors WHERE id = ?', [vendor_id]);
      if (!vendor) {
        return res.status(400).json({ success: false, message: 'Vendor not found' });
      }
      const paymentDays = vendor.payment_days || 30;

      const result = await transaction(async () => {
        // Generate request number
        const lastRequest = await queryOne('SELECT request_number FROM purchase_requests ORDER BY id DESC LIMIT 1');
        const requestNumber = this.generateRequestNumber(lastRequest?.request_number);
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        // Calculate due date
        const dueDate = new Date(today.getTime() + paymentDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // Process items - create new raw materials if needed
        const processedItems: Array<{
          raw_material_id: number;
          quantity: number;
          unit_price: number;
        }> = [];

        let totalAmount = 0;
        const newMaterialsCreated: string[] = [];

        for (const item of items) {
          let rawMaterialId = item.raw_material_id;

          // If this is a new material, create it first
          if (item.is_new && item.material_name) {
            // Check if material with same name already exists
            const existing = await queryOne('SELECT id FROM raw_materials WHERE LOWER(name) = LOWER(?)', [item.material_name.trim()]);
            
            if (existing) {
              rawMaterialId = existing.id;
            } else {
              // Create new raw material
              const newMaterialResult = await run(`
                INSERT INTO raw_materials (name, hsn_code, unit, stock_quantity, cost_per_unit, vendor_id, reorder_level, is_active)
                VALUES (?, ?, ?, 0, ?, ?, ?, 1)
              `, [
                item.material_name.trim(),
                item.hsn_code || '',
                item.unit || 'kg',
                item.unit_price || 0,
                vendor_id,  // Link to this vendor
                item.reorder_level || 10
              ]);
              rawMaterialId = newMaterialResult.lastInsertRowid;
              newMaterialsCreated.push(item.material_name);
            }
          }

          if (!rawMaterialId) {
            throw new Error(`Invalid material: ${item.material_name || 'unknown'}`);
          }

          const itemTotal = (item.quantity || 0) * (item.unit_price || 0);
          totalAmount += itemTotal;

          processedItems.push({
            raw_material_id: rawMaterialId,
            quantity: item.quantity,
            unit_price: item.unit_price || 0
          });
        }

        // Create request with status 'submitted' (skip draft)
        const requestResult = await run(`
          INSERT INTO purchase_requests (request_number, vendor_id, created_by, status, request_date, expected_date, total_amount, notes)
          VALUES (?, ?, ?, 'submitted', ?, ?, ?, ?)
        `, [requestNumber, vendor_id, req.user!.id, todayStr, expected_date || null, totalAmount, notes || null]);

        const requestId = requestResult.lastInsertRowid;

        // Add request items
        for (const item of processedItems) {
          const itemTotal = (item.quantity || 0) * (item.unit_price || 0);
          await run(`
            INSERT INTO purchase_request_items (request_id, raw_material_id, quantity_ordered, unit_price, total, notes)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [requestId, item.raw_material_id, item.quantity, item.unit_price, itemTotal, null]);
        }

        // Create vendor bill (raw_material_receipt) immediately
        const receiptNumber = this.generateReceiptNumber();
        await run(`
          INSERT INTO raw_material_receipts (receipt_number, vendor_id, receipt_date, total_amount, payment_status, due_date, purchase_request_id, arrival_status, notes)
          VALUES (?, ?, ?, ?, 'pending', ?, ?, 'pending', ?)
        `, [receiptNumber, vendor_id, todayStr, totalAmount, dueDate, requestId, `Bill for request ${requestNumber}`]);

        return { requestId, requestNumber, totalAmount, dueDate, receiptNumber, newMaterialsCreated };
      });

      let message = `Request created and purchase bill generated. Due date: ${result.dueDate}`;
      if (result.newMaterialsCreated.length > 0) {
        message += `. New materials added: ${result.newMaterialsCreated.join(', ')}`;
      }

      res.status(201).json({
        success: true,
        message,
        data: { 
          id: result.requestId, 
          request_number: result.requestNumber, 
          total_amount: result.totalAmount,
          due_date: result.dueDate,
          receipt_number: result.receiptNumber,
          new_materials_created: result.newMaterialsCreated
        }
      });
    } catch (error: any) {
      console.error('Create purchase request error:', error);
      res.status(500).json({ success: false, message: error.message || 'Error creating purchase request' });
    }
  };

  // Update purchase request (only draft)
  updateRequest = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { items, expected_date, notes } = req.body;

      const existing = await queryOne('SELECT id, status FROM purchase_requests WHERE id = ?', [id]);
      if (!existing) return res.status(404).json({ success: false, message: 'Purchase request not found' });
      if (existing.status !== 'draft') {
        return res.status(400).json({ success: false, message: 'Only draft requests can be modified' });
      }

      await transaction(async () => {
        // Update request
        let totalAmount = 0;
        if (items && items.length > 0) {
          // Delete existing items and re-add
          await run('DELETE FROM purchase_request_items WHERE request_id = ?', [id]);
          
          for (const item of items) {
            const itemTotal = (item.quantity || 0) * (item.unit_price || 0);
            totalAmount += itemTotal;
            await run(`
              INSERT INTO purchase_request_items (request_id, raw_material_id, quantity_ordered, unit_price, total, notes)
              VALUES (?, ?, ?, ?, ?, ?)
            `, [id, item.raw_material_id, item.quantity, item.unit_price || 0, itemTotal, item.notes || null]);
          }
        }

        await run(`
          UPDATE purchase_requests 
          SET expected_date = COALESCE(?, expected_date), 
              notes = COALESCE(?, notes), 
              total_amount = ?,
              updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `, [expected_date, notes, totalAmount, id]);
      });

      res.json({ success: true, message: 'Purchase request updated successfully' });
    } catch (error) {
      console.error('Update purchase request error:', error);
      res.status(500).json({ success: false, message: 'Error updating purchase request' });
    }
  };

  // Submit purchase request (legacy - bill is now created on request creation)
  // This endpoint is kept for backward compatibility with draft requests
  submitRequest = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const existing = await queryOne('SELECT * FROM purchase_requests WHERE id = ?', [id]);
      if (!existing) return res.status(404).json({ success: false, message: 'Purchase request not found' });
      
      // Check if already submitted
      if (existing.status !== 'draft') {
        return res.json({ 
          success: true, 
          message: 'Request is already submitted',
          data: { status: existing.status }
        });
      }

      // Get vendor payment days for due date calculation
      const vendor = await queryOne('SELECT payment_days FROM vendors WHERE id = ?', [existing.vendor_id]);
      const paymentDays = vendor?.payment_days || 30;
      const today = new Date();
      const dueDate = new Date(today.getTime() + paymentDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Check if bill already exists
      const existingBill = await queryOne('SELECT id FROM raw_material_receipts WHERE purchase_request_id = ?', [id]);

      await transaction(async () => {
        // Update request status
        await run(`
          UPDATE purchase_requests 
          SET status = 'submitted', request_date = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `, [today.toISOString().split('T')[0], id]);

        // Create vendor bill only if it doesn't exist
        if (!existingBill) {
          const receiptNumber = this.generateReceiptNumber();
          await run(`
            INSERT INTO raw_material_receipts (receipt_number, vendor_id, receipt_date, total_amount, payment_status, due_date, purchase_request_id, arrival_status, notes)
            VALUES (?, ?, ?, ?, 'pending', ?, ?, 'pending', ?)
          `, [receiptNumber, existing.vendor_id, today.toISOString().split('T')[0], existing.total_amount, dueDate, id, `Bill for request ${existing.request_number}`]);
        }
      });

      res.json({ 
        success: true, 
        message: 'Purchase request submitted. Vendor bill created with due date: ' + dueDate,
        data: { due_date: dueDate }
      });
    } catch (error) {
      console.error('Submit purchase request error:', error);
      res.status(500).json({ success: false, message: 'Error submitting purchase request' });
    }
  };

  // Record material receipt (partial or full)
  recordReceipt = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });

      const { id } = req.params;
      const { items, notes } = req.body; // items: [{ item_id, quantity_received }]

      if (!items || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Items with quantities are required' });
      }

      const request = await queryOne('SELECT * FROM purchase_requests WHERE id = ?', [id]);
      if (!request) return res.status(404).json({ success: false, message: 'Purchase request not found' });
      if (!['submitted', 'partial'].includes(request.status)) {
        return res.status(400).json({ success: false, message: 'Can only record receipts for submitted or partial requests' });
      }

      const result = await transaction(async () => {
        let anyReceived = false;
        let allReceived = true;

        // Update each item's received quantity
        for (const item of items) {
          if (item.quantity_received > 0) {
            anyReceived = true;
            
            // Update request item
            await run(`
              UPDATE purchase_request_items 
              SET quantity_received = quantity_received + ?
              WHERE id = ?
            `, [item.quantity_received, item.item_id]);

            // Get the raw material id and update stock
            const requestItem = await queryOne('SELECT raw_material_id FROM purchase_request_items WHERE id = ?', [item.item_id]);
            if (requestItem) {
              await run(`
                UPDATE raw_materials 
                SET stock_quantity = stock_quantity + ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
              `, [item.quantity_received, requestItem.raw_material_id]);
            }
          }
        }

        // Check if all items are fully received
        const itemsStatus = await query(`
          SELECT quantity_ordered, quantity_received FROM purchase_request_items WHERE request_id = ?
        `, [id]);

        for (const item of itemsStatus) {
          if (item.quantity_received < item.quantity_ordered) {
            allReceived = false;
            break;
          }
        }

        // Update request status
        let newStatus = request.status;
        if (allReceived) {
          newStatus = 'received';
        } else if (anyReceived) {
          newStatus = 'partial';
        }

        await run(`
          UPDATE purchase_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `, [newStatus, id]);

        // Update the linked receipt's arrival status
        const arrivalStatus = allReceived ? 'received' : 'partial';
        await run(`
          UPDATE raw_material_receipts 
          SET arrival_status = ?, notes = COALESCE(notes || ' | ', '') || ?
          WHERE purchase_request_id = ?
        `, [arrivalStatus, notes || `Receipt recorded on ${new Date().toISOString().split('T')[0]}`, id]);

        return { newStatus, allReceived };
      });

      res.json({ 
        success: true, 
        message: result.allReceived ? 'All materials received. Request completed.' : 'Partial receipt recorded.',
        data: { status: result.newStatus, fully_received: result.allReceived }
      });
    } catch (error) {
      console.error('Record receipt error:', error);
      res.status(500).json({ success: false, message: 'Error recording receipt' });
    }
  };

  // Cancel purchase request
  cancelRequest = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const existing = await queryOne('SELECT * FROM purchase_requests WHERE id = ?', [id]);
      if (!existing) return res.status(404).json({ success: false, message: 'Purchase request not found' });
      if (existing.status === 'received') {
        return res.status(400).json({ success: false, message: 'Cannot cancel a fully received request' });
      }

      await transaction(async () => {
        await run(`UPDATE purchase_requests SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
        
        // Also cancel the linked bill if exists and not paid
        await run(`
          UPDATE raw_material_receipts 
          SET notes = COALESCE(notes || ' | ', '') || 'Request cancelled'
          WHERE purchase_request_id = ? AND payment_status = 'pending'
        `, [id]);
      });

      res.json({ success: true, message: 'Purchase request cancelled' });
    } catch (error) {
      console.error('Cancel purchase request error:', error);
      res.status(500).json({ success: false, message: 'Error cancelling request' });
    }
  };

  // Delete purchase request (only draft or cancelled)
  deleteRequest = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const existing = await queryOne('SELECT status FROM purchase_requests WHERE id = ?', [id]);
      if (!existing) return res.status(404).json({ success: false, message: 'Purchase request not found' });
      if (!['draft', 'cancelled'].includes(existing.status)) {
        return res.status(400).json({ success: false, message: 'Only draft or cancelled requests can be deleted' });
      }

      await transaction(async () => {
        await run('DELETE FROM purchase_request_items WHERE request_id = ?', [id]);
        await run('DELETE FROM purchase_requests WHERE id = ?', [id]);
      });

      res.json({ success: true, message: 'Purchase request deleted' });
    } catch (error) {
      console.error('Delete purchase request error:', error);
      res.status(500).json({ success: false, message: 'Error deleting request' });
    }
  };

  private generateRequestNumber(lastNumber?: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const fyStart = month >= 4 ? year : year - 1;
    const fyEnd = (fyStart + 1) % 100;
    const fyString = `${fyStart}-${fyEnd.toString().padStart(2, '0')}`;
    
    const prefix = `PR-${fyString}/`;
    
    if (!lastNumber) return `${prefix}1`;

    const match = lastNumber.match(/PR-\d{4}-\d{2}\/(\d+)$/);
    if (match) {
      const lastFy = lastNumber.substring(3, 10);
      if (lastFy === fyString) {
        return `${prefix}${parseInt(match[1]) + 1}`;
      }
    }
    
    return `${prefix}1`;
  }

  private generateReceiptNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    return `RMR${year}${timestamp}`;
  }
}
