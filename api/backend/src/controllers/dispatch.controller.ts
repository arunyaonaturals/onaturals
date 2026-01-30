import { Response } from 'express';
import { query, queryOne, run, transaction } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';

export class DispatchController {
  getAllDispatches = async (req: AuthRequest, res: Response) => {
    try {
      const { status, priority, is_small_order, start_date, end_date } = req.query;
      let sql = `SELECT d.*, s.name as store_name, a.name as area_name, i.invoice_number
                 FROM dispatches d INNER JOIN invoices i ON d.invoice_id = i.id
                 INNER JOIN stores s ON i.store_id = s.id LEFT JOIN areas a ON s.area_id = a.id WHERE 1=1`;
      const params: any[] = [];

      if (status) { sql += ' AND d.status = ?'; params.push(status); }
      if (priority) { sql += ' AND d.priority = ?'; params.push(priority); }
      if (is_small_order !== undefined) { sql += ' AND d.is_small_order = ?'; params.push(is_small_order === 'true' ? 1 : 0); }
      if (start_date) { sql += ' AND date(d.created_at) >= ?'; params.push(start_date); }
      if (end_date) { sql += ' AND date(d.created_at) <= ?'; params.push(end_date); }
      sql += ' ORDER BY d.priority DESC, d.created_at ASC';

      const dispatches = await query(sql, params);
      res.json({ success: true, data: dispatches });
    } catch (error) {
      console.error('Get all dispatches error:', error);
      res.status(500).json({ success: false, message: 'Error fetching dispatches' });
    }
  };

  getPendingDispatches = async (req: AuthRequest, res: Response) => {
    try {
      const dispatches = await query(`
        SELECT d.*, s.name as store_name, a.name as area_name, i.invoice_number
        FROM dispatches d INNER JOIN invoices i ON d.invoice_id = i.id
        INNER JOIN stores s ON i.store_id = s.id LEFT JOIN areas a ON s.area_id = a.id
        WHERE d.status IN ('pending', 'ready') ORDER BY d.priority DESC, d.created_at ASC
      `);
      res.json({ success: true, data: dispatches });
    } catch (error) {
      console.error('Get pending dispatches error:', error);
      res.status(500).json({ success: false, message: 'Error fetching pending dispatches' });
    }
  };

  getDispatchesByPriority = async (req: AuthRequest, res: Response) => {
    try {
      const dispatches = await query(`
        SELECT d.*, s.name as store_name, a.name as area_name, i.invoice_number
        FROM dispatches d INNER JOIN invoices i ON d.invoice_id = i.id
        INNER JOIN stores s ON i.store_id = s.id LEFT JOIN areas a ON s.area_id = a.id
        WHERE d.status != 'delivered' ORDER BY d.priority DESC, d.created_at ASC
      `);
      res.json({ success: true, data: dispatches });
    } catch (error) {
      console.error('Get dispatches by priority error:', error);
      res.status(500).json({ success: false, message: 'Error fetching dispatches' });
    }
  };

  getSmallOrderDispatches = async (req: AuthRequest, res: Response) => {
    try {
      const dispatches = await query(`
        SELECT d.*, s.name as store_name, a.name as area_name, i.invoice_number
        FROM dispatches d INNER JOIN invoices i ON d.invoice_id = i.id
        INNER JOIN stores s ON i.store_id = s.id LEFT JOIN areas a ON s.area_id = a.id
        WHERE d.is_small_order = 1 AND d.status IN ('pending', 'ready') ORDER BY d.created_at ASC
      `);
      res.json({ success: true, data: dispatches });
    } catch (error) {
      console.error('Get small order dispatches error:', error);
      res.status(500).json({ success: false, message: 'Error fetching small orders' });
    }
  };

  getDispatchById = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const dispatch = await queryOne(`
        SELECT d.*, s.name as store_name, s.address as store_address, s.phone as store_phone,
        a.name as area_name, i.invoice_number FROM dispatches d
        INNER JOIN invoices i ON d.invoice_id = i.id INNER JOIN stores s ON i.store_id = s.id
        LEFT JOIN areas a ON s.area_id = a.id WHERE d.id = ?
      `, [id]);

      if (!dispatch) return res.status(404).json({ success: false, message: 'Dispatch not found' });

      const items = await query(`SELECT di.*, p.name as product_name FROM dispatch_items di
        INNER JOIN products p ON di.product_id = p.id WHERE di.dispatch_id = ?`, [id]);

      // Get batch allocations for this dispatch
      const batchAllocations = await query(`
        SELECT db.*, pb.batch_number, pb.production_date, p.name as product_name
        FROM dispatch_batches db
        INNER JOIN product_batches pb ON db.batch_id = pb.id
        INNER JOIN products p ON pb.product_id = p.id
        WHERE db.dispatch_id = ?
      `, [id]);

      res.json({ success: true, data: { ...dispatch, items, batch_allocations: batchAllocations } });
    } catch (error) {
      console.error('Get dispatch by id error:', error);
      res.status(500).json({ success: false, message: 'Error fetching dispatch' });
    }
  };

  createDispatch = async (req: AuthRequest, res: Response) => {
    try {
      const { invoice_id, packing_order_id, items, priority, notes } = req.body;
      if (!invoice_id || !items || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Invoice ID and items are required' });
      }

      const result = await transaction(async () => {
        const totalProducts = items.length;
        const totalQuantity = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
        const isSmallOrder = totalProducts <= 3 || totalQuantity <= 5;

        const dispatchResult = await run('INSERT INTO dispatches (invoice_id, packing_order_id, priority, is_small_order, notes) VALUES (?, ?, ?, ?, ?)',
          [invoice_id, packing_order_id || null, priority || 1, isSmallOrder ? 1 : 0, notes || null]);
        const dispatchId = dispatchResult.lastInsertRowid;

        const batchAllocations: any[] = [];

        for (const item of items) {
          const dispatchItemResult = await run('INSERT INTO dispatch_items (dispatch_id, product_id, quantity) VALUES (?, ?, ?)', 
            [dispatchId, item.product_id, item.quantity]);
          const dispatchItemId = dispatchItemResult.lastInsertRowid;

          // FIFO batch allocation
          let remainingQty = item.quantity;
          const availableBatches = await query(`
            SELECT id, batch_number, quantity_remaining 
            FROM product_batches 
            WHERE product_id = ? AND status = 'available' AND quantity_remaining > 0
            ORDER BY production_date ASC
          `, [item.product_id]);

          for (const batch of availableBatches) {
            if (remainingQty <= 0) break;

            const allocateQty = Math.min(remainingQty, batch.quantity_remaining);
            
            // Create batch allocation record
            await run(`
              INSERT INTO dispatch_batches (dispatch_id, invoice_item_id, batch_id, quantity)
              VALUES (?, ?, ?, ?)
            `, [dispatchId, item.invoice_item_id || dispatchItemId, batch.id, allocateQty]);

            // Update batch remaining quantity
            const newRemaining = batch.quantity_remaining - allocateQty;
            await run(`
              UPDATE product_batches 
              SET quantity_remaining = ?, 
                  status = CASE WHEN ? <= 0 THEN 'depleted' ELSE 'available' END,
                  updated_at = CURRENT_TIMESTAMP 
              WHERE id = ?
            `, [newRemaining, newRemaining, batch.id]);

            batchAllocations.push({
              product_id: item.product_id,
              batch_number: batch.batch_number,
              quantity: allocateQty
            });

            remainingQty -= allocateQty;
          }

          // If we couldn't allocate all from batches, log warning (still allow dispatch for non-batched products)
          if (remainingQty > 0 && availableBatches.length > 0) {
            console.warn(`Could not fully allocate batch for product ${item.product_id}. Remaining: ${remainingQty}`);
          }
        }
        return { dispatchId, isSmallOrder, batchAllocations };
      });

      res.status(201).json({ 
        success: true, 
        message: 'Dispatch created successfully', 
        data: { 
          id: result.dispatchId, 
          is_small_order: result.isSmallOrder,
          batch_allocations: result.batchAllocations
        } 
      });
    } catch (error) {
      console.error('Create dispatch error:', error);
      res.status(500).json({ success: false, message: 'Error creating dispatch' });
    }
  };

  updateDispatch = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { priority, notes, status, vehicle_number, driver_name, driver_phone } = req.body;

      const existing = await queryOne('SELECT id FROM dispatches WHERE id = ?', [id]);
      if (!existing) return res.status(404).json({ success: false, message: 'Dispatch not found' });

      await run(`UPDATE dispatches SET priority = COALESCE(?, priority), notes = COALESCE(?, notes),
        status = COALESCE(?, status), vehicle_number = COALESCE(?, vehicle_number),
        driver_name = COALESCE(?, driver_name), driver_phone = COALESCE(?, driver_phone),
        updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [priority, notes, status, vehicle_number, driver_name, driver_phone, id]);

      res.json({ success: true, message: 'Dispatch updated successfully' });
    } catch (error) {
      console.error('Update dispatch error:', error);
      res.status(500).json({ success: false, message: 'Error updating dispatch' });
    }
  };

  deleteDispatch = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const existing = await queryOne('SELECT status FROM dispatches WHERE id = ?', [id]);

      if (!existing) return res.status(404).json({ success: false, message: 'Dispatch not found' });
      if (existing.status !== 'pending') return res.status(400).json({ success: false, message: 'Can only delete pending dispatches' });

      await run('DELETE FROM dispatch_items WHERE dispatch_id = ?', [id]);
      await run('DELETE FROM dispatches WHERE id = ?', [id]);

      res.json({ success: true, message: 'Dispatch deleted successfully' });
    } catch (error) {
      console.error('Delete dispatch error:', error);
      res.status(500).json({ success: false, message: 'Error deleting dispatch' });
    }
  };

  updateDispatchStatus = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['pending', 'ready', 'in_transit', 'delivered', 'cancelled'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }

      const now = new Date().toISOString();
      let dispatchedAt = null, deliveredAt = null;
      if (status === 'in_transit') dispatchedAt = now;
      else if (status === 'delivered') deliveredAt = now;

      await run(`UPDATE dispatches SET status = ?, dispatched_at = COALESCE(?, dispatched_at),
        delivered_at = COALESCE(?, delivered_at), updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [status, dispatchedAt, deliveredAt, id]);

      res.json({ success: true, message: 'Status updated successfully' });
    } catch (error) {
      console.error('Update dispatch status error:', error);
      res.status(500).json({ success: false, message: 'Error updating status' });
    }
  };

  updatePriority = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { priority } = req.body;

      if (!priority || priority < 1 || priority > 10) {
        return res.status(400).json({ success: false, message: 'Priority must be between 1 and 10' });
      }

      await run('UPDATE dispatches SET priority = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [priority, id]);
      res.json({ success: true, message: 'Priority updated successfully' });
    } catch (error) {
      console.error('Update priority error:', error);
      res.status(500).json({ success: false, message: 'Error updating priority' });
    }
  };

  combineSmallOrders = async (req: AuthRequest, res: Response) => {
    try {
      const { dispatch_ids, combined_priority, notes } = req.body;
      if (!dispatch_ids || dispatch_ids.length < 2) {
        return res.status(400).json({ success: false, message: 'At least 2 dispatch IDs are required to combine' });
      }

      const result = await transaction(async () => {
        const placeholders = dispatch_ids.map(() => '?').join(',');
        const dispatches = await query(`SELECT id, status, is_small_order FROM dispatches WHERE id IN (${placeholders}) AND is_small_order = 1 AND status = 'pending'`, dispatch_ids);

        if (dispatches.length !== dispatch_ids.length) {
          throw new Error('All dispatches must be pending small orders');
        }

        const combinedResult = await run('INSERT INTO combined_dispatches (dispatch_ids, priority, notes) VALUES (?, ?, ?)',
          [JSON.stringify(dispatch_ids), combined_priority || 5, notes || null]);

        await run(`UPDATE dispatches SET combined_dispatch_id = ?, status = 'combined', updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
          [combinedResult.lastInsertRowid, ...dispatch_ids]);

        return combinedResult.lastInsertRowid;
      });

      res.json({ success: true, message: 'Small orders combined successfully', data: { combined_dispatch_id: result } });
    } catch (error: any) {
      console.error('Combine small orders error:', error);
      res.status(500).json({ success: false, message: error.message || 'Error combining orders' });
    }
  };
}
