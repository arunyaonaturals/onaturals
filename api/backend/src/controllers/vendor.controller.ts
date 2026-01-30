import { Response } from 'express';
import { query, queryOne, run } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';

export class VendorController {
  getAllVendors = async (req: AuthRequest, res: Response) => {
    try {
      const { is_active } = req.query;
      let sql = 'SELECT * FROM vendors WHERE 1=1';
      const params: any[] = [];

      if (is_active !== undefined) { sql += ' AND is_active = ?'; params.push(is_active === 'true' ? 1 : 0); }
      sql += ' ORDER BY name';

      const vendors = await query(sql, params);
      res.json({ success: true, data: vendors });
    } catch (error) {
      console.error('Get all vendors error:', error);
      res.status(500).json({ success: false, message: 'Error fetching vendors' });
    }
  };

  searchVendors = async (req: AuthRequest, res: Response) => {
    try {
      const { q } = req.query;
      if (!q) return res.status(400).json({ success: false, message: 'Search query is required' });

      const vendors = await query(`SELECT * FROM vendors WHERE (name LIKE ? OR gst_number LIKE ? OR contact_person LIKE ?) AND is_active = 1 ORDER BY name`,
        [`%${q}%`, `%${q}%`, `%${q}%`]);

      res.json({ success: true, data: vendors });
    } catch (error) {
      console.error('Search vendors error:', error);
      res.status(500).json({ success: false, message: 'Error searching vendors' });
    }
  };

  getVendorById = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const vendor = await queryOne('SELECT * FROM vendors WHERE id = ?', [id]);
      if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
      res.json({ success: true, data: vendor });
    } catch (error) {
      console.error('Get vendor by id error:', error);
      res.status(500).json({ success: false, message: 'Error fetching vendor' });
    }
  };

  getVendorPayments = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const payments = await query(`SELECT vp.*, rmr.receipt_number FROM vendor_payments vp
        LEFT JOIN raw_material_receipts rmr ON vp.receipt_id = rmr.id
        WHERE vp.vendor_id = ? ORDER BY vp.payment_date DESC`, [id]);

      res.json({ success: true, data: payments });
    } catch (error) {
      console.error('Get vendor payments error:', error);
      res.status(500).json({ success: false, message: 'Error fetching payments' });
    }
  };

  createVendor = async (req: AuthRequest, res: Response) => {
    try {
      const { name, address, city, state, pincode, phone, email, gst_number, contact_person, payment_days } = req.body;
      if (!name) return res.status(400).json({ success: false, message: 'Vendor name is required' });

      const result = await run(`INSERT INTO vendors (name, address, city, state, pincode, phone, email, gst_number, contact_person, payment_days) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, address || null, city || null, state || null, pincode || null, phone || null, email || null, gst_number || null, contact_person || null, payment_days || 0]);

      res.status(201).json({ success: true, message: 'Vendor created successfully', data: { id: result.lastInsertRowid, name } });
    } catch (error) {
      console.error('Create vendor error:', error);
      res.status(500).json({ success: false, message: 'Error creating vendor' });
    }
  };

  updateVendor = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { name, address, city, state, pincode, phone, email, gst_number, contact_person, payment_days, is_active } = req.body;

      const existing = await queryOne('SELECT id FROM vendors WHERE id = ?', [id]);
      if (!existing) return res.status(404).json({ success: false, message: 'Vendor not found' });

      await run(`UPDATE vendors SET name = COALESCE(?, name), address = COALESCE(?, address), city = COALESCE(?, city),
        state = COALESCE(?, state), pincode = COALESCE(?, pincode), phone = COALESCE(?, phone),
        email = COALESCE(?, email), gst_number = COALESCE(?, gst_number), contact_person = COALESCE(?, contact_person),
        payment_days = COALESCE(?, payment_days), is_active = COALESCE(?, is_active), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [name, address, city, state, pincode, phone, email, gst_number, contact_person, payment_days, is_active, id]);

      res.json({ success: true, message: 'Vendor updated successfully' });
    } catch (error) {
      console.error('Update vendor error:', error);
      res.status(500).json({ success: false, message: 'Error updating vendor' });
    }
  };

  deleteVendor = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      await run('UPDATE vendors SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
      res.json({ success: true, message: 'Vendor deactivated successfully' });
    } catch (error) {
      console.error('Delete vendor error:', error);
      res.status(500).json({ success: false, message: 'Error deleting vendor' });
    }
  };

  getBillingTerms = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const vendor = await queryOne('SELECT payment_days FROM vendors WHERE id = ?', [id]);
      if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
      res.json({ success: true, data: { payment_days: vendor.payment_days } });
    } catch (error) {
      console.error('Get billing terms error:', error);
      res.status(500).json({ success: false, message: 'Error fetching billing terms' });
    }
  };

  setBillingTerms = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { payment_days } = req.body;
      if (payment_days === undefined) return res.status(400).json({ success: false, message: 'Payment days is required' });

      await run('UPDATE vendors SET payment_days = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [payment_days, id]);
      res.json({ success: true, message: 'Billing terms updated successfully' });
    } catch (error) {
      console.error('Set billing terms error:', error);
      res.status(500).json({ success: false, message: 'Error setting billing terms' });
    }
  };

  recordPayment = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { receipt_id, amount, payment_date, payment_method, notes } = req.body;
      if (!amount) return res.status(400).json({ success: false, message: 'Amount is required' });

      const today = new Date().toISOString().split('T')[0];
      const result = await run(`INSERT INTO vendor_payments (vendor_id, receipt_id, amount, payment_date, payment_method, notes) 
        VALUES (?, ?, ?, ?, ?, ?)`, [id, receipt_id || null, amount, payment_date || today, payment_method || 'cash', notes || null]);

      if (receipt_id) {
        await run("UPDATE raw_material_receipts SET payment_status = 'paid', payment_date = ? WHERE id = ?", [payment_date || today, receipt_id]);
      }

      res.status(201).json({ success: true, message: 'Payment recorded successfully', data: { id: result.lastInsertRowid } });
    } catch (error) {
      console.error('Record payment error:', error);
      res.status(500).json({ success: false, message: 'Error recording payment' });
    }
  };
}
