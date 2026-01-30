import { Response } from 'express';
import { query, queryOne, run, transaction } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';

export class PackingController {
  getAllPackingOrders = async (req: AuthRequest, res: Response) => {
    try {
      const { status, priority, start_date, end_date } = req.query;
      let sql = `SELECT po.*, i.invoice_number, s.name as store_name, u.name as created_by_name
                 FROM packing_orders po INNER JOIN invoices i ON po.invoice_id = i.id
                 INNER JOIN stores s ON i.store_id = s.id INNER JOIN users u ON po.created_by = u.id WHERE 1=1`;
      const params: any[] = [];

      if (status) { sql += ' AND po.status = ?'; params.push(status); }
      if (priority) { sql += ' AND po.priority = ?'; params.push(priority); }
      if (start_date) { sql += ' AND DATE(po.created_at) >= ?'; params.push(start_date); }
      if (end_date) { sql += ' AND DATE(po.created_at) <= ?'; params.push(end_date); }
      sql += ' ORDER BY po.priority DESC, po.created_at ASC';

      const orders = await query(sql, params);
      res.json({ success: true, data: orders });
    } catch (error) {
      console.error('Get all packing orders error:', error);
      res.status(500).json({ success: false, message: 'Error fetching packing orders' });
    }
  };

  getPendingPackingOrders = async (req: AuthRequest, res: Response) => {
    try {
      const orders = await query(`
        SELECT po.*, i.invoice_number, s.name as store_name, u.name as created_by_name
        FROM packing_orders po INNER JOIN invoices i ON po.invoice_id = i.id
        INNER JOIN stores s ON i.store_id = s.id INNER JOIN users u ON po.created_by = u.id
        WHERE po.status IN ('pending', 'in_progress') ORDER BY po.priority DESC, po.created_at ASC
      `);
      res.json({ success: true, data: orders });
    } catch (error) {
      console.error('Get pending packing orders error:', error);
      res.status(500).json({ success: false, message: 'Error fetching pending orders' });
    }
  };

  getPackingOrdersByPriority = async (req: AuthRequest, res: Response) => {
    try {
      const orders = await query(`
        SELECT po.*, i.invoice_number, s.name as store_name, u.name as created_by_name
        FROM packing_orders po INNER JOIN invoices i ON po.invoice_id = i.id
        INNER JOIN stores s ON i.store_id = s.id INNER JOIN users u ON po.created_by = u.id
        WHERE po.status != 'completed' ORDER BY po.priority DESC, po.created_at ASC
      `);
      res.json({ success: true, data: orders });
    } catch (error) {
      console.error('Get orders by priority error:', error);
      res.status(500).json({ success: false, message: 'Error fetching orders' });
    }
  };

  getPackingOrderById = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const order = await queryOne(`
        SELECT po.*, i.invoice_number, s.name as store_name, u.name as created_by_name
        FROM packing_orders po INNER JOIN invoices i ON po.invoice_id = i.id
        INNER JOIN stores s ON i.store_id = s.id INNER JOIN users u ON po.created_by = u.id WHERE po.id = ?
      `, [id]);

      if (!order) return res.status(404).json({ success: false, message: 'Packing order not found' });

      const items = await query(`SELECT poi.*, p.name as product_name FROM packing_order_items poi
        INNER JOIN products p ON poi.product_id = p.id WHERE poi.packing_order_id = ?`, [id]);

      res.json({ success: true, data: { ...order, items } });
    } catch (error) {
      console.error('Get packing order by id error:', error);
      res.status(500).json({ success: false, message: 'Error fetching packing order' });
    }
  };

  createPackingOrder = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
      const { invoice_id, items, priority, notes } = req.body;

      if (!invoice_id || !items || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Invoice ID and items are required' });
      }

      const result = await transaction(async () => {
        const orderResult = await run('INSERT INTO packing_orders (invoice_id, created_by, priority, notes) VALUES (?, ?, ?, ?)',
          [invoice_id, req.user!.id, priority || 1, notes || null]);
        const packingOrderId = orderResult.lastInsertRowid;

        for (const item of items) {
          await run('INSERT INTO packing_order_items (packing_order_id, product_id, quantity) VALUES (?, ?, ?)',
            [packingOrderId, item.product_id, item.quantity]);
        }
        return packingOrderId;
      });

      res.status(201).json({ success: true, message: 'Packing order created successfully', data: { id: result } });
    } catch (error) {
      console.error('Create packing order error:', error);
      res.status(500).json({ success: false, message: 'Error creating packing order' });
    }
  };

  updatePackingOrder = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { priority, notes, status } = req.body;

      const existing = await queryOne('SELECT id FROM packing_orders WHERE id = ?', [id]);
      if (!existing) return res.status(404).json({ success: false, message: 'Packing order not found' });

      await run('UPDATE packing_orders SET priority = COALESCE(?, priority), notes = COALESCE(?, notes), status = COALESCE(?, status), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [priority, notes, status, id]);

      res.json({ success: true, message: 'Packing order updated successfully' });
    } catch (error) {
      console.error('Update packing order error:', error);
      res.status(500).json({ success: false, message: 'Error updating packing order' });
    }
  };

  deletePackingOrder = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const existing = await queryOne('SELECT status FROM packing_orders WHERE id = ?', [id]);

      if (!existing) return res.status(404).json({ success: false, message: 'Packing order not found' });
      if (existing.status !== 'pending') return res.status(400).json({ success: false, message: 'Can only delete pending packing orders' });

      await run('DELETE FROM packing_order_items WHERE packing_order_id = ?', [id]);
      await run('DELETE FROM packing_orders WHERE id = ?', [id]);

      res.json({ success: true, message: 'Packing order deleted successfully' });
    } catch (error) {
      console.error('Delete packing order error:', error);
      res.status(500).json({ success: false, message: 'Error deleting packing order' });
    }
  };

  updatePackingStatus = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['pending', 'in_progress', 'completed', 'cancelled'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }

      const completedAt = status === 'completed' ? new Date().toISOString() : null;
      await run('UPDATE packing_orders SET status = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, completedAt, id]);

      res.json({ success: true, message: 'Status updated successfully' });
    } catch (error) {
      console.error('Update packing status error:', error);
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

      await run('UPDATE packing_orders SET priority = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [priority, id]);
      res.json({ success: true, message: 'Priority updated successfully' });
    } catch (error) {
      console.error('Update priority error:', error);
      res.status(500).json({ success: false, message: 'Error updating priority' });
    }
  };
}
