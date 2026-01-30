import { Response } from 'express';
import { query, queryOne, run, transaction } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';

export class OrderController {
  // Get all orders (with filters)
  getAllOrders = async (req: AuthRequest, res: Response) => {
    try {
      const { store_id, status, created_by, start_date, end_date } = req.query;
      let sql = `
        SELECT o.id, o.order_number, o.store_id, o.status, o.total_amount, o.notes,
               o.created_by, o.created_at, o.updated_at,
               s.name as store_name, s.city as store_city, u.name as created_by_name, 
               a.name as area_name
        FROM orders o 
        INNER JOIN stores s ON o.store_id = s.id
        INNER JOIN users u ON o.created_by = u.id 
        LEFT JOIN areas a ON s.area_id = a.id 
        WHERE 1=1
      `;
      const params: any[] = [];

      if (store_id) { sql += ' AND o.store_id = ?'; params.push(store_id); }
      if (status) { sql += ' AND o.status = ?'; params.push(status); }
      if (created_by) { sql += ' AND o.created_by = ?'; params.push(created_by); }
      if (start_date) { sql += ' AND date(o.created_at) >= ?'; params.push(start_date); }
      if (end_date) { sql += ' AND date(o.created_at) <= ?'; params.push(end_date); }
      sql += ' ORDER BY o.created_at DESC';

      const orders = await query(sql, params);
      res.json({ success: true, data: orders || [] });
    } catch (error) {
      console.error('Get all orders error:', error);
      res.status(500).json({ success: false, message: 'Error fetching orders' });
    }
  };

  // Get orders created by current user (Sales Captain)
  getMyOrders = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });

      const orders = await query(`
        SELECT o.id, o.order_number, o.store_id, o.status, o.total_amount, o.notes,
               o.created_by, o.created_at, o.updated_at,
               s.name as store_name, s.city as store_city, a.name as area_name
        FROM orders o
        INNER JOIN stores s ON o.store_id = s.id 
        LEFT JOIN areas a ON s.area_id = a.id
        WHERE o.created_by = ? 
        ORDER BY o.created_at DESC
      `, [req.user.id]);

      res.json({ success: true, data: orders || [] });
    } catch (error) {
      console.error('Get my orders error:', error);
      res.status(500).json({ success: false, message: 'Error fetching orders' });
    }
  };

  // Get submitted orders (for Accountant to process)
  getSubmittedOrders = async (req: AuthRequest, res: Response) => {
    try {
      const orders = await query(`
        SELECT o.id, o.order_number, o.store_id, o.status, o.total_amount, o.notes,
               o.created_by, o.created_at, o.updated_at,
               s.name as store_name, s.city as store_city, s.address as store_address,
               s.gst_number as store_gst, u.name as created_by_name, a.name as area_name
        FROM orders o
        INNER JOIN stores s ON o.store_id = s.id
        INNER JOIN users u ON o.created_by = u.id 
        LEFT JOIN areas a ON s.area_id = a.id
        WHERE o.status = 'submitted'
        ORDER BY o.created_at ASC
      `);

      res.json({ success: true, data: orders || [] });
    } catch (error) {
      console.error('Get submitted orders error:', error);
      res.status(500).json({ success: false, message: 'Error fetching submitted orders' });
    }
  };

  // Get order by ID with items
  getOrderById = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const order = await queryOne(`
        SELECT o.id, o.order_number, o.store_id, o.status, o.total_amount, o.notes,
               o.created_by, o.created_at, o.updated_at,
               s.name as store_name, s.address as store_address, s.gst_number as store_gst,
               s.phone as store_phone, s.city as store_city, s.state as store_state,
               u.name as created_by_name, a.name as area_name
        FROM orders o 
        INNER JOIN stores s ON o.store_id = s.id
        INNER JOIN users u ON o.created_by = u.id 
        LEFT JOIN areas a ON s.area_id = a.id 
        WHERE o.id = ?
      `, [id]);

      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

      const items = await query(`
        SELECT oi.id, oi.order_id, oi.product_id, oi.quantity, 
               COALESCE(oi.store_stock, oi.stock_qty, 0) as store_stock,
               COALESCE(oi.unit_price, 0) as unit_price, COALESCE(oi.total_price, 0) as total_price,
               p.name as product_name, p.hsn_code, p.weight, p.weight_unit, p.mrp, p.gst_rate, p.stock_quantity
        FROM order_items oi
        INNER JOIN products p ON oi.product_id = p.id 
        WHERE oi.order_id = ?
      `, [id]);

      res.json({ success: true, data: { ...order, items } });
    } catch (error) {
      console.error('Get order by id error:', error);
      res.status(500).json({ success: false, message: 'Error fetching order' });
    }
  };

  // Create new order (Sales Captain)
  createOrder = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });

      const { store_id, items, notes } = req.body;
      if (!store_id || !items || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Store ID and items are required' });
      }

      const result = await transaction(async () => {
        // Generate order number
        const lastOrder = await queryOne('SELECT order_number FROM orders ORDER BY id DESC LIMIT 1');
        const orderNumber = this.generateOrderNumber(lastOrder?.order_number);

        // Create order
        const orderResult = await run(`
          INSERT INTO orders (order_number, store_id, created_by, status, notes) 
          VALUES (?, ?, ?, 'draft', ?)
        `, [orderNumber, store_id, req.user!.id, notes || null]);

        const orderId = orderResult.lastInsertRowid;

        // Add order items (with stock_qty - current stock at store)
        for (const item of items) {
          await run(`
            INSERT INTO order_items (order_id, product_id, quantity, stock_qty, notes) 
            VALUES (?, ?, ?, ?, ?)
          `, [orderId, item.product_id, item.quantity, item.stock_qty || 0, item.notes || null]);
        }

        return { orderId, orderNumber };
      });

      res.status(201).json({ 
        success: true, 
        message: 'Order created successfully', 
        data: { id: result.orderId, order_number: result.orderNumber } 
      });
    } catch (error: any) {
      console.error('Create order error:', error);
      res.status(500).json({ success: false, message: error.message || 'Error creating order' });
    }
  };

  // Update order (draft and submitted orders can be updated)
  updateOrder = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { items, notes } = req.body;

      const existing = await queryOne('SELECT id, status FROM orders WHERE id = ?', [id]);
      if (!existing) return res.status(404).json({ success: false, message: 'Order not found' });
      if (!['draft', 'submitted'].includes(existing.status)) {
        return res.status(400).json({ success: false, message: 'Only draft or submitted orders can be modified' });
      }

      await transaction(async () => {
        // Update order notes
        await run('UPDATE orders SET notes = COALESCE(?, notes), updated_at = CURRENT_TIMESTAMP WHERE id = ?', [notes, id]);

        // Update items if provided
        if (items && items.length > 0) {
          // Delete existing items
          await run('DELETE FROM order_items WHERE order_id = ?', [id]);
          
          // Insert new items (with stock_qty)
          for (const item of items) {
            await run(`
              INSERT INTO order_items (order_id, product_id, quantity, stock_qty, notes) 
              VALUES (?, ?, ?, ?, ?)
            `, [id, item.product_id, item.quantity, item.stock_qty || 0, item.notes || null]);
          }
        }
      });

      res.json({ success: true, message: 'Order updated successfully' });
    } catch (error) {
      console.error('Update order error:', error);
      res.status(500).json({ success: false, message: 'Error updating order' });
    }
  };

  // Submit order for processing
  submitOrder = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const existing = await queryOne('SELECT id, status FROM orders WHERE id = ?', [id]);
      if (!existing) return res.status(404).json({ success: false, message: 'Order not found' });
      if (existing.status !== 'draft') {
        return res.status(400).json({ success: false, message: 'Only draft orders can be submitted' });
      }

      await run('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['submitted', id]);
      res.json({ success: true, message: 'Order submitted successfully' });
    } catch (error) {
      console.error('Submit order error:', error);
      res.status(500).json({ success: false, message: 'Error submitting order' });
    }
  };

  // Approve order (Accountant)
  approveOrder = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const existing = await queryOne('SELECT id, status FROM orders WHERE id = ?', [id]);
      if (!existing) return res.status(404).json({ success: false, message: 'Order not found' });
      if (existing.status !== 'submitted') {
        return res.status(400).json({ success: false, message: 'Only submitted orders can be approved' });
      }

      // Check stock availability for all items
      const items = await query('SELECT oi.*, p.name, p.stock_quantity FROM order_items oi INNER JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?', [id]);
      
      const outOfStock: string[] = [];
      const lowStock: string[] = [];
      
      for (const item of items) {
        if (item.stock_quantity < item.quantity) {
          if (item.stock_quantity === 0) {
            outOfStock.push(`${item.name} (needed: ${item.quantity}, available: 0)`);
          } else {
            lowStock.push(`${item.name} (needed: ${item.quantity}, available: ${item.stock_quantity})`);
          }
        }
      }

      // Return stock status info with approval
      await run('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['approved', id]);
      
      const warnings: string[] = [];
      if (outOfStock.length > 0) warnings.push(`Out of stock: ${outOfStock.join(', ')}`);
      if (lowStock.length > 0) warnings.push(`Low stock: ${lowStock.join(', ')}`);

      res.json({ 
        success: true, 
        message: 'Order approved successfully',
        data: { 
          stock_warnings: warnings.length > 0 ? warnings : null 
        }
      });
    } catch (error) {
      console.error('Approve order error:', error);
      res.status(500).json({ success: false, message: 'Error approving order' });
    }
  };

  // Cancel order
  cancelOrder = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const existing = await queryOne('SELECT id, status FROM orders WHERE id = ?', [id]);
      if (!existing) return res.status(404).json({ success: false, message: 'Order not found' });
      if (existing.status === 'invoiced') {
        return res.status(400).json({ success: false, message: 'Cannot cancel invoiced orders' });
      }

      await run('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['cancelled', id]);
      res.json({ success: true, message: 'Order cancelled successfully' });
    } catch (error) {
      console.error('Cancel order error:', error);
      res.status(500).json({ success: false, message: 'Error cancelling order' });
    }
  };

  // Delete order permanently
  deleteOrder = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
      
      const { id } = req.params;

      const existing = await queryOne('SELECT id, status, created_by FROM orders WHERE id = ?', [id]);
      if (!existing) return res.status(404).json({ success: false, message: 'Order not found' });
      
      // Approved orders cannot be deleted (need to cancel first or create invoice)
      if (existing.status === 'approved') {
        return res.status(400).json({ success: false, message: 'Approved orders cannot be deleted. Cancel the order first.' });
      }
      
      // For draft/submitted orders, only the creator or admin can delete
      if (['draft', 'submitted'].includes(existing.status) && existing.created_by !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'You can only delete your own orders' });
      }
      
      // Invoiced orders can only be deleted by admin
      if (existing.status === 'invoiced' && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Only admin can delete invoiced orders' });
      }

      // Delete order items first
      await run('DELETE FROM order_items WHERE order_id = ?', [id]);
      // Delete the order
      await run('DELETE FROM orders WHERE id = ?', [id]);
      
      res.json({ success: true, message: 'Order deleted successfully' });
    } catch (error) {
      console.error('Delete order error:', error);
      res.status(500).json({ success: false, message: 'Error deleting order' });
    }
  };

  private generateOrderNumber(lastNumber?: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const fyStart = month >= 4 ? year : year - 1;
    const fyEnd = (fyStart + 1) % 100;
    const fyString = `${fyStart}-${fyEnd.toString().padStart(2, '0')}`;
    
    const prefix = `ORD-${fyString}/`;
    
    if (!lastNumber) return `${prefix}1`;

    const match = lastNumber.match(/ORD-\d{4}-\d{2}\/(\d+)$/);
    if (match) {
      const lastFy = lastNumber.substring(4, 11);
      if (lastFy === fyString) {
        return `${prefix}${parseInt(match[1]) + 1}`;
      }
    }
    
    return `${prefix}1`;
  }
}
