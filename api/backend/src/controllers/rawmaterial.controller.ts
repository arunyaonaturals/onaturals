import { Response } from 'express';
import { query, queryOne, run, transaction } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';

export class RawMaterialController {
  // Get all raw materials
  getAllRawMaterials = async (req: AuthRequest, res: Response) => {
    try {
      const { is_active, low_stock } = req.query;
      let sql = `
        SELECT rm.*, v.name as vendor_name
        FROM raw_materials rm
        LEFT JOIN vendors v ON rm.vendor_id = v.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (is_active !== undefined) {
        sql += ' AND rm.is_active = ?';
        params.push(is_active === 'true' ? 1 : 0);
      }
      if (low_stock === 'true') {
        sql += ' AND rm.stock_quantity <= rm.reorder_level';
      }
      sql += ' ORDER BY rm.name ASC';

      const materials = await query(sql, params);
      res.json({ success: true, data: materials });
    } catch (error) {
      console.error('Get all raw materials error:', error);
      res.status(500).json({ success: false, message: 'Error fetching raw materials' });
    }
  };

  // Get raw material by ID
  getRawMaterialById = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const material = await queryOne(`
        SELECT rm.*, v.name as vendor_name
        FROM raw_materials rm
        LEFT JOIN vendors v ON rm.vendor_id = v.id
        WHERE rm.id = ?
      `, [id]);

      if (!material) {
        return res.status(404).json({ success: false, message: 'Raw material not found' });
      }

      // Get products that use this raw material
      const usedInProducts = await query(`
        SELECT p.id, p.name, pr.quantity_required
        FROM product_recipes pr
        INNER JOIN products p ON pr.product_id = p.id
        WHERE pr.raw_material_id = ?
      `, [id]);

      res.json({ success: true, data: { ...material, used_in_products: usedInProducts } });
    } catch (error) {
      console.error('Get raw material by id error:', error);
      res.status(500).json({ success: false, message: 'Error fetching raw material' });
    }
  };

  // Create raw material
  createRawMaterial = async (req: AuthRequest, res: Response) => {
    try {
      const { name, hsn_code, unit, stock_quantity, cost_per_unit, vendor_id, reorder_level } = req.body;
      
      if (!name) {
        return res.status(400).json({ success: false, message: 'Name is required' });
      }

      const result = await run(`
        INSERT INTO raw_materials (name, hsn_code, unit, stock_quantity, cost_per_unit, vendor_id, reorder_level)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [name, hsn_code || null, unit || 'kg', stock_quantity || 0, cost_per_unit || 0, vendor_id || null, reorder_level || 0]);

      res.status(201).json({
        success: true,
        message: 'Raw material created successfully',
        data: { id: result.lastInsertRowid }
      });
    } catch (error) {
      console.error('Create raw material error:', error);
      res.status(500).json({ success: false, message: 'Error creating raw material' });
    }
  };

  // Update raw material
  updateRawMaterial = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { name, hsn_code, unit, stock_quantity, cost_per_unit, vendor_id, reorder_level, is_active } = req.body;

      const existing = await queryOne('SELECT id FROM raw_materials WHERE id = ?', [id]);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Raw material not found' });
      }

      await run(`
        UPDATE raw_materials 
        SET name = COALESCE(?, name),
            hsn_code = COALESCE(?, hsn_code),
            unit = COALESCE(?, unit),
            stock_quantity = COALESCE(?, stock_quantity),
            cost_per_unit = COALESCE(?, cost_per_unit),
            vendor_id = COALESCE(?, vendor_id),
            reorder_level = COALESCE(?, reorder_level),
            is_active = COALESCE(?, is_active),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [name, hsn_code, unit, stock_quantity, cost_per_unit, vendor_id, reorder_level, is_active, id]);

      res.json({ success: true, message: 'Raw material updated successfully' });
    } catch (error) {
      console.error('Update raw material error:', error);
      res.status(500).json({ success: false, message: 'Error updating raw material' });
    }
  };

  // Delete raw material
  deleteRawMaterial = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const existing = await queryOne('SELECT id FROM raw_materials WHERE id = ?', [id]);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Raw material not found' });
      }

      // Check if used in any recipes
      const usedInRecipes = await queryOne('SELECT id FROM product_recipes WHERE raw_material_id = ?', [id]);
      if (usedInRecipes) {
        return res.status(400).json({ 
          success: false, 
          message: 'Cannot delete raw material that is used in product recipes' 
        });
      }

      await run('DELETE FROM raw_materials WHERE id = ?', [id]);
      res.json({ success: true, message: 'Raw material deleted successfully' });
    } catch (error) {
      console.error('Delete raw material error:', error);
      res.status(500).json({ success: false, message: 'Error deleting raw material' });
    }
  };

  // Adjust stock (add or remove)
  adjustStock = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { quantity, type, notes } = req.body;

      if (!quantity || quantity <= 0) {
        return res.status(400).json({ success: false, message: 'Valid quantity is required' });
      }

      const material = await queryOne('SELECT id, stock_quantity FROM raw_materials WHERE id = ?', [id]);
      if (!material) {
        return res.status(404).json({ success: false, message: 'Raw material not found' });
      }

      let newQuantity: number;
      if (type === 'add') {
        newQuantity = material.stock_quantity + quantity;
      } else if (type === 'remove') {
        if (material.stock_quantity < quantity) {
          return res.status(400).json({ success: false, message: 'Insufficient stock' });
        }
        newQuantity = material.stock_quantity - quantity;
      } else {
        return res.status(400).json({ success: false, message: 'Type must be "add" or "remove"' });
      }

      await run('UPDATE raw_materials SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newQuantity, id]);

      res.json({ 
        success: true, 
        message: `Stock ${type === 'add' ? 'added' : 'removed'} successfully`,
        data: { new_stock: newQuantity }
      });
    } catch (error) {
      console.error('Adjust stock error:', error);
      res.status(500).json({ success: false, message: 'Error adjusting stock' });
    }
  };

  // Get low stock alerts
  getLowStockAlerts = async (req: AuthRequest, res: Response) => {
    try {
      const materials = await query(`
        SELECT rm.*, v.name as vendor_name,
               (rm.reorder_level - rm.stock_quantity) as shortage
        FROM raw_materials rm
        LEFT JOIN vendors v ON rm.vendor_id = v.id
        WHERE rm.stock_quantity <= rm.reorder_level AND rm.is_active = 1
        ORDER BY shortage DESC
      `);

      res.json({ success: true, data: materials });
    } catch (error) {
      console.error('Get low stock alerts error:', error);
      res.status(500).json({ success: false, message: 'Error fetching low stock alerts' });
    }
  };

  // Get product recipes for a raw material
  getRecipesForMaterial = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const recipes = await query(`
        SELECT pr.*, p.name as product_name, p.weight, p.weight_unit
        FROM product_recipes pr
        INNER JOIN products p ON pr.product_id = p.id
        WHERE pr.raw_material_id = ?
      `, [id]);

      res.json({ success: true, data: recipes });
    } catch (error) {
      console.error('Get recipes for material error:', error);
      res.status(500).json({ success: false, message: 'Error fetching recipes' });
    }
  };

  // Get all purchase requests with material details (for Raw Materials page)
  getAllMaterialRequests = async (req: AuthRequest, res: Response) => {
    try {
      const { status, arrival_status } = req.query;
      let sql = `
        SELECT pr.*, v.name as vendor_name, v.phone as vendor_phone, u.name as created_by_name,
          (SELECT COUNT(*) FROM purchase_request_items WHERE request_id = pr.id) as item_count,
          (SELECT SUM(quantity_ordered) FROM purchase_request_items WHERE request_id = pr.id) as total_ordered,
          (SELECT SUM(quantity_received) FROM purchase_request_items WHERE request_id = pr.id) as total_received,
          rmr.id as receipt_id, rmr.receipt_number, rmr.payment_status, rmr.due_date, rmr.arrival_status
        FROM purchase_requests pr
        INNER JOIN vendors v ON pr.vendor_id = v.id
        INNER JOIN users u ON pr.created_by = u.id
        LEFT JOIN raw_material_receipts rmr ON rmr.purchase_request_id = pr.id
        WHERE pr.status != 'cancelled'
      `;
      const params: any[] = [];

      if (status) { sql += ' AND pr.status = ?'; params.push(status); }
      if (arrival_status) { sql += ' AND rmr.arrival_status = ?'; params.push(arrival_status); }
      sql += ' ORDER BY pr.created_at DESC';

      const requests = await query(sql, params);
      res.json({ success: true, data: requests });
    } catch (error) {
      console.error('Get all material requests error:', error);
      res.status(500).json({ success: false, message: 'Error fetching material requests' });
    }
  };

  // Get pending arrivals (requests where materials haven't fully arrived)
  getPendingArrivals = async (req: AuthRequest, res: Response) => {
    try {
      const requests = await query(`
        SELECT pr.*, v.name as vendor_name, v.phone as vendor_phone, u.name as created_by_name,
          (SELECT COUNT(*) FROM purchase_request_items WHERE request_id = pr.id) as item_count,
          (SELECT SUM(quantity_ordered) FROM purchase_request_items WHERE request_id = pr.id) as total_ordered,
          (SELECT SUM(quantity_received) FROM purchase_request_items WHERE request_id = pr.id) as total_received,
          rmr.id as receipt_id, rmr.receipt_number, rmr.payment_status, rmr.due_date, rmr.arrival_status
        FROM purchase_requests pr
        INNER JOIN vendors v ON pr.vendor_id = v.id
        INNER JOIN users u ON pr.created_by = u.id
        LEFT JOIN raw_material_receipts rmr ON rmr.purchase_request_id = pr.id
        WHERE pr.status IN ('submitted', 'partial')
        ORDER BY pr.expected_date ASC, pr.created_at ASC
      `);
      res.json({ success: true, data: requests });
    } catch (error) {
      console.error('Get pending arrivals error:', error);
      res.status(500).json({ success: false, message: 'Error fetching pending arrivals' });
    }
  };

  // Get purchase requests for a specific raw material
  getMaterialRequests = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const requests = await query(`
        SELECT pr.*, v.name as vendor_name, pri.quantity_ordered, pri.quantity_received, pri.unit_price, pri.total,
          rmr.arrival_status, rmr.payment_status, rmr.due_date
        FROM purchase_request_items pri
        INNER JOIN purchase_requests pr ON pri.request_id = pr.id
        INNER JOIN vendors v ON pr.vendor_id = v.id
        LEFT JOIN raw_material_receipts rmr ON rmr.purchase_request_id = pr.id
        WHERE pri.raw_material_id = ? AND pr.status != 'cancelled'
        ORDER BY pr.created_at DESC
      `, [id]);

      res.json({ success: true, data: requests });
    } catch (error) {
      console.error('Get material requests error:', error);
      res.status(500).json({ success: false, message: 'Error fetching material requests' });
    }
  };

  // Get request details with items for receiving
  getRequestForReceiving = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const request = await queryOne(`
        SELECT pr.*, v.name as vendor_name, v.phone as vendor_phone,
          rmr.id as receipt_id, rmr.receipt_number, rmr.arrival_status, rmr.payment_status
        FROM purchase_requests pr
        INNER JOIN vendors v ON pr.vendor_id = v.id
        LEFT JOIN raw_material_receipts rmr ON rmr.purchase_request_id = pr.id
        WHERE pr.id = ?
      `, [id]);

      if (!request) {
        return res.status(404).json({ success: false, message: 'Request not found' });
      }

      // Get items with pending quantities
      const items = await query(`
        SELECT pri.*, rm.name as material_name, rm.unit, rm.stock_quantity as current_stock,
          (pri.quantity_ordered - pri.quantity_received) as quantity_pending
        FROM purchase_request_items pri
        INNER JOIN raw_materials rm ON pri.raw_material_id = rm.id
        WHERE pri.request_id = ?
      `, [id]);

      res.json({ success: true, data: { ...request, items } });
    } catch (error) {
      console.error('Get request for receiving error:', error);
      res.status(500).json({ success: false, message: 'Error fetching request' });
    }
  };
}
