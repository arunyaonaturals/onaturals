import { Response } from 'express';
import { query, queryOne, run, transaction } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';

export class PurchaseController {
  getAllReceipts = async (req: AuthRequest, res: Response) => {
    try {
      const { vendor_id, payment_status, start_date, end_date } = req.query;
      let sql = `SELECT rmr.*, v.name as vendor_name, v.payment_days FROM raw_material_receipts rmr
                 INNER JOIN vendors v ON rmr.vendor_id = v.id WHERE 1=1`;
      const params: any[] = [];

      if (vendor_id) { sql += ' AND rmr.vendor_id = ?'; params.push(vendor_id); }
      if (payment_status) { sql += ' AND rmr.payment_status = ?'; params.push(payment_status); }
      if (start_date) { sql += ' AND date(rmr.receipt_date) >= ?'; params.push(start_date); }
      if (end_date) { sql += ' AND date(rmr.receipt_date) <= ?'; params.push(end_date); }
      sql += ' ORDER BY rmr.receipt_date DESC';

      const receipts = await query(sql, params);
      const receiptsWithDueDate = receipts.map((receipt: any) => {
        const receiptDate = new Date(receipt.receipt_date);
        const dueDate = new Date(receiptDate);
        dueDate.setDate(dueDate.getDate() + receipt.payment_days);
        return { ...receipt, due_date: dueDate.toISOString().split('T')[0] };
      });

      res.json({ success: true, data: receiptsWithDueDate });
    } catch (error) {
      console.error('Get all receipts error:', error);
      res.status(500).json({ success: false, message: 'Error fetching receipts' });
    }
  };

  getPendingPayments = async (req: AuthRequest, res: Response) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const receipts = await query(`
        SELECT rmr.*, v.name as vendor_name, v.payment_days,
        date(rmr.receipt_date, '+' || v.payment_days || ' days') as due_date,
        CASE WHEN date(rmr.receipt_date, '+' || v.payment_days || ' days') < ? THEN 1 ELSE 0 END as is_overdue
        FROM raw_material_receipts rmr INNER JOIN vendors v ON rmr.vendor_id = v.id
        WHERE rmr.payment_status = 'pending' ORDER BY due_date ASC
      `, [today]);
      res.json({ success: true, data: receipts });
    } catch (error) {
      console.error('Get pending payments error:', error);
      res.status(500).json({ success: false, message: 'Error fetching pending payments' });
    }
  };

  // Get overdue payments
  getOverduePayments = async (req: AuthRequest, res: Response) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const receipts = await query(`
        SELECT rmr.*, v.name as vendor_name, v.payment_days, v.phone as vendor_phone,
        date(rmr.receipt_date, '+' || v.payment_days || ' days') as due_date,
        JULIANDAY(?) - JULIANDAY(date(rmr.receipt_date, '+' || v.payment_days || ' days')) as days_overdue
        FROM raw_material_receipts rmr 
        INNER JOIN vendors v ON rmr.vendor_id = v.id
        WHERE rmr.payment_status = 'pending' 
        AND date(rmr.receipt_date, '+' || v.payment_days || ' days') < ?
        ORDER BY days_overdue DESC
      `, [today, today]);
      res.json({ success: true, data: receipts });
    } catch (error) {
      console.error('Get overdue payments error:', error);
      res.status(500).json({ success: false, message: 'Error fetching overdue payments' });
    }
  };

  // Get payments due soon (within next 7 days)
  getDueSoonPayments = async (req: AuthRequest, res: Response) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().split('T')[0];
      
      const receipts = await query(`
        SELECT rmr.*, v.name as vendor_name, v.payment_days, v.phone as vendor_phone,
        date(rmr.receipt_date, '+' || v.payment_days || ' days') as due_date,
        JULIANDAY(date(rmr.receipt_date, '+' || v.payment_days || ' days')) - JULIANDAY(?) as days_until_due
        FROM raw_material_receipts rmr 
        INNER JOIN vendors v ON rmr.vendor_id = v.id
        WHERE rmr.payment_status = 'pending' 
        AND date(rmr.receipt_date, '+' || v.payment_days || ' days') >= ?
        AND date(rmr.receipt_date, '+' || v.payment_days || ' days') <= ?
        ORDER BY due_date ASC
      `, [today, today, nextWeekStr]);
      res.json({ success: true, data: receipts });
    } catch (error) {
      console.error('Get due soon payments error:', error);
      res.status(500).json({ success: false, message: 'Error fetching due soon payments' });
    }
  };

  // Get payment reminders summary for dashboard
  getPaymentReminders = async (req: AuthRequest, res: Response) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().split('T')[0];
      
      // Overdue count and total
      const overdue = await queryOne(`
        SELECT COUNT(*) as count, COALESCE(SUM(rmr.total_amount), 0) as total
        FROM raw_material_receipts rmr 
        INNER JOIN vendors v ON rmr.vendor_id = v.id
        WHERE rmr.payment_status = 'pending' 
        AND date(rmr.receipt_date, '+' || v.payment_days || ' days') < ?
      `, [today]);

      // Due this week count and total
      const dueThisWeek = await queryOne(`
        SELECT COUNT(*) as count, COALESCE(SUM(rmr.total_amount), 0) as total
        FROM raw_material_receipts rmr 
        INNER JOIN vendors v ON rmr.vendor_id = v.id
        WHERE rmr.payment_status = 'pending' 
        AND date(rmr.receipt_date, '+' || v.payment_days || ' days') >= ?
        AND date(rmr.receipt_date, '+' || v.payment_days || ' days') <= ?
      `, [today, nextWeekStr]);

      res.json({ 
        success: true, 
        data: {
          overdue: { count: overdue?.count || 0, total: overdue?.total || 0 },
          due_this_week: { count: dueThisWeek?.count || 0, total: dueThisWeek?.total || 0 }
        }
      });
    } catch (error) {
      console.error('Get payment reminders error:', error);
      res.status(500).json({ success: false, message: 'Error fetching payment reminders' });
    }
  };

  getReceiptById = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const receipt = await queryOne(`SELECT rmr.*, v.name as vendor_name, v.payment_days FROM raw_material_receipts rmr
        INNER JOIN vendors v ON rmr.vendor_id = v.id WHERE rmr.id = ?`, [id]);

      if (!receipt) return res.status(404).json({ success: false, message: 'Receipt not found' });

      const items = await query(`SELECT rmi.*, p.name as product_name FROM raw_material_items rmi
        LEFT JOIN products p ON rmi.product_id = p.id WHERE rmi.receipt_id = ?`, [id]);

      const dueDate = new Date(receipt.receipt_date);
      dueDate.setDate(dueDate.getDate() + receipt.payment_days);

      res.json({ success: true, data: { ...receipt, due_date: dueDate.toISOString().split('T')[0], items } });
    } catch (error) {
      console.error('Get receipt by id error:', error);
      res.status(500).json({ success: false, message: 'Error fetching receipt' });
    }
  };

  createReceipt = async (req: AuthRequest, res: Response) => {
    try {
      const { vendor_id, receipt_date, items, notes, total_amount } = req.body;
      if (!vendor_id || !items || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Vendor ID and items are required' });
      }

      const result = await transaction(async () => {
        const lastReceipt = await queryOne('SELECT receipt_number FROM raw_material_receipts ORDER BY id DESC LIMIT 1');
        const receiptNumber = this.generateReceiptNumber(lastReceipt?.receipt_number);

        // Get vendor payment days to calculate due date
        const vendor = await queryOne('SELECT payment_days FROM vendors WHERE id = ?', [vendor_id]);
        const paymentDays = vendor?.payment_days || 0;

        let calculatedTotal = total_amount || 0;
        if (!total_amount) {
          for (const item of items) { calculatedTotal += item.quantity * (item.unit_price || 0); }
        }

        const today = new Date().toISOString().split('T')[0];
        const actualReceiptDate = receipt_date || today;
        
        // Calculate due date
        const dueDateObj = new Date(actualReceiptDate);
        dueDateObj.setDate(dueDateObj.getDate() + paymentDays);
        const dueDate = dueDateObj.toISOString().split('T')[0];

        const receiptResult = await run(`
          INSERT INTO raw_material_receipts (receipt_number, vendor_id, receipt_date, total_amount, notes, due_date) 
          VALUES (?, ?, ?, ?, ?, ?)
        `, [receiptNumber, vendor_id, actualReceiptDate, calculatedTotal, notes || null, dueDate]);

        const receiptId = receiptResult.lastInsertRowid;

        for (const item of items) {
          await run(`
            INSERT INTO raw_material_items (receipt_id, product_id, raw_material_id, material_name, quantity, unit, unit_price, total) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [receiptId, item.product_id || null, item.raw_material_id || null, item.material_name || null, item.quantity, item.unit || 'kg', item.unit_price || 0, item.quantity * (item.unit_price || 0)]);

          // Update raw material stock if raw_material_id is provided
          if (item.raw_material_id) {
            await run(`
              UPDATE raw_materials 
              SET stock_quantity = stock_quantity + ?, 
                  cost_per_unit = ?,
                  updated_at = CURRENT_TIMESTAMP 
              WHERE id = ?
            `, [item.quantity, item.unit_price || 0, item.raw_material_id]);
          }
        }

        return { receiptId, receiptNumber, dueDate };
      });

      res.status(201).json({ 
        success: true, 
        message: 'Receipt created successfully', 
        data: { id: result.receiptId, receipt_number: result.receiptNumber, due_date: result.dueDate } 
      });
    } catch (error) {
      console.error('Create receipt error:', error);
      res.status(500).json({ success: false, message: 'Error creating receipt' });
    }
  };

  updateReceipt = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { notes, total_amount } = req.body;

      const existing = await queryOne('SELECT id, payment_status FROM raw_material_receipts WHERE id = ?', [id]);
      if (!existing) return res.status(404).json({ success: false, message: 'Receipt not found' });
      if (existing.payment_status === 'paid') return res.status(400).json({ success: false, message: 'Cannot modify paid receipt' });

      await run('UPDATE raw_material_receipts SET notes = COALESCE(?, notes), total_amount = COALESCE(?, total_amount), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [notes, total_amount, id]);

      res.json({ success: true, message: 'Receipt updated successfully' });
    } catch (error) {
      console.error('Update receipt error:', error);
      res.status(500).json({ success: false, message: 'Error updating receipt' });
    }
  };

  deleteReceipt = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const existing = await queryOne('SELECT payment_status FROM raw_material_receipts WHERE id = ?', [id]);

      if (!existing) return res.status(404).json({ success: false, message: 'Receipt not found' });
      if (existing.payment_status === 'paid') return res.status(400).json({ success: false, message: 'Cannot delete paid receipt' });

      await run('DELETE FROM raw_material_items WHERE receipt_id = ?', [id]);
      await run('DELETE FROM raw_material_receipts WHERE id = ?', [id]);

      res.json({ success: true, message: 'Receipt deleted successfully' });
    } catch (error) {
      console.error('Delete receipt error:', error);
      res.status(500).json({ success: false, message: 'Error deleting receipt' });
    }
  };

  markReceiptPaid = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { payment_date, payment_method } = req.body;
      const today = new Date().toISOString().split('T')[0];

      await run("UPDATE raw_material_receipts SET payment_status = 'paid', payment_date = ?, payment_method = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [payment_date || today, payment_method || 'cash', id]);

      res.json({ success: true, message: 'Receipt marked as paid' });
    } catch (error) {
      console.error('Mark receipt paid error:', error);
      res.status(500).json({ success: false, message: 'Error marking receipt as paid' });
    }
  };

  private generateReceiptNumber(lastNumber?: string): string {
    const prefix = 'RMR';
    const year = new Date().getFullYear();
    if (!lastNumber) return `${prefix}${year}0001`;
    const lastYear = parseInt(lastNumber.substring(3, 7));
    const lastSeq = parseInt(lastNumber.substring(7));
    if (lastYear !== year) return `${prefix}${year}0001`;
    return `${prefix}${year}${String(lastSeq + 1).padStart(4, '0')}`;
  }
}
