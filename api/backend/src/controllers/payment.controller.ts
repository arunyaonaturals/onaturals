import { Response } from 'express';
import { query, queryOne, run, transaction } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';

export class PaymentController {
  // Get all payments for an invoice
  getInvoicePayments = async (req: AuthRequest, res: Response) => {
    try {
      const { invoice_id } = req.params;
      
      const payments = await query(`
        SELECT ip.*, u.name as collected_by_name
        FROM invoice_payments ip
        INNER JOIN users u ON ip.collected_by = u.id
        WHERE ip.invoice_id = ?
        ORDER BY ip.payment_date DESC, ip.created_at DESC
      `, [invoice_id]);

      const invoice = await queryOne(`
        SELECT id, invoice_number, total_amount, total_paid, payment_status
        FROM invoices WHERE id = ?
      `, [invoice_id]);

      const balance = invoice ? invoice.total_amount - (invoice.total_paid || 0) : 0;

      res.json({ 
        success: true, 
        data: { 
          payments, 
          invoice,
          balance: Math.max(0, balance)
        } 
      });
    } catch (error) {
      console.error('Get invoice payments error:', error);
      res.status(500).json({ success: false, message: 'Error fetching payments' });
    }
  };

  // Get all payments (with filters)
  getAllPayments = async (req: AuthRequest, res: Response) => {
    try {
      const { start_date, end_date, collected_by, payment_method } = req.query;
      
      let sql = `
        SELECT ip.*, i.invoice_number, i.total_amount, s.name as store_name, 
               u.name as collected_by_name
        FROM invoice_payments ip
        INNER JOIN invoices i ON ip.invoice_id = i.id
        INNER JOIN stores s ON i.store_id = s.id
        INNER JOIN users u ON ip.collected_by = u.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (start_date) { sql += ' AND DATE(ip.payment_date) >= ?'; params.push(start_date); }
      if (end_date) { sql += ' AND DATE(ip.payment_date) <= ?'; params.push(end_date); }
      if (collected_by) { sql += ' AND ip.collected_by = ?'; params.push(collected_by); }
      if (payment_method) { sql += ' AND ip.payment_method = ?'; params.push(payment_method); }
      
      sql += ' ORDER BY ip.payment_date DESC, ip.created_at DESC';

      const payments = await query(sql, params);
      res.json({ success: true, data: payments });
    } catch (error) {
      console.error('Get all payments error:', error);
      res.status(500).json({ success: false, message: 'Error fetching payments' });
    }
  };

  // Get my collected payments (Sales Captain)
  getMyCollections = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });

      const { start_date, end_date } = req.query;
      
      let sql = `
        SELECT ip.*, i.invoice_number, i.total_amount, s.name as store_name
        FROM invoice_payments ip
        INNER JOIN invoices i ON ip.invoice_id = i.id
        INNER JOIN stores s ON i.store_id = s.id
        WHERE ip.collected_by = ?
      `;
      const params: any[] = [req.user.id];

      if (start_date) { sql += ' AND DATE(ip.payment_date) >= ?'; params.push(start_date); }
      if (end_date) { sql += ' AND DATE(ip.payment_date) <= ?'; params.push(end_date); }
      
      sql += ' ORDER BY ip.payment_date DESC, ip.created_at DESC';

      const payments = await query(sql, params);
      
      // Calculate totals
      const totals = await query(`
        SELECT 
          SUM(ip.amount) as total_collected,
          COUNT(*) as payment_count
        FROM invoice_payments ip
        WHERE ip.collected_by = ?
        ${start_date ? ' AND DATE(ip.payment_date) >= ?' : ''}
        ${end_date ? ' AND DATE(ip.payment_date) <= ?' : ''}
      `, params);

      res.json({ 
        success: true, 
        data: payments,
        summary: totals[0] || { total_collected: 0, payment_count: 0 }
      });
    } catch (error) {
      console.error('Get my collections error:', error);
      res.status(500).json({ success: false, message: 'Error fetching collections' });
    }
  };

  // Get invoices with pending payments
  getPendingPayments = async (req: AuthRequest, res: Response) => {
    try {
      const invoices = await query(`
        SELECT i.*, s.name as store_name, s.city as store_city, s.phone as store_phone,
               u.name as created_by_name, a.name as area_name,
               (i.total_amount - COALESCE(i.total_paid, 0)) as balance
        FROM invoices i
        INNER JOIN stores s ON i.store_id = s.id
        INNER JOIN users u ON i.created_by = u.id
        LEFT JOIN areas a ON s.area_id = a.id
        WHERE i.payment_status != 'paid' AND i.status != 'cancelled'
        ORDER BY i.created_at DESC
      `);

      res.json({ success: true, data: invoices });
    } catch (error) {
      console.error('Get pending payments error:', error);
      res.status(500).json({ success: false, message: 'Error fetching pending payments' });
    }
  };

  // Record a payment (Sales Captain collects payment)
  recordPayment = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });

      const { invoice_id, amount, payment_date, payment_method, reference_number, notes } = req.body;
      
      if (!invoice_id || !amount || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Invoice ID and valid amount are required' });
      }

      const invoice = await queryOne('SELECT id, total_amount, total_paid, payment_status FROM invoices WHERE id = ?', [invoice_id]);
      if (!invoice) {
        return res.status(404).json({ success: false, message: 'Invoice not found' });
      }

      const currentPaid = invoice.total_paid || 0;
      const balance = invoice.total_amount - currentPaid;

      if (amount > balance + 0.01) { // Small tolerance for rounding
        return res.status(400).json({ 
          success: false, 
          message: `Payment amount exceeds balance. Remaining balance: ₹${balance.toFixed(2)}` 
        });
      }

      const result = await transaction(async () => {
        // Record the payment
        const paymentResult = await run(`
          INSERT INTO invoice_payments (invoice_id, amount, payment_date, payment_method, collected_by, reference_number, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [invoice_id, amount, payment_date || new Date().toISOString().split('T')[0], payment_method || 'cash', req.user!.id, reference_number || null, notes || null]);

        // Update invoice totals
        const newTotalPaid = currentPaid + amount;
        const newPaymentStatus = newTotalPaid >= invoice.total_amount ? 'paid' : (newTotalPaid > 0 ? 'partial' : 'pending');

        await run(`
          UPDATE invoices 
          SET total_paid = ?, payment_status = ?, payment_date = COALESCE(payment_date, ?), updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `, [newTotalPaid, newPaymentStatus, payment_date || new Date().toISOString().split('T')[0], invoice_id]);

        return { 
          paymentId: paymentResult.lastInsertRowid,
          newTotalPaid,
          newPaymentStatus,
          remainingBalance: Math.max(0, invoice.total_amount - newTotalPaid)
        };
      });

      res.status(201).json({ 
        success: true, 
        message: 'Payment recorded successfully',
        data: result
      });
    } catch (error: any) {
      console.error('Record payment error:', error);
      res.status(500).json({ success: false, message: error.message || 'Error recording payment' });
    }
  };

  // Delete a payment (Admin only)
  deletePayment = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const payment = await queryOne('SELECT * FROM invoice_payments WHERE id = ?', [id]);
      if (!payment) {
        return res.status(404).json({ success: false, message: 'Payment not found' });
      }

      await transaction(async () => {
        // Delete the payment
        await run('DELETE FROM invoice_payments WHERE id = ?', [id]);

        // Recalculate invoice totals
        const totalPaid = await queryOne('SELECT COALESCE(SUM(amount), 0) as total FROM invoice_payments WHERE invoice_id = ?', [payment.invoice_id]);
        const invoice = await queryOne('SELECT total_amount FROM invoices WHERE id = ?', [payment.invoice_id]);
        
        const newTotalPaid = totalPaid?.total || 0;
        const newPaymentStatus = newTotalPaid >= invoice.total_amount ? 'paid' : (newTotalPaid > 0 ? 'partial' : 'pending');

        await run(`
          UPDATE invoices SET total_paid = ?, payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `, [newTotalPaid, newPaymentStatus, payment.invoice_id]);
      });

      res.json({ success: true, message: 'Payment deleted successfully' });
    } catch (error) {
      console.error('Delete payment error:', error);
      res.status(500).json({ success: false, message: 'Error deleting payment' });
    }
  };
}
