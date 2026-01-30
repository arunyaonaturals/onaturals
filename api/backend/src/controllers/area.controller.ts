import { Response } from 'express';
import { query, queryOne, run } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';

export class AreaController {
  getAllAreas = async (req: AuthRequest, res: Response) => {
    try {
      const areas = await query(`
        SELECT a.*, u.name as sales_captain_name, u.phone as sales_captain_phone,
               (SELECT COUNT(*) FROM stores WHERE area_id = a.id) as store_count
        FROM areas a LEFT JOIN users u ON a.sales_captain_id = u.id ORDER BY a.name
      `);
      res.json({ success: true, data: areas });
    } catch (error) {
      console.error('Get all areas error:', error);
      res.status(500).json({ success: false, message: 'Error fetching areas' });
    }
  };

  getAreaById = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const area = await queryOne(`
        SELECT a.*, u.name as sales_captain_name, u.phone as sales_captain_phone
        FROM areas a LEFT JOIN users u ON a.sales_captain_id = u.id WHERE a.id = ?
      `, [id]);
      if (!area) return res.status(404).json({ success: false, message: 'Area not found' });
      res.json({ success: true, data: area });
    } catch (error) {
      console.error('Get area by id error:', error);
      res.status(500).json({ success: false, message: 'Error fetching area' });
    }
  };

  getStoresByArea = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const stores = await query('SELECT * FROM stores WHERE area_id = ? ORDER BY name', [id]);
      res.json({ success: true, data: stores });
    } catch (error) {
      console.error('Get stores by area error:', error);
      res.status(500).json({ success: false, message: 'Error fetching stores' });
    }
  };

  getSalesCaptainByArea = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const result = await queryOne(`
        SELECT u.id, u.name, u.email, u.phone FROM users u 
        INNER JOIN areas a ON a.sales_captain_id = u.id WHERE a.id = ?
      `, [id]);
      if (!result) return res.status(404).json({ success: false, message: 'No sales captain assigned to this area' });
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Get sales captain by area error:', error);
      res.status(500).json({ success: false, message: 'Error fetching sales captain' });
    }
  };

  createArea = async (req: AuthRequest, res: Response) => {
    try {
      const { name, description, sales_captain_id } = req.body;
      if (!name) return res.status(400).json({ success: false, message: 'Area name is required' });

      const result = await run('INSERT INTO areas (name, description, sales_captain_id) VALUES (?, ?, ?)',
        [name, description || null, sales_captain_id || null]);

      res.status(201).json({ success: true, message: 'Area created successfully', data: { id: result.lastInsertRowid, name } });
    } catch (error) {
      console.error('Create area error:', error);
      res.status(500).json({ success: false, message: 'Error creating area' });
    }
  };

  updateArea = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description, sales_captain_id } = req.body;

      const existing = await queryOne('SELECT id FROM areas WHERE id = ?', [id]);
      if (!existing) return res.status(404).json({ success: false, message: 'Area not found' });

      await run(`UPDATE areas SET name = COALESCE(?, name), description = COALESCE(?, description),
        sales_captain_id = COALESCE(?, sales_captain_id), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [name, description, sales_captain_id, id]);

      res.json({ success: true, message: 'Area updated successfully' });
    } catch (error) {
      console.error('Update area error:', error);
      res.status(500).json({ success: false, message: 'Error updating area' });
    }
  };

  deleteArea = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const stores = await queryOne('SELECT COUNT(*) as count FROM stores WHERE area_id = ?', [id]);

      if (stores && stores.count > 0) {
        return res.status(400).json({ success: false, message: 'Cannot delete area with assigned stores. Please reassign stores first.' });
      }

      await run('DELETE FROM areas WHERE id = ?', [id]);
      res.json({ success: true, message: 'Area deleted successfully' });
    } catch (error) {
      console.error('Delete area error:', error);
      res.status(500).json({ success: false, message: 'Error deleting area' });
    }
  };

  assignSalesCaptain = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { sales_captain_id } = req.body;

      if (!sales_captain_id) return res.status(400).json({ success: false, message: 'Sales captain ID is required' });

      const user = await queryOne("SELECT id FROM users WHERE id = ? AND role = 'sales_captain'", [sales_captain_id]);
      if (!user) return res.status(400).json({ success: false, message: 'Invalid sales captain ID or user is not a sales captain' });

      await run('UPDATE areas SET sales_captain_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [sales_captain_id, id]);
      res.json({ success: true, message: 'Sales captain assigned successfully' });
    } catch (error) {
      console.error('Assign sales captain error:', error);
      res.status(500).json({ success: false, message: 'Error assigning sales captain' });
    }
  };
}
