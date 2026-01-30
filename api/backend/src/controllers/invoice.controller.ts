import { Response } from 'express';
import { query, queryOne, run, transaction } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { generateInvoicePDF } from '../utils/pdf.generator';

export class InvoiceController {
  getAllInvoices = async (req: AuthRequest, res: Response) => {
    try {
      const { store_id, status, billing_status, payment_status, start_date, end_date } = req.query;
      let sql = `SELECT i.id, i.invoice_number, i.order_id, i.store_id, i.invoice_date, i.due_date,
                 i.subtotal, i.discount, i.cgst, i.sgst, i.igst, i.total_gst, i.round_off, i.total_amount,
                 i.status, i.payment_status, COALESCE(i.billing_status, 'pending') as billing_status,
                 COALESCE(i.total_paid, 0) as total_paid, i.notes, i.created_by, i.created_at, i.updated_at,
                 s.name as store_name, s.gst_number as store_gst, u.name as created_by_name, a.name as area_name
                 FROM invoices i INNER JOIN stores s ON i.store_id = s.id
                 INNER JOIN users u ON i.created_by = u.id LEFT JOIN areas a ON s.area_id = a.id WHERE 1=1`;
      const params: any[] = [];

      if (store_id) { sql += ' AND i.store_id = ?'; params.push(store_id); }
      if (status) { 
        if (status === 'active') {
          sql += " AND i.status != 'cancelled'"; 
        } else {
          sql += ' AND i.status = ?'; params.push(status); 
        }
      }
      if (billing_status) { sql += ' AND COALESCE(i.billing_status, \'pending\') = ?'; params.push(billing_status); }
      if (payment_status) { sql += ' AND i.payment_status = ?'; params.push(payment_status); }
      if (start_date) { sql += ' AND date(i.created_at) >= ?'; params.push(start_date); }
      if (end_date) { sql += ' AND date(i.created_at) <= ?'; params.push(end_date); }
      sql += ' ORDER BY i.created_at DESC';

      const invoices = await query(sql, params);
      res.json({ success: true, data: invoices || [] });
    } catch (error) {
      console.error('Get all invoices error:', error);
      res.status(500).json({ success: false, message: 'Error fetching invoices' });
    }
  };

  getMyInvoices = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });

      const invoices = await query(`
        SELECT i.*, s.name as store_name, a.name as area_name FROM invoices i
        INNER JOIN stores s ON i.store_id = s.id LEFT JOIN areas a ON s.area_id = a.id
        WHERE i.created_by = ? ORDER BY i.created_at DESC
      `, [req.user.id]);

      res.json({ success: true, data: invoices });
    } catch (error) {
      console.error('Get my invoices error:', error);
      res.status(500).json({ success: false, message: 'Error fetching invoices' });
    }
  };

  getPendingInvoices = async (req: AuthRequest, res: Response) => {
    try {
      const invoices = await query(`
        SELECT i.*, s.name as store_name, u.name as created_by_name, a.name as area_name
        FROM invoices i INNER JOIN stores s ON i.store_id = s.id
        INNER JOIN users u ON i.created_by = u.id LEFT JOIN areas a ON s.area_id = a.id
        WHERE i.status = 'pending' OR i.payment_status = 'pending' ORDER BY i.created_at DESC
      `);
      res.json({ success: true, data: invoices });
    } catch (error) {
      console.error('Get pending invoices error:', error);
      res.status(500).json({ success: false, message: 'Error fetching pending invoices' });
    }
  };

  getInvoiceById = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const invoice = await queryOne(`
        SELECT i.*, s.name as store_name, s.address as store_address, s.gst_number as store_gst,
        s.phone as store_phone, s.email as store_email, s.city as store_city, s.state as store_state,
        s.pincode as store_pincode,
        u.name as created_by_name, a.name as area_name
        FROM invoices i INNER JOIN stores s ON i.store_id = s.id
        INNER JOIN users u ON i.created_by = u.id LEFT JOIN areas a ON s.area_id = a.id WHERE i.id = ?
      `, [id]);

      if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

      const items = await query(`SELECT ii.*, COALESCE(ii.total, ii.total_price, 0) as total, p.name as product_name, p.hsn_code, p.weight, p.weight_unit, p.mrp, p.gst_rate as product_gst_rate
        FROM invoice_items ii
        INNER JOIN products p ON ii.product_id = p.id WHERE ii.invoice_id = ?`, [id]);

      // Calculate HSN-wise breakdown
      const hsnBreakdown: { [key: string]: { hsn_code: string, taxable_value: number, cgst_rate: number, cgst_amount: number, sgst_rate: number, sgst_amount: number, total_tax: number } } = {};
      
      for (const item of items) {
        const hsnCode = item.hsn_code || 'N/A';
        const gstRate = item.gst_rate || item.product_gst_rate || 0;
        const taxableValue = item.total || item.total_price || 0;
        const halfRate = gstRate / 2;
        
        if (!hsnBreakdown[hsnCode]) {
          hsnBreakdown[hsnCode] = {
            hsn_code: hsnCode,
            taxable_value: 0,
            cgst_rate: halfRate,
            cgst_amount: 0,
            sgst_rate: halfRate,
            sgst_amount: 0,
            total_tax: 0
          };
        }
        
        hsnBreakdown[hsnCode].taxable_value += taxableValue;
        // If IGST invoice, cgst/sgst are 0, otherwise split GST in half
        if (invoice.igst > 0) {
          // IGST - no cgst/sgst breakdown
        } else {
          const itemCgst = taxableValue * (halfRate / 100);
          const itemSgst = taxableValue * (halfRate / 100);
          hsnBreakdown[hsnCode].cgst_amount += itemCgst;
          hsnBreakdown[hsnCode].sgst_amount += itemSgst;
          hsnBreakdown[hsnCode].total_tax += itemCgst + itemSgst;
        }
      }

      res.json({ success: true, data: { ...invoice, items, hsn_breakdown: Object.values(hsnBreakdown) } });
    } catch (error) {
      console.error('Get invoice by id error:', error);
      res.status(500).json({ success: false, message: 'Error fetching invoice' });
    }
  };

  createInvoice = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });

      const { store_id, items, notes, is_igst } = req.body;
      if (!store_id || !items || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Store ID and items are required' });
      }

      const result = await transaction(async () => {
        const lastInvoice = await queryOne('SELECT invoice_number FROM invoices ORDER BY id DESC LIMIT 1');
        const invoiceNumber = this.generateInvoiceNumber(lastInvoice?.invoice_number);

        let subtotal = 0;
        let totalCgst = 0;
        let totalSgst = 0;
        let totalIgst = 0;
        const processedItems: any[] = [];

        for (const item of items) {
          const product = await queryOne('SELECT mrp, cost, gst_rate FROM products WHERE id = ?', [item.product_id]);
          if (!product) throw new Error(`Product with id ${item.product_id} not found`);

          let marginPercentage = item.margin_percentage;
          if (marginPercentage === undefined) {
            const margin = await queryOne('SELECT margin_percentage FROM store_product_margins WHERE store_id = ? AND product_id = ?', [store_id, item.product_id]);
            marginPercentage = margin?.margin_percentage || 0;
          } else {
            const existing = await queryOne('SELECT id FROM store_product_margins WHERE store_id = ? AND product_id = ?', [store_id, item.product_id]);
            if (existing) {
              await run('UPDATE store_product_margins SET margin_percentage = ? WHERE store_id = ? AND product_id = ?', [marginPercentage, store_id, item.product_id]);
            } else {
              await run('INSERT INTO store_product_margins (store_id, product_id, margin_percentage) VALUES (?, ?, ?)', [store_id, item.product_id, marginPercentage]);
            }
          }

          // Use MRP as the base price, fallback to cost if MRP is not available
          const basePrice = product.mrp || product.cost || 0;
          const unitPrice = basePrice * (1 + marginPercentage / 100);
          const quantity = item.quantity;
          const quantityShipped = item.quantity_shipped || item.quantity; // Default to quantity if not specified
          const itemTotal = unitPrice * quantity;
          subtotal += itemTotal;

          // Get GST rate from product (per-item GST calculation)
          const gstRate = product.gst_rate || 0;
          
          // Calculate GST for this item
          if (is_igst) {
            totalIgst += itemTotal * (gstRate / 100);
          } else {
            totalCgst += itemTotal * (gstRate / 200); // Half rate for CGST
            totalSgst += itemTotal * (gstRate / 200); // Half rate for SGST
          }

          processedItems.push({ 
            product_id: item.product_id, 
            quantity: quantity, 
            quantity_shipped: quantityShipped,
            unit_price: unitPrice, 
            cost_price: basePrice, 
            margin_percentage: marginPercentage, 
            gst_rate: gstRate,
            total: itemTotal 
          });
        }

        // Calculate total before round off
        const totalBeforeRoundOff = subtotal + totalCgst + totalSgst + totalIgst;
        
        // Round off calculation
        const roundOff = Math.round(totalBeforeRoundOff) - totalBeforeRoundOff;
        const totalAmount = totalBeforeRoundOff + roundOff;

        const today = new Date().toISOString().split('T')[0];
        const invoiceResult = await run(`INSERT INTO invoices (invoice_number, store_id, invoice_date, created_by, subtotal, cgst, sgst, igst, round_off, total_amount, notes) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [invoiceNumber, store_id, today, req.user!.id, subtotal, totalCgst, totalSgst, totalIgst, roundOff, totalAmount, notes || null]);

        const invoiceId = invoiceResult.lastInsertRowid;

        for (const item of processedItems) {
          await run(`INSERT INTO invoice_items (invoice_id, product_id, quantity, quantity_shipped, unit_price, cost_price, margin_percentage, gst_rate, total, total_price) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [invoiceId, item.product_id, item.quantity, item.quantity_shipped, item.unit_price, item.cost_price, item.margin_percentage, item.gst_rate, item.total, item.total]);
        }

        return { invoiceId, invoiceNumber, totalAmount };
      });

      res.status(201).json({ success: true, message: 'Invoice created successfully', data: { id: result.invoiceId, invoice_number: result.invoiceNumber, total_amount: result.totalAmount } });
    } catch (error: any) {
      console.error('Create invoice error:', error);
      res.status(500).json({ success: false, message: error.message || 'Error creating invoice' });
    }
  };

  // Create invoice from order (Accountant can modify quantities)
  createInvoiceFromOrder = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });

      const { order_id, items, notes, is_igst } = req.body;
      if (!order_id || !items || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Order ID and items are required' });
      }

      // Get order details
      const order = await queryOne('SELECT * FROM orders WHERE id = ?', [order_id]);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
      if (order.status === 'invoiced') {
        return res.status(400).json({ success: false, message: 'Order has already been invoiced' });
      }
      if (order.status === 'cancelled') {
        return res.status(400).json({ success: false, message: 'Cannot invoice a cancelled order' });
      }
      // Allow invoice creation from both 'approved' and 'submitted' orders (for flexibility)
      if (!['submitted', 'approved'].includes(order.status)) {
        return res.status(400).json({ success: false, message: 'Order must be submitted or approved before invoicing' });
      }

      const store_id = order.store_id;

      const result = await transaction(async () => {
        const lastInvoice = await queryOne('SELECT invoice_number FROM invoices ORDER BY id DESC LIMIT 1');
        const invoiceNumber = this.generateInvoiceNumber(lastInvoice?.invoice_number);

        let subtotal = 0;
        let totalCgst = 0;
        let totalSgst = 0;
        let totalIgst = 0;
        const processedItems: any[] = [];

        for (const item of items) {
          if (item.quantity <= 0) continue; // Skip items with 0 quantity

          const product = await queryOne('SELECT mrp, cost, gst_rate FROM products WHERE id = ?', [item.product_id]);
          if (!product) throw new Error(`Product with id ${item.product_id} not found`);

          let marginPercentage = item.margin_percentage;
          if (marginPercentage === undefined) {
            const margin = await queryOne('SELECT margin_percentage FROM store_product_margins WHERE store_id = ? AND product_id = ?', [store_id, item.product_id]);
            marginPercentage = margin?.margin_percentage || 0;
          } else {
            const existing = await queryOne('SELECT id FROM store_product_margins WHERE store_id = ? AND product_id = ?', [store_id, item.product_id]);
            if (existing) {
              await run('UPDATE store_product_margins SET margin_percentage = ? WHERE store_id = ? AND product_id = ?', [marginPercentage, store_id, item.product_id]);
            } else {
              await run('INSERT INTO store_product_margins (store_id, product_id, margin_percentage) VALUES (?, ?, ?)', [store_id, item.product_id, marginPercentage]);
            }
          }

          const basePrice = product.mrp || product.cost || 0;
          const unitPrice = basePrice * (1 + marginPercentage / 100);
          const quantity = item.quantity;
          const quantityShipped = item.quantity_shipped || item.quantity;
          const itemTotal = unitPrice * quantity;
          subtotal += itemTotal;

          const gstRate = product.gst_rate || 0;
          
          if (is_igst) {
            totalIgst += itemTotal * (gstRate / 100);
          } else {
            totalCgst += itemTotal * (gstRate / 200);
            totalSgst += itemTotal * (gstRate / 200);
          }

          processedItems.push({ 
            product_id: item.product_id, 
            quantity: quantity, 
            quantity_shipped: quantityShipped,
            unit_price: unitPrice, 
            cost_price: basePrice, 
            margin_percentage: marginPercentage, 
            gst_rate: gstRate,
            total: itemTotal 
          });
        }

        if (processedItems.length === 0) {
          throw new Error('At least one item with quantity > 0 is required');
        }

        const totalBeforeRoundOff = subtotal + totalCgst + totalSgst + totalIgst;
        const roundOff = Math.round(totalBeforeRoundOff) - totalBeforeRoundOff;
        const totalAmount = totalBeforeRoundOff + roundOff;

        const today = new Date().toISOString().split('T')[0];
        const invoiceResult = await run(`
          INSERT INTO invoices (invoice_number, store_id, invoice_date, created_by, subtotal, cgst, sgst, igst, round_off, total_amount, notes, order_id) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [invoiceNumber, store_id, today, req.user!.id, subtotal, totalCgst, totalSgst, totalIgst, roundOff, totalAmount, notes || null, order_id]);

        const invoiceId = invoiceResult.lastInsertRowid;

        for (const item of processedItems) {
          await run(`
            INSERT INTO invoice_items (invoice_id, product_id, quantity, quantity_shipped, unit_price, cost_price, margin_percentage, gst_rate, total) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [invoiceId, item.product_id, item.quantity, item.quantity_shipped, item.unit_price, item.cost_price, item.margin_percentage, item.gst_rate, item.total]);

          // Deduct stock
          await run('UPDATE products SET stock_quantity = stock_quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
            [item.quantity, item.product_id]);
        }

        // Update order status to invoiced
        await run('UPDATE orders SET status = ?, invoice_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['invoiced', invoiceId, order_id]);

        // Auto-create dispatch
        const isSmallOrder = totalAmount < 5000 ? 1 : 0; // Small order threshold
        const priority = totalAmount >= 50000 ? 3 : (totalAmount >= 20000 ? 2 : 1); // Priority based on amount
        
        const dispatchResult = await run(`
          INSERT INTO dispatches (invoice_id, status, priority, is_small_order, notes) 
          VALUES (?, 'pending', ?, ?, ?)
        `, [invoiceId, priority, isSmallOrder, `Auto-created from order ${order.order_number}`]);

        const dispatchId = dispatchResult.lastInsertRowid;

        // Add dispatch items
        for (const item of processedItems) {
          await run(`
            INSERT INTO dispatch_items (dispatch_id, product_id, quantity) 
            VALUES (?, ?, ?)
          `, [dispatchId, item.product_id, item.quantity]);
        }

        return { invoiceId, invoiceNumber, totalAmount, dispatchId };
      });

      res.status(201).json({ 
        success: true, 
        message: 'Invoice created and dispatch prepared successfully', 
        data: { 
          id: result.invoiceId, 
          invoice_number: result.invoiceNumber, 
          total_amount: result.totalAmount,
          dispatch_id: result.dispatchId
        } 
      });
    } catch (error: any) {
      console.error('Create invoice from order error:', error);
      res.status(500).json({ success: false, message: error.message || 'Error creating invoice from order' });
    }
  };

  updateInvoice = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { notes, status } = req.body;

      const existing = await queryOne('SELECT id, status FROM invoices WHERE id = ?', [id]);
      if (!existing) return res.status(404).json({ success: false, message: 'Invoice not found' });
      if (existing.status === 'completed') return res.status(400).json({ success: false, message: 'Cannot modify completed invoice' });

      await run('UPDATE invoices SET notes = COALESCE(?, notes), status = COALESCE(?, status), updated_at = CURRENT_TIMESTAMP WHERE id = ?', [notes, status, id]);
      res.json({ success: true, message: 'Invoice updated successfully' });
    } catch (error) {
      console.error('Update invoice error:', error);
      res.status(500).json({ success: false, message: 'Error updating invoice' });
    }
  };

  // Cancel invoice (soft delete - changes status to cancelled)
  cancelInvoice = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const existing = await queryOne('SELECT status, payment_status, total_paid FROM invoices WHERE id = ?', [id]);

      if (!existing) return res.status(404).json({ success: false, message: 'Invoice not found' });
      if (existing.status === 'cancelled') return res.status(400).json({ success: false, message: 'Invoice is already cancelled' });
      
      // Check if payments have been made - warn but still allow cancellation
      if (existing.total_paid > 0) {
        // Still allow cancellation but log it
        console.log(`Cancelling invoice ${id} with payments of ${existing.total_paid}`);
      }

      await run("UPDATE invoices SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [id]);
      res.json({ success: true, message: 'Invoice cancelled successfully' });
    } catch (error) {
      console.error('Cancel invoice error:', error);
      res.status(500).json({ success: false, message: 'Error cancelling invoice' });
    }
  };

  // Hard delete invoice (permanently removes - admin only, only for cancelled invoices)
  deleteInvoice = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const existing = await queryOne('SELECT status FROM invoices WHERE id = ?', [id]);

      if (!existing) return res.status(404).json({ success: false, message: 'Invoice not found' });
      if (existing.status !== 'cancelled') {
        return res.status(400).json({ success: false, message: 'Only cancelled invoices can be permanently deleted. Cancel the invoice first.' });
      }

      // Delete related records first
      await run('DELETE FROM invoice_items WHERE invoice_id = ?', [id]);
      await run('DELETE FROM invoice_payments WHERE invoice_id = ?', [id]);
      await run('DELETE FROM invoices WHERE id = ?', [id]);
      
      res.json({ success: true, message: 'Invoice permanently deleted' });
    } catch (error) {
      console.error('Delete invoice error:', error);
      res.status(500).json({ success: false, message: 'Error deleting invoice' });
    }
  };

  updateBillingStatus = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { billing_status } = req.body;

      if (!['pending', 'billed', 'overdue'].includes(billing_status)) {
        return res.status(400).json({ success: false, message: 'Invalid billing status' });
      }

      await run('UPDATE invoices SET billing_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [billing_status, id]);
      res.json({ success: true, message: 'Billing status updated successfully' });
    } catch (error) {
      console.error('Update billing status error:', error);
      res.status(500).json({ success: false, message: 'Error updating billing status' });
    }
  };

  updatePaymentStatus = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { payment_status, payment_date, payment_amount, payment_method } = req.body;

      if (!['pending', 'partial', 'paid'].includes(payment_status)) {
        return res.status(400).json({ success: false, message: 'Invalid payment status' });
      }

      await run(`UPDATE invoices SET payment_status = ?, payment_date = COALESCE(?, payment_date),
        payment_amount = COALESCE(?, payment_amount), payment_method = COALESCE(?, payment_method),
        updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [payment_status, payment_date, payment_amount, payment_method, id]);

      res.json({ success: true, message: 'Payment status updated successfully' });
    } catch (error) {
      console.error('Update payment status error:', error);
      res.status(500).json({ success: false, message: 'Error updating payment status' });
    }
  };

  generateInvoicePDF = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const invoice = await queryOne(`
        SELECT i.*, s.name as store_name, s.address as store_address, s.gst_number as store_gst,
        s.phone as store_phone, s.email as store_email, s.city as store_city, s.state as store_state,
        s.pincode as store_pincode,
        u.name as created_by_name
        FROM invoices i INNER JOIN stores s ON i.store_id = s.id
        INNER JOIN users u ON i.created_by = u.id WHERE i.id = ?
      `, [id]);

      if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

      const items = await query(`SELECT ii.*, COALESCE(ii.total, ii.total_price, 0) as total, p.name as product_name, p.hsn_code, p.weight, p.weight_unit, p.mrp, p.gst_rate as product_gst_rate
        FROM invoice_items ii
        INNER JOIN products p ON ii.product_id = p.id WHERE ii.invoice_id = ?`, [id]);

      // Calculate HSN-wise breakdown for PDF
      const hsnBreakdown: { [key: string]: { hsn_code: string, taxable_value: number, cgst_rate: number, cgst_amount: number, sgst_rate: number, sgst_amount: number, total_tax: number } } = {};
      
      for (const item of items) {
        const hsnCode = item.hsn_code || 'N/A';
        const gstRate = item.gst_rate || item.product_gst_rate || 0;
        const taxableValue = item.total || item.total_price || 0;
        const halfRate = gstRate / 2;
        
        if (!hsnBreakdown[hsnCode]) {
          hsnBreakdown[hsnCode] = {
            hsn_code: hsnCode,
            taxable_value: 0,
            cgst_rate: halfRate,
            cgst_amount: 0,
            sgst_rate: halfRate,
            sgst_amount: 0,
            total_tax: 0
          };
        }
        
        hsnBreakdown[hsnCode].taxable_value += taxableValue;
        if (invoice.igst > 0) {
          // IGST - store total in cgst for simplicity
          const itemIgst = taxableValue * (gstRate / 100);
          hsnBreakdown[hsnCode].total_tax += itemIgst;
        } else {
          const itemCgst = taxableValue * (halfRate / 100);
          const itemSgst = taxableValue * (halfRate / 100);
          hsnBreakdown[hsnCode].cgst_amount += itemCgst;
          hsnBreakdown[hsnCode].sgst_amount += itemSgst;
          hsnBreakdown[hsnCode].total_tax += itemCgst + itemSgst;
        }
      }

      const invoiceData = { ...invoice, items, hsn_breakdown: Object.values(hsnBreakdown) };
      const pdfBuffer = await generateInvoicePDF(invoiceData);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=invoice_${invoice.invoice_number.replace(/\//g, '-')}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Generate PDF error:', error);
      res.status(500).json({ success: false, message: 'Error generating PDF' });
    }
  };

  private generateInvoiceNumber(lastNumber?: string): string {
    // Format: YYYY-YY/SEQ (e.g., 2025-26/659)
    // Financial year is April to March
    const now = new Date();
    const currentYear = now.getFullYear();
    const month = now.getMonth() + 1; // 1-12
    
    // Financial year starts in April (month 4)
    const fyStart = month >= 4 ? currentYear : currentYear - 1;
    const fyEnd = (fyStart + 1) % 100; // Get last 2 digits of next year
    const fyString = `${fyStart}-${fyEnd.toString().padStart(2, '0')}`;
    
    if (!lastNumber) return `${fyString}/1`;

    // Parse the last invoice number
    // Expected format: YYYY-YY/SEQ
    const match = lastNumber.match(/^(\d{4})-(\d{2})\/(\d+)$/);
    if (match) {
      const lastFyStart = parseInt(match[1]);
      const lastSeq = parseInt(match[3]);
      
      // If same financial year, increment sequence
      if (lastFyStart === fyStart) {
        return `${fyString}/${lastSeq + 1}`;
      }
      // New financial year, start from 1
      return `${fyString}/1`;
    }
    
    // Handle legacy format (ARC20250001) for backward compatibility
    if (lastNumber.startsWith('ARC')) {
      // New financial year format starts from 1
      return `${fyString}/1`;
    }
    
    // Default fallback
    return `${fyString}/1`;
  }
}
