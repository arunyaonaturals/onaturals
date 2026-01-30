import { Response } from 'express';
import { query, queryOne, run } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';

export class ProductController {
  getAllProducts = async (req: AuthRequest, res: Response) => {
    try {
      const { category_id, is_active } = req.query;
      let sql = `SELECT p.*, c.name as category_name FROM products p LEFT JOIN product_categories c ON p.category_id = c.id WHERE 1=1`;
      const params: any[] = [];

      if (category_id) { sql += ' AND p.category_id = ?'; params.push(category_id); }
      if (is_active !== undefined) { sql += ' AND p.is_active = ?'; params.push(is_active === 'true' ? 1 : 0); }
      sql += ' ORDER BY p.name';

      const products = await query(sql, params);
      res.json({ success: true, data: products });
    } catch (error) {
      console.error('Get all products error:', error);
      res.status(500).json({ success: false, message: 'Error fetching products' });
    }
  };

  searchProducts = async (req: AuthRequest, res: Response) => {
    try {
      const { q } = req.query;
      if (!q) return res.status(400).json({ success: false, message: 'Search query is required' });

      const products = await query(`
        SELECT p.*, c.name as category_name FROM products p 
        LEFT JOIN product_categories c ON p.category_id = c.id 
        WHERE (p.name LIKE ? OR p.hsn_code LIKE ?) AND p.is_active = 1 ORDER BY p.name
      `, [`%${q}%`, `%${q}%`]);

      res.json({ success: true, data: products });
    } catch (error) {
      console.error('Search products error:', error);
      res.status(500).json({ success: false, message: 'Error searching products' });
    }
  };

  getProductById = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const product = await queryOne(`SELECT p.*, c.name as category_name FROM products p 
        LEFT JOIN product_categories c ON p.category_id = c.id WHERE p.id = ?`, [id]);
      if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
      res.json({ success: true, data: product });
    } catch (error) {
      console.error('Get product by id error:', error);
      res.status(500).json({ success: false, message: 'Error fetching product' });
    }
  };

  createProduct = async (req: AuthRequest, res: Response) => {
    try {
      const { name, hsn_code, weight, weight_unit, cost, selling_price, mrp, gst_rate, category_id, description, stock_quantity } = req.body;
      if (!name || !hsn_code) {
        return res.status(400).json({ success: false, message: 'Name and HSN code are required' });
      }

      const result = await run(`INSERT INTO products (name, hsn_code, weight, weight_unit, cost, selling_price, mrp, gst_rate, category_id, description, stock_quantity) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, hsn_code, weight || null, weight_unit || 'kg', cost || mrp || 0, selling_price || mrp || null, mrp || null, gst_rate || 0, category_id || null, description || null, stock_quantity || 0]);

      res.status(201).json({ success: true, message: 'Product created successfully', data: { id: result.lastInsertRowid, name, hsn_code, mrp, gst_rate: gst_rate || 0 } });
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({ success: false, message: 'Error creating product' });
    }
  };

  updateProduct = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { name, hsn_code, weight, weight_unit, cost, selling_price, mrp, gst_rate, category_id, description, stock_quantity, is_active } = req.body;

      const existing = await queryOne('SELECT id FROM products WHERE id = ?', [id]);
      if (!existing) return res.status(404).json({ success: false, message: 'Product not found' });

      await run(`UPDATE products SET name = COALESCE(?, name), hsn_code = COALESCE(?, hsn_code), weight = COALESCE(?, weight),
        weight_unit = COALESCE(?, weight_unit), cost = COALESCE(?, cost), selling_price = COALESCE(?, selling_price),
        mrp = COALESCE(?, mrp), gst_rate = COALESCE(?, gst_rate), category_id = COALESCE(?, category_id), description = COALESCE(?, description),
        stock_quantity = COALESCE(?, stock_quantity), is_active = COALESCE(?, is_active), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [name, hsn_code, weight, weight_unit, cost, selling_price, mrp, gst_rate, category_id, description, stock_quantity, is_active, id]);

      res.json({ success: true, message: 'Product updated successfully' });
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({ success: false, message: 'Error updating product' });
    }
  };

  deleteProduct = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      await run('UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
      res.json({ success: true, message: 'Product deactivated successfully' });
    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({ success: false, message: 'Error deleting product' });
    }
  };

  getCategories = async (req: AuthRequest, res: Response) => {
    try {
      const categories = await query('SELECT * FROM product_categories ORDER BY name');
      res.json({ success: true, data: categories });
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({ success: false, message: 'Error fetching categories' });
    }
  };

  createCategory = async (req: AuthRequest, res: Response) => {
    try {
      const { name, description } = req.body;
      if (!name) return res.status(400).json({ success: false, message: 'Category name is required' });

      const result = await run('INSERT INTO product_categories (name, description) VALUES (?, ?)', [name, description || null]);
      res.status(201).json({ success: true, message: 'Category created successfully', data: { id: result.lastInsertRowid, name } });
    } catch (error) {
      console.error('Create category error:', error);
      res.status(500).json({ success: false, message: 'Error creating category' });
    }
  };
}
