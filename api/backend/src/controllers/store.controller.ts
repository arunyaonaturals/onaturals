import { Response } from 'express';
import { query, queryOne, run } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';

export class StoreController {
  getAllStores = async (req: AuthRequest, res: Response) => {
    try {
      const { area_id, is_active, page = '1', limit = '10' } = req.query;
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      let baseSql = `FROM stores s LEFT JOIN areas a ON s.area_id = a.id
                     LEFT JOIN users u ON a.sales_captain_id = u.id WHERE 1=1`;
      let countSql = `FROM stores s WHERE 1=1`;
      const params: any[] = [];
      const countParams: any[] = [];

      if (area_id) { 
        baseSql += ' AND s.area_id = ?'; 
        countSql += ' AND s.area_id = ?';
        params.push(area_id); 
        countParams.push(area_id);
      }
      if (is_active !== undefined) { 
        baseSql += ' AND s.is_active = ?'; 
        countSql += ' AND s.is_active = ?';
        params.push(is_active === 'true' ? 1 : 0); 
        countParams.push(is_active === 'true' ? 1 : 0);
      }

      // Get total count for pagination (faster without joins)
      const countResult = await queryOne(`SELECT COUNT(*) as count ${countSql}`, countParams);
      const total = countResult?.count || 0;

      // Get paginated data
      const sql = `SELECT s.*, a.name as area_name, u.name as sales_captain_name 
                   ${baseSql} 
                   ORDER BY s.name 
                   LIMIT ? OFFSET ?`;

      const stores = await query(sql, [...params, parseInt(limit as string), offset]);

      res.json({
        success: true,
        data: stores,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          pages: Math.ceil(total / parseInt(limit as string))
        }
      });
    } catch (error) {
      console.error('Get all stores error:', error);
      res.status(500).json({ success: false, message: 'Error fetching stores' });
    }
  };

  getMyStores = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });

      const stores = await query(`
        SELECT s.*, a.name as area_name FROM stores s 
        INNER JOIN areas a ON s.area_id = a.id
        WHERE a.sales_captain_id = ? AND s.is_active = 1 ORDER BY s.name
      `, [req.user.id]);

      res.json({ success: true, data: stores });
    } catch (error) {
      console.error('Get my stores error:', error);
      res.status(500).json({ success: false, message: 'Error fetching stores' });
    }
  };

  searchStores = async (req: AuthRequest, res: Response) => {
    try {
      const { q } = req.query;
      if (!q) return res.status(400).json({ success: false, message: 'Search query is required' });

      const stores = await query(`
        SELECT s.*, a.name as area_name FROM stores s LEFT JOIN areas a ON s.area_id = a.id
        WHERE (s.name LIKE ? OR s.address LIKE ? OR s.gst_number LIKE ?) AND s.is_active = 1 ORDER BY s.name
      `, [`%${q}%`, `%${q}%`, `%${q}%`]);

      res.json({ success: true, data: stores });
    } catch (error) {
      console.error('Search stores error:', error);
      res.status(500).json({ success: false, message: 'Error searching stores' });
    }
  };

  getStoreById = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const store = await queryOne(`
        SELECT s.*, a.name as area_name, u.name as sales_captain_name
        FROM stores s LEFT JOIN areas a ON s.area_id = a.id
        LEFT JOIN users u ON a.sales_captain_id = u.id WHERE s.id = ?
      `, [id]);

      if (!store) return res.status(404).json({ success: false, message: 'Store not found' });
      res.json({ success: true, data: store });
    } catch (error) {
      console.error('Get store by id error:', error);
      res.status(500).json({ success: false, message: 'Error fetching store' });
    }
  };

  createStore = async (req: AuthRequest, res: Response) => {
    try {
      const { name, address, city, state, pincode, phone, email, gst_number, contact_person, area_id } = req.body;
      if (!name || !address) return res.status(400).json({ success: false, message: 'Name and address are required' });

      const result = await run(`
        INSERT INTO stores (name, address, city, state, pincode, phone, email, gst_number, contact_person, area_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [name, address, city || null, state || null, pincode || null, phone || null, email || null, gst_number || null, contact_person || null, area_id || null]);

      res.status(201).json({ success: true, message: 'Store created successfully', data: { id: result.lastInsertRowid, name } });
    } catch (error) {
      console.error('Create store error:', error);
      res.status(500).json({ success: false, message: 'Error creating store' });
    }
  };

  updateStore = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { name, address, city, state, pincode, phone, email, gst_number, contact_person, area_id, is_active } = req.body;

      const existing = await queryOne('SELECT id FROM stores WHERE id = ?', [id]);
      if (!existing) return res.status(404).json({ success: false, message: 'Store not found' });

      await run(`UPDATE stores SET name = COALESCE(?, name), address = COALESCE(?, address), city = COALESCE(?, city),
        state = COALESCE(?, state), pincode = COALESCE(?, pincode), phone = COALESCE(?, phone),
        email = COALESCE(?, email), gst_number = COALESCE(?, gst_number), contact_person = COALESCE(?, contact_person),
        area_id = COALESCE(?, area_id), is_active = COALESCE(?, is_active), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [name, address, city, state, pincode, phone, email, gst_number, contact_person, area_id, is_active, id]);

      res.json({ success: true, message: 'Store updated successfully' });
    } catch (error) {
      console.error('Update store error:', error);
      res.status(500).json({ success: false, message: 'Error updating store' });
    }
  };

  deleteStore = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      await run('UPDATE stores SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
      res.json({ success: true, message: 'Store deactivated successfully' });
    } catch (error) {
      console.error('Delete store error:', error);
      res.status(500).json({ success: false, message: 'Error deleting store' });
    }
  };

  getStoreMargins = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const margins = await query(`
        SELECT psm.*, p.name as product_name, p.hsn_code, p.cost
        FROM product_store_margins psm INNER JOIN products p ON psm.product_id = p.id
        WHERE psm.store_id = ? ORDER BY p.name
      `, [id]);

      res.json({ success: true, data: margins });
    } catch (error) {
      console.error('Get store margins error:', error);
      res.status(500).json({ success: false, message: 'Error fetching margins' });
    }
  };

  setStoreMargin = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { product_id, margin_percentage } = req.body;

      if (!product_id || margin_percentage === undefined) {
        return res.status(400).json({ success: false, message: 'Product ID and margin percentage are required' });
      }

      const existing = await queryOne('SELECT id FROM product_store_margins WHERE store_id = ? AND product_id = ?', [id, product_id]);

      if (existing) {
        await run('UPDATE product_store_margins SET margin_percentage = ?, updated_at = CURRENT_TIMESTAMP WHERE store_id = ? AND product_id = ?',
          [margin_percentage, id, product_id]);
      } else {
        await run('INSERT INTO product_store_margins (store_id, product_id, margin_percentage) VALUES (?, ?, ?)',
          [id, product_id, margin_percentage]);
      }

      res.json({ success: true, message: 'Margin set successfully' });
    } catch (error) {
      console.error('Set store margin error:', error);
      res.status(500).json({ success: false, message: 'Error setting margin' });
    }
  };
}
