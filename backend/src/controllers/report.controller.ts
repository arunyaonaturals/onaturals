import { Response } from 'express';
import { query, queryOne, run } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';

export class ReportController {
  getSalesSummary = async (req: AuthRequest, res: Response) => {
    try {
      const { start_date, end_date } = req.query;
      let sql = `SELECT COUNT(*) as total_invoices, SUM(total_amount) as total_sales,
        SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as paid_amount,
        SUM(CASE WHEN payment_status = 'pending' THEN total_amount ELSE 0 END) as pending_amount,
        AVG(total_amount) as average_invoice_value FROM invoices WHERE status != 'cancelled'`;
      const params: any[] = [];

      if (start_date) { sql += ' AND DATE(created_at) >= ?'; params.push(start_date); }
      if (end_date) { sql += ' AND DATE(created_at) <= ?'; params.push(end_date); }

      const summary = await queryOne(sql, params);
      res.json({ success: true, data: summary });
    } catch (error) {
      console.error('Get sales summary error:', error);
      res.status(500).json({ success: false, message: 'Error fetching sales summary' });
    }
  };

  getSalesByArea = async (req: AuthRequest, res: Response) => {
    try {
      const { start_date, end_date } = req.query;
      let dateFilter = '';
      const params: any[] = [];

      if (start_date) { dateFilter += ' AND DATE(i.created_at) >= ?'; params.push(start_date); }
      if (end_date) { dateFilter += ' AND DATE(i.created_at) <= ?'; params.push(end_date); }

      const sales = await query(`
        SELECT a.id as area_id, a.name as area_name, u.name as sales_captain_name,
          COUNT(i.id) as total_invoices, SUM(i.total_amount) as total_sales,
          SUM(CASE WHEN i.payment_status = 'paid' THEN i.total_amount ELSE 0 END) as paid_amount
        FROM areas a LEFT JOIN stores s ON s.area_id = a.id
        LEFT JOIN invoices i ON i.store_id = s.id AND i.status != 'cancelled' ${dateFilter}
        LEFT JOIN users u ON a.sales_captain_id = u.id
        GROUP BY a.id, a.name, u.name ORDER BY total_sales DESC
      `, params);

      res.json({ success: true, data: sales });
    } catch (error) {
      console.error('Get sales by area error:', error);
      res.status(500).json({ success: false, message: 'Error fetching sales by area' });
    }
  };

  getSalesByCaptain = async (req: AuthRequest, res: Response) => {
    try {
      const { start_date, end_date } = req.query;
      let dateFilter = '';
      const params: any[] = [];

      if (start_date) { dateFilter += ' AND DATE(i.created_at) >= ?'; params.push(start_date); }
      if (end_date) { dateFilter += ' AND DATE(i.created_at) <= ?'; params.push(end_date); }

      const sales = await query(`
        SELECT u.id as captain_id, u.name as captain_name, u.email as captain_email,
          COUNT(i.id) as total_invoices, SUM(i.total_amount) as total_sales,
          SUM(CASE WHEN i.billing_status = 'billed' THEN 1 ELSE 0 END) as billed_count,
          SUM(CASE WHEN i.payment_status = 'paid' THEN i.total_amount ELSE 0 END) as paid_amount,
          SUM(CASE WHEN i.payment_status = 'pending' THEN i.total_amount ELSE 0 END) as pending_amount
        FROM users u LEFT JOIN invoices i ON i.created_by = u.id AND i.status != 'cancelled' ${dateFilter}
        WHERE u.role = 'sales_captain' GROUP BY u.id, u.name, u.email ORDER BY total_sales DESC
      `, params);

      res.json({ success: true, data: sales });
    } catch (error) {
      console.error('Get sales by captain error:', error);
      res.status(500).json({ success: false, message: 'Error fetching sales by captain' });
    }
  };

  getSalesByStore = async (req: AuthRequest, res: Response) => {
    try {
      const { start_date, end_date, area_id } = req.query;
      let filters = '';
      const params: any[] = [];

      if (start_date) { filters += ' AND DATE(i.created_at) >= ?'; params.push(start_date); }
      if (end_date) { filters += ' AND DATE(i.created_at) <= ?'; params.push(end_date); }
      if (area_id) { filters += ' AND s.area_id = ?'; params.push(area_id); }

      const sales = await query(`
        SELECT s.id as store_id, s.name as store_name, a.name as area_name,
          COUNT(i.id) as total_invoices, SUM(i.total_amount) as total_sales,
          SUM(CASE WHEN i.payment_status = 'paid' THEN i.total_amount ELSE 0 END) as paid_amount
        FROM stores s LEFT JOIN areas a ON s.area_id = a.id
        LEFT JOIN invoices i ON i.store_id = s.id AND i.status != 'cancelled' ${filters}
        GROUP BY s.id, s.name, a.name ORDER BY total_sales DESC
      `, params);

      res.json({ success: true, data: sales });
    } catch (error) {
      console.error('Get sales by store error:', error);
      res.status(500).json({ success: false, message: 'Error fetching sales by store' });
    }
  };

  getSalesByProduct = async (req: AuthRequest, res: Response) => {
    try {
      const { start_date, end_date } = req.query;
      let dateFilter = '';
      const params: any[] = [];

      if (start_date) { dateFilter += ' AND DATE(i.created_at) >= ?'; params.push(start_date); }
      if (end_date) { dateFilter += ' AND DATE(i.created_at) <= ?'; params.push(end_date); }

      const sales = await query(`
        SELECT p.id as product_id, p.name as product_name, p.hsn_code,
          SUM(ii.quantity) as total_quantity, SUM(ii.total) as total_sales, AVG(ii.margin_percentage) as avg_margin
        FROM products p LEFT JOIN invoice_items ii ON ii.product_id = p.id
        LEFT JOIN invoices i ON ii.invoice_id = i.id AND i.status != 'cancelled' ${dateFilter}
        GROUP BY p.id, p.name, p.hsn_code HAVING total_quantity > 0 ORDER BY total_sales DESC
      `, params);

      res.json({ success: true, data: sales });
    } catch (error) {
      console.error('Get sales by product error:', error);
      res.status(500).json({ success: false, message: 'Error fetching sales by product' });
    }
  };

  getPendingPayments = async (req: AuthRequest, res: Response) => {
    try {
      const payments = await query(`
        SELECT i.id as invoice_id, i.invoice_number, i.total_amount, i.created_at as invoice_date,
          s.name as store_name, s.phone as store_phone, a.name as area_name, u.name as sales_captain_name
        FROM invoices i INNER JOIN stores s ON i.store_id = s.id
        LEFT JOIN areas a ON s.area_id = a.id LEFT JOIN users u ON i.created_by = u.id
        WHERE i.payment_status = 'pending' AND i.status != 'cancelled' ORDER BY i.created_at ASC
      `);

      const totalPending = payments.reduce((sum: number, p: any) => sum + parseFloat(p.total_amount || 0), 0);
      res.json({ success: true, data: { payments, total_pending: totalPending } });
    } catch (error) {
      console.error('Get pending payments error:', error);
      res.status(500).json({ success: false, message: 'Error fetching pending payments' });
    }
  };

  getReceivedPayments = async (req: AuthRequest, res: Response) => {
    try {
      const { start_date, end_date } = req.query;
      let dateFilter = '';
      const params: any[] = [];

      if (start_date) { dateFilter += ' AND DATE(i.payment_date) >= ?'; params.push(start_date); }
      if (end_date) { dateFilter += ' AND DATE(i.payment_date) <= ?'; params.push(end_date); }

      const payments = await query(`
        SELECT i.id as invoice_id, i.invoice_number, i.total_amount, i.payment_amount, i.payment_date, i.payment_method,
          s.name as store_name, a.name as area_name
        FROM invoices i INNER JOIN stores s ON i.store_id = s.id LEFT JOIN areas a ON s.area_id = a.id
        WHERE i.payment_status = 'paid' ${dateFilter} ORDER BY i.payment_date DESC
      `, params);

      const totalReceived = payments.reduce((sum: number, p: any) => sum + parseFloat(p.payment_amount || p.total_amount || 0), 0);
      res.json({ success: true, data: { payments, total_received: totalReceived } });
    } catch (error) {
      console.error('Get received payments error:', error);
      res.status(500).json({ success: false, message: 'Error fetching received payments' });
    }
  };

  getVendorDues = async (req: AuthRequest, res: Response) => {
    try {
      const dues = await query(`
        SELECT v.id as vendor_id, v.name as vendor_name, v.phone as vendor_phone, v.payment_days,
          SUM(rmr.total_amount) as total_due, COUNT(rmr.id) as pending_receipts,
          MIN(DATE(rmr.receipt_date, '+' || v.payment_days || ' days')) as earliest_due_date
        FROM vendors v INNER JOIN raw_material_receipts rmr ON rmr.vendor_id = v.id
        WHERE rmr.payment_status = 'pending'
        GROUP BY v.id, v.name, v.phone, v.payment_days ORDER BY earliest_due_date ASC
      `);

      const totalDue = dues.reduce((sum: number, d: any) => sum + parseFloat(d.total_due || 0), 0);
      res.json({ success: true, data: { dues, total_due: totalDue } });
    } catch (error) {
      console.error('Get vendor dues error:', error);
      res.status(500).json({ success: false, message: 'Error fetching vendor dues' });
    }
  };

  getDispatchStatus = async (req: AuthRequest, res: Response) => {
    try {
      const status = await query(`SELECT status, COUNT(*) as count, SUM(CASE WHEN is_small_order = 1 THEN 1 ELSE 0 END) as small_order_count
        FROM dispatches GROUP BY status`);

      const priorityBreakdown = await query(`SELECT priority, COUNT(*) as count FROM dispatches
        WHERE status IN ('pending', 'ready') GROUP BY priority ORDER BY priority DESC`);

      res.json({ success: true, data: { status_breakdown: status, priority_breakdown: priorityBreakdown } });
    } catch (error) {
      console.error('Get dispatch status error:', error);
      res.status(500).json({ success: false, message: 'Error fetching dispatch status' });
    }
  };

  getPendingDispatches = async (req: AuthRequest, res: Response) => {
    try {
      const dispatches = await query(`
        SELECT d.id, d.priority, d.is_small_order, d.status, d.created_at, i.invoice_number, s.name as store_name, a.name as area_name
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

  getAttendanceSummary = async (req: AuthRequest, res: Response) => {
    try {
      const { month, year } = req.query;
      if (!month || !year) return res.status(400).json({ success: false, message: 'Month and year are required' });

      const summary = await queryOne(`
        SELECT COUNT(DISTINCT user_id) as total_employees,
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as total_present_days,
          SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as total_absent_days,
          SUM(CASE WHEN status = 'leave' THEN 1 ELSE 0 END) as total_leave_days,
          SUM(CASE WHEN status = 'half_day' THEN 1 ELSE 0 END) as total_half_days
        FROM attendance WHERE strftime('%m', date) = ? AND strftime('%Y', date) = ?
      `, [String(month).padStart(2, '0'), year]);

      res.json({ success: true, data: summary });
    } catch (error) {
      console.error('Get attendance summary error:', error);
      res.status(500).json({ success: false, message: 'Error fetching attendance summary' });
    }
  };

  getAttendanceByUser = async (req: AuthRequest, res: Response) => {
    try {
      const { month, year } = req.query;
      if (!month || !year) return res.status(400).json({ success: false, message: 'Month and year are required' });

      const attendance = await query(`
        SELECT u.id as user_id, u.name as user_name, u.role,
          SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days,
          SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days,
          SUM(CASE WHEN a.status = 'leave' THEN 1 ELSE 0 END) as leave_days,
          SUM(CASE WHEN a.status = 'half_day' THEN 1 ELSE 0 END) as half_days
        FROM users u LEFT JOIN attendance a ON u.id = a.user_id 
          AND strftime('%m', a.date) = ? AND strftime('%Y', a.date) = ?
        WHERE u.is_active = 1 GROUP BY u.id, u.name, u.role ORDER BY u.name
      `, [String(month).padStart(2, '0'), year]);

      res.json({ success: true, data: attendance });
    } catch (error) {
      console.error('Get attendance by user error:', error);
      res.status(500).json({ success: false, message: 'Error fetching attendance by user' });
    }
  };

  getDashboardData = async (req: AuthRequest, res: Response) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      const monthStart = firstDayOfMonth.toISOString().split('T')[0];

      const salesStats = await queryOne(`
        SELECT COUNT(*) as total_invoices, SUM(total_amount) as total_sales,
          SUM(CASE WHEN payment_status = 'pending' THEN total_amount ELSE 0 END) as pending_payments
        FROM invoices WHERE status != 'cancelled' AND DATE(created_at) >= ?
      `, [monthStart]);

      const dispatchStats = await queryOne(`
        SELECT COUNT(*) as pending_dispatches, SUM(CASE WHEN is_small_order = 1 THEN 1 ELSE 0 END) as small_orders
        FROM dispatches WHERE status IN ('pending', 'ready')
      `);

      const vendorStats = await queryOne(`
        SELECT COUNT(*) as pending_vendor_payments, SUM(total_amount) as total_vendor_dues
        FROM raw_material_receipts WHERE payment_status = 'pending'
      `);

      const attendanceStats = await queryOne(`
        SELECT SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_today,
          SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_today
        FROM attendance WHERE date = ?
      `, [today]);

      const packingStats = await queryOne(`SELECT COUNT(*) as pending_packing FROM packing_orders WHERE status IN ('pending', 'in_progress')`);

      res.json({ success: true, data: { sales: salesStats, dispatch: dispatchStats, vendor: vendorStats, attendance: attendanceStats, packing: packingStats } });
    } catch (error) {
      console.error('Get dashboard data error:', error);
      res.status(500).json({ success: false, message: 'Error fetching dashboard data' });
    }
  };

  // Get store classification thresholds
  getClassificationThresholds = async (req: AuthRequest, res: Response) => {
    try {
      const thresholds = await queryOne('SELECT * FROM classification_thresholds LIMIT 1');
      res.json({ success: true, data: thresholds });
    } catch (error) {
      console.error('Get classification thresholds error:', error);
      res.status(500).json({ success: false, message: 'Error fetching thresholds' });
    }
  };

  // Update classification thresholds
  updateClassificationThresholds = async (req: AuthRequest, res: Response) => {
    try {
      const { high_volume_min, medium_volume_min, period_days } = req.body;
      await run(`
        UPDATE classification_thresholds 
        SET high_volume_min = COALESCE(?, high_volume_min),
            medium_volume_min = COALESCE(?, medium_volume_min),
            period_days = COALESCE(?, period_days),
            updated_at = CURRENT_TIMESTAMP
      `, [high_volume_min, medium_volume_min, period_days]);
      res.json({ success: true, message: 'Thresholds updated successfully' });
    } catch (error) {
      console.error('Update thresholds error:', error);
      res.status(500).json({ success: false, message: 'Error updating thresholds' });
    }
  };

  // Calculate and update store classifications
  updateStoreClassifications = async (req: AuthRequest, res: Response) => {
    try {
      const thresholds = await queryOne('SELECT * FROM classification_thresholds LIMIT 1');
      if (!thresholds) {
        return res.status(400).json({ success: false, message: 'Classification thresholds not configured' });
      }

      const periodDays = thresholds.period_days || 30;
      const highMin = thresholds.high_volume_min || 100000;
      const mediumMin = thresholds.medium_volume_min || 50000;

      // Calculate total sales per store in the period
      const storeSales = await query(`
        SELECT s.id as store_id, COALESCE(SUM(i.total_amount), 0) as total_sales
        FROM stores s
        LEFT JOIN invoices i ON i.store_id = s.id 
          AND i.status != 'cancelled'
          AND DATE(i.created_at) >= DATE('now', '-${periodDays} days')
        WHERE s.is_active = 1
        GROUP BY s.id
      `);

      let updatedCount = 0;
      const today = new Date().toISOString().split('T')[0];

      for (const store of storeSales) {
        let classification = 'low';
        if (store.total_sales >= highMin) {
          classification = 'high';
        } else if (store.total_sales >= mediumMin) {
          classification = 'medium';
        }

        await run(`
          UPDATE stores 
          SET volume_classification = ?, last_classification_date = ?
          WHERE id = ?
        `, [classification, today, store.store_id]);
        updatedCount++;
      }

      res.json({ 
        success: true, 
        message: `Updated classification for ${updatedCount} stores`,
        data: { updated_count: updatedCount }
      });
    } catch (error) {
      console.error('Update store classifications error:', error);
      res.status(500).json({ success: false, message: 'Error updating store classifications' });
    }
  };

  // Get stores with classifications
  getStoreClassifications = async (req: AuthRequest, res: Response) => {
    try {
      const { classification, area_id } = req.query;
      let sql = `
        SELECT s.*, a.name as area_name, u.name as sales_captain_name,
          (SELECT COALESCE(SUM(i.total_amount), 0) FROM invoices i 
           WHERE i.store_id = s.id AND i.status != 'cancelled' 
           AND DATE(i.created_at) >= DATE('now', '-30 days')) as last_30_days_sales,
          (SELECT COUNT(*) FROM invoices i 
           WHERE i.store_id = s.id AND i.status != 'cancelled' 
           AND DATE(i.created_at) >= DATE('now', '-30 days')) as last_30_days_orders
        FROM stores s
        LEFT JOIN areas a ON s.area_id = a.id
        LEFT JOIN users u ON a.sales_captain_id = u.id
        WHERE s.is_active = 1
      `;
      const params: any[] = [];

      if (classification) { sql += ' AND s.volume_classification = ?'; params.push(classification); }
      if (area_id) { sql += ' AND s.area_id = ?'; params.push(area_id); }
      sql += ' ORDER BY last_30_days_sales DESC';

      const stores = await query(sql, params);

      // Get summary counts
      const summary = await queryOne(`
        SELECT 
          SUM(CASE WHEN volume_classification = 'high' THEN 1 ELSE 0 END) as high_count,
          SUM(CASE WHEN volume_classification = 'medium' THEN 1 ELSE 0 END) as medium_count,
          SUM(CASE WHEN volume_classification = 'low' THEN 1 ELSE 0 END) as low_count
        FROM stores WHERE is_active = 1
      `);

      res.json({ success: true, data: { stores, summary } });
    } catch (error) {
      console.error('Get store classifications error:', error);
      res.status(500).json({ success: false, message: 'Error fetching store classifications' });
    }
  };

  // Sales Captain Performance - Weekly/Monthly
  getSalesCaptainPerformance = async (req: AuthRequest, res: Response) => {
    try {
      const { captain_id, period } = req.query; // period: 'week', 'month', 'quarter'

      let dateFilter = '';
      switch (period) {
        case 'week':
          dateFilter = "DATE(i.created_at) >= DATE('now', '-7 days')";
          break;
        case 'quarter':
          dateFilter = "DATE(i.created_at) >= DATE('now', '-90 days')";
          break;
        default: // month
          dateFilter = "DATE(i.created_at) >= DATE('now', '-30 days')";
      }

      let sql = `
        SELECT 
          u.id as captain_id,
          u.name as captain_name,
          u.email as captain_email,
          u.phone as captain_phone,
          COUNT(DISTINCT i.id) as total_invoices,
          COALESCE(SUM(i.total_amount), 0) as total_sales,
          COALESCE(SUM(i.total_paid), 0) as total_collected,
          COALESCE(SUM(i.total_amount - COALESCE(i.total_paid, 0)), 0) as pending_collection,
          COUNT(DISTINCT CASE WHEN i.payment_status = 'paid' THEN i.id END) as paid_invoices,
          COUNT(DISTINCT CASE WHEN i.payment_status = 'partial' THEN i.id END) as partial_invoices,
          COUNT(DISTINCT CASE WHEN i.payment_status = 'pending' THEN i.id END) as pending_invoices,
          COUNT(DISTINCT s.id) as stores_served,
          (SELECT COUNT(*) FROM invoice_payments ip 
           INNER JOIN invoices inv ON ip.invoice_id = inv.id 
           WHERE ip.collected_by = u.id AND ${dateFilter.replace('i.', 'inv.')}) as payment_collections
        FROM users u
        LEFT JOIN invoices i ON i.created_by = u.id AND i.status != 'cancelled' AND ${dateFilter}
        LEFT JOIN stores s ON i.store_id = s.id
        WHERE u.role = 'sales_captain' AND u.is_active = 1
      `;
      const params: any[] = [];

      if (captain_id) {
        sql += ' AND u.id = ?';
        params.push(captain_id);
      }

      sql += ' GROUP BY u.id, u.name, u.email, u.phone ORDER BY total_sales DESC';

      const performance = await query(sql, params);

      // Get collection details for each captain
      for (const captain of performance) {
        const collections = await query(`
          SELECT ip.*, i.invoice_number, s.name as store_name
          FROM invoice_payments ip
          INNER JOIN invoices i ON ip.invoice_id = i.id
          INNER JOIN stores s ON i.store_id = s.id
          WHERE ip.collected_by = ? AND ${dateFilter.replace('i.', 'i.')}
          ORDER BY ip.payment_date DESC
          LIMIT 10
        `, [captain.captain_id]);
        captain.recent_collections = collections;
      }

      res.json({ success: true, data: performance });
    } catch (error) {
      console.error('Get sales captain performance error:', error);
      res.status(500).json({ success: false, message: 'Error fetching sales captain performance' });
    }
  };

  // Get pending payment reminders for a Sales Captain
  getPendingPaymentReminders = async (req: AuthRequest, res: Response) => {
    try {
      const { captain_id, days_overdue } = req.query;
      const userId = captain_id || req.user?.id;

      let sql = `
        SELECT 
          i.id as invoice_id,
          i.invoice_number,
          i.total_amount,
          COALESCE(i.total_paid, 0) as total_paid,
          (i.total_amount - COALESCE(i.total_paid, 0)) as balance_due,
          i.created_at as invoice_date,
          JULIANDAY('now') - JULIANDAY(i.created_at) as days_since_invoice,
          s.id as store_id,
          s.name as store_name,
          s.phone as store_phone,
          s.address as store_address,
          s.city as store_city,
          s.contact_person,
          s.volume_classification,
          a.name as area_name,
          (SELECT MAX(ip.payment_date) FROM invoice_payments ip WHERE ip.invoice_id = i.id) as last_payment_date,
          (SELECT COUNT(*) FROM invoice_payments ip WHERE ip.invoice_id = i.id) as payment_count
        FROM invoices i
        INNER JOIN stores s ON i.store_id = s.id
        LEFT JOIN areas a ON s.area_id = a.id
        WHERE i.payment_status != 'paid' 
          AND i.status != 'cancelled'
          AND i.created_by = ?
      `;
      const params: any[] = [userId];

      if (days_overdue) {
        sql += ` AND JULIANDAY('now') - JULIANDAY(i.created_at) >= ?`;
        params.push(days_overdue);
      }

      sql += ' ORDER BY s.volume_classification DESC, days_since_invoice DESC';

      const reminders = await query(sql, params);

      // Calculate totals
      const totals = {
        total_pending: reminders.reduce((sum: number, r: any) => sum + parseFloat(r.balance_due || 0), 0),
        total_invoices: reminders.length,
        high_volume_pending: reminders.filter((r: any) => r.volume_classification === 'high').length,
        medium_volume_pending: reminders.filter((r: any) => r.volume_classification === 'medium').length,
        low_volume_pending: reminders.filter((r: any) => r.volume_classification === 'low').length,
      };

      res.json({ success: true, data: { reminders, totals } });
    } catch (error) {
      console.error('Get pending payment reminders error:', error);
      res.status(500).json({ success: false, message: 'Error fetching payment reminders' });
    }
  };

  // Get sales captain's collection summary
  getSalesCaptainCollections = async (req: AuthRequest, res: Response) => {
    try {
      const { captain_id, start_date, end_date } = req.query;
      const userId = captain_id || req.user?.id;

      let dateFilter = '';
      const params: any[] = [userId];

      if (start_date) { dateFilter += ' AND DATE(ip.payment_date) >= ?'; params.push(start_date); }
      if (end_date) { dateFilter += ' AND DATE(ip.payment_date) <= ?'; params.push(end_date); }

      const collections = await query(`
        SELECT 
          ip.*,
          i.invoice_number,
          i.total_amount as invoice_total,
          s.name as store_name,
          s.volume_classification,
          a.name as area_name
        FROM invoice_payments ip
        INNER JOIN invoices i ON ip.invoice_id = i.id
        INNER JOIN stores s ON i.store_id = s.id
        LEFT JOIN areas a ON s.area_id = a.id
        WHERE ip.collected_by = ? ${dateFilter}
        ORDER BY ip.payment_date DESC
      `, params);

      // Summary by date
      const dailySummary = await query(`
        SELECT 
          DATE(ip.payment_date) as date,
          COUNT(*) as collection_count,
          SUM(ip.amount) as total_collected
        FROM invoice_payments ip
        WHERE ip.collected_by = ? ${dateFilter}
        GROUP BY DATE(ip.payment_date)
        ORDER BY date DESC
        LIMIT 30
      `, params);

      // Summary by payment method
      const methodSummary = await query(`
        SELECT 
          ip.payment_method,
          COUNT(*) as count,
          SUM(ip.amount) as total
        FROM invoice_payments ip
        WHERE ip.collected_by = ? ${dateFilter}
        GROUP BY ip.payment_method
      `, params);

      const totalCollected = collections.reduce((sum: number, c: any) => sum + parseFloat(c.amount || 0), 0);

      res.json({ 
        success: true, 
        data: { 
          collections, 
          daily_summary: dailySummary,
          method_summary: methodSummary,
          total_collected: totalCollected 
        } 
      });
    } catch (error) {
      console.error('Get sales captain collections error:', error);
      res.status(500).json({ success: false, message: 'Error fetching collections' });
    }
  };
}
