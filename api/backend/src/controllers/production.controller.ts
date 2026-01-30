import { Response } from 'express';
import { query, queryOne, run, transaction } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';

export class ProductionController {
  // Get all production orders
  getAllProductionOrders = async (req: AuthRequest, res: Response) => {
    try {
      const { status, product_id, start_date, end_date } = req.query;
      let sql = `
        SELECT po.*, p.name as product_name, p.weight, p.weight_unit,
               u.name as created_by_name, o.order_number as source_order_number
        FROM production_orders po
        INNER JOIN products p ON po.product_id = p.id
        INNER JOIN users u ON po.created_by = u.id
        LEFT JOIN orders o ON po.source_order_id = o.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (status) { sql += ' AND po.status = ?'; params.push(status); }
      if (product_id) { sql += ' AND po.product_id = ?'; params.push(product_id); }
      if (start_date) { sql += ' AND date(po.created_at) >= ?'; params.push(start_date); }
      if (end_date) { sql += ' AND date(po.created_at) <= ?'; params.push(end_date); }
      sql += ' ORDER BY po.created_at DESC';

      const orders = await query(sql, params);
      res.json({ success: true, data: orders });
    } catch (error) {
      console.error('Get all production orders error:', error);
      res.status(500).json({ success: false, message: 'Error fetching production orders' });
    }
  };

  // Get production order by ID
  getProductionOrderById = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const order = await queryOne(`
        SELECT po.*, p.name as product_name, p.weight, p.weight_unit,
               u.name as created_by_name, o.order_number as source_order_number
        FROM production_orders po
        INNER JOIN products p ON po.product_id = p.id
        INNER JOIN users u ON po.created_by = u.id
        LEFT JOIN orders o ON po.source_order_id = o.id
        WHERE po.id = ?
      `, [id]);

      if (!order) {
        return res.status(404).json({ success: false, message: 'Production order not found' });
      }

      // Get materials required/used
      const materials = await query(`
        SELECT pm.*, rm.name as raw_material_name, rm.unit, rm.stock_quantity as available_stock
        FROM production_materials pm
        INNER JOIN raw_materials rm ON pm.raw_material_id = rm.id
        WHERE pm.production_order_id = ?
      `, [id]);

      res.json({ success: true, data: { ...order, materials } });
    } catch (error) {
      console.error('Get production order by id error:', error);
      res.status(500).json({ success: false, message: 'Error fetching production order' });
    }
  };

  // Get order demand - list of pending/approved orders with their items
  getOrderDemand = async (req: AuthRequest, res: Response) => {
    try {
      // Get all pending/submitted/approved orders
      const orders = await query(`
        SELECT o.*, s.name as store_name, u.name as created_by_name
        FROM orders o
        INNER JOIN stores s ON o.store_id = s.id
        INNER JOIN users u ON o.created_by = u.id
        WHERE o.status IN ('submitted', 'approved')
        ORDER BY o.created_at DESC
      `);

      // Get items for each order with product stock info
      const ordersWithItems = orders.map(async (order: any) => {
        const items = await query(`
          SELECT oi.*, p.name as product_name, p.stock_quantity, p.weight, p.weight_unit
          FROM order_items oi
          INNER JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id = ?
        `, [order.id]);
        
        return { ...order, items };
      });

      res.json({ success: true, data: ordersWithItems });
    } catch (error) {
      console.error('Get order demand error:', error);
      res.status(500).json({ success: false, message: 'Error fetching order demand' });
    }
  };

  // Get suggested production based on pending orders
  getSuggestedProduction = async (req: AuthRequest, res: Response) => {
    try {
      // Get all pending/submitted orders that haven't been fully invoiced
      const pendingOrderItems = await query(`
        SELECT oi.product_id, p.name as product_name, p.weight, p.weight_unit, p.stock_quantity,
               SUM(oi.quantity) as total_required
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
        INNER JOIN products p ON oi.product_id = p.id
        WHERE o.status IN ('submitted', 'approved')
        GROUP BY oi.product_id
      `);

      // Calculate production needs - show ALL products from orders
      const suggestions = [];
      for (const item of pendingOrderItems) {
        const needed = Math.max(0, item.total_required - item.stock_quantity);
        
        // Get recipe for this product
        const recipes = await query(`
          SELECT pr.*, rm.name as raw_material_name, rm.stock_quantity as available_stock, rm.unit
          FROM product_recipes pr
          INNER JOIN raw_materials rm ON pr.raw_material_id = rm.id
          WHERE pr.product_id = ?
        `, [item.product_id]);

        // Check if we have enough raw materials
        let canProduce = needed > 0 ? needed : 0;
        const materialStatus = [];
        
        if (recipes.length > 0 && needed > 0) {
          for (const recipe of recipes) {
            const requiredQty = recipe.quantity_required * needed;
            const maxFromMaterial = Math.floor(recipe.available_stock / recipe.quantity_required);
            canProduce = Math.min(canProduce, maxFromMaterial);
            materialStatus.push({
              raw_material_id: recipe.raw_material_id,
              raw_material_name: recipe.raw_material_name,
              unit: recipe.unit,
              required_per_unit: recipe.quantity_required,
              total_required: requiredQty,
              available: recipe.available_stock,
              sufficient: recipe.available_stock >= requiredQty
            });
          }
        }

        suggestions.push({
          product_id: item.product_id,
          product_name: item.product_name,
          weight: item.weight,
          weight_unit: item.weight_unit,
          current_stock: item.stock_quantity,
          total_required: item.total_required,
          production_needed: needed,
          can_produce: canProduce,
          has_recipe: recipes.length > 0,
          stock_sufficient: item.stock_quantity >= item.total_required,
          materials: materialStatus
        });
      }

      res.json({ success: true, data: suggestions });
    } catch (error) {
      console.error('Get suggested production error:', error);
      res.status(500).json({ success: false, message: 'Error calculating production suggestions' });
    }
  };

  // Create production order
  createProductionOrder = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });

      const { product_id, quantity_to_produce, source_order_id, notes } = req.body;
      if (!product_id || !quantity_to_produce || quantity_to_produce <= 0) {
        return res.status(400).json({ success: false, message: 'Product ID and valid quantity are required' });
      }

      // Check if product has a recipe
      const recipes = await query(`
        SELECT pr.*, rm.name as raw_material_name, rm.stock_quantity
        FROM product_recipes pr
        INNER JOIN raw_materials rm ON pr.raw_material_id = rm.id
        WHERE pr.product_id = ?
      `, [product_id]);

      if (recipes.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Product does not have a recipe defined. Please set up the recipe first.' 
        });
      }

      // Check raw material availability
      for (const recipe of recipes) {
        const requiredQty = recipe.quantity_required * quantity_to_produce;
        if (recipe.stock_quantity < requiredQty) {
          return res.status(400).json({
            success: false,
            message: `Insufficient ${recipe.raw_material_name}. Required: ${requiredQty}, Available: ${recipe.stock_quantity}`
          });
        }
      }

      const result = await transaction(async () => {
        // Generate order number
        const lastOrder = await queryOne('SELECT order_number FROM production_orders ORDER BY id DESC LIMIT 1');
        const orderNumber = this.generateOrderNumber(lastOrder?.order_number);

        // Create production order
        const orderResult = await run(`
          INSERT INTO production_orders (order_number, product_id, quantity_to_produce, source_order_id, notes, created_by)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [orderNumber, product_id, quantity_to_produce, source_order_id || null, notes || null, req.user!.id]);

        const orderId = orderResult.lastInsertRowid;

        // Create production materials entries
        for (const recipe of recipes) {
          const requiredQty = recipe.quantity_required * quantity_to_produce;
          await run(`
            INSERT INTO production_materials (production_order_id, raw_material_id, quantity_required)
            VALUES (?, ?, ?)
          `, [orderId, recipe.raw_material_id, requiredQty]);
        }

        return { orderId, orderNumber };
      });

      res.status(201).json({
        success: true,
        message: 'Production order created successfully',
        data: { id: result.orderId, order_number: result.orderNumber }
      });
    } catch (error: any) {
      console.error('Create production order error:', error);
      res.status(500).json({ success: false, message: error.message || 'Error creating production order' });
    }
  };

  // Start production (set to in_progress)
  startProduction = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const order = await queryOne('SELECT id, status FROM production_orders WHERE id = ?', [id]);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Production order not found' });
      }
      if (order.status !== 'pending') {
        return res.status(400).json({ success: false, message: 'Only pending orders can be started' });
      }

      await run('UPDATE production_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['in_progress', id]);
      res.json({ success: true, message: 'Production started' });
    } catch (error) {
      console.error('Start production error:', error);
      res.status(500).json({ success: false, message: 'Error starting production' });
    }
  };

  // Complete production
  completeProduction = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { quantity_produced } = req.body;

      const order = await queryOne(`
        SELECT po.*, p.stock_quantity as current_product_stock, p.name as product_name
        FROM production_orders po
        INNER JOIN products p ON po.product_id = p.id
        WHERE po.id = ?
      `, [id]);
      
      if (!order) {
        return res.status(404).json({ success: false, message: 'Production order not found' });
      }
      if (order.status === 'completed') {
        return res.status(400).json({ success: false, message: 'Production already completed' });
      }
      if (order.status === 'cancelled') {
        return res.status(400).json({ success: false, message: 'Cannot complete cancelled production' });
      }

      const finalQuantity = quantity_produced !== undefined ? quantity_produced : order.quantity_to_produce;

      const result = await transaction(async () => {
        // Get materials and deduct from raw material stock
        const materials = await query(`
          SELECT pm.*, rm.stock_quantity
          FROM production_materials pm
          INNER JOIN raw_materials rm ON pm.raw_material_id = rm.id
          WHERE pm.production_order_id = ?
        `, [id]);

        for (const material of materials) {
          // Calculate actual usage based on produced quantity ratio
          const usageRatio = finalQuantity / order.quantity_to_produce;
          const actualUsed = material.quantity_required * usageRatio;
          
          // Deduct from raw material stock
          await run('UPDATE raw_materials SET stock_quantity = stock_quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
            [actualUsed, material.raw_material_id]);
          
          // Update production materials with actual usage
          await run('UPDATE production_materials SET quantity_used = ? WHERE id = ?', [actualUsed, material.id]);
        }

        // Add to finished product stock
        await run('UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [finalQuantity, order.product_id]);

        // Generate batch number and create batch record
        const batchNumber = await this.generateBatchNumber(order.product_id);
        const today = new Date().toISOString().split('T')[0];
        
        const batchResult = await run(`
          INSERT INTO product_batches (product_id, batch_number, production_order_id, quantity_produced, quantity_remaining, production_date)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [order.product_id, batchNumber, id, finalQuantity, finalQuantity, today]);

        // Update production order
        await run(`
          UPDATE production_orders 
          SET status = 'completed', quantity_produced = ?, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `, [finalQuantity, id]);

        return { batchNumber, batchId: batchResult.lastInsertRowid };
      });

      res.json({ 
        success: true, 
        message: 'Production completed successfully',
        data: { 
          quantity_produced: finalQuantity,
          batch_number: result.batchNumber,
          batch_id: result.batchId
        }
      });
    } catch (error) {
      console.error('Complete production error:', error);
      res.status(500).json({ success: false, message: 'Error completing production' });
    }
  };

  // Get all batches for a product
  getProductBatches = async (req: AuthRequest, res: Response) => {
    try {
      const { product_id } = req.params;
      const { status } = req.query;

      let sql = `
        SELECT pb.*, p.name as product_name, po.order_number as production_order_number
        FROM product_batches pb
        INNER JOIN products p ON pb.product_id = p.id
        LEFT JOIN production_orders po ON pb.production_order_id = po.id
        WHERE pb.product_id = ?
      `;
      const params: any[] = [product_id];

      if (status) {
        sql += ' AND pb.status = ?';
        params.push(status);
      }
      sql += ' ORDER BY pb.production_date DESC';

      const batches = await query(sql, params);
      res.json({ success: true, data: batches });
    } catch (error) {
      console.error('Get product batches error:', error);
      res.status(500).json({ success: false, message: 'Error fetching product batches' });
    }
  };

  // Get all available batches (for dispatch FIFO)
  getAvailableBatches = async (req: AuthRequest, res: Response) => {
    try {
      const { product_id } = req.query;

      let sql = `
        SELECT pb.*, p.name as product_name
        FROM product_batches pb
        INNER JOIN products p ON pb.product_id = p.id
        WHERE pb.status = 'available' AND pb.quantity_remaining > 0
      `;
      const params: any[] = [];

      if (product_id) {
        sql += ' AND pb.product_id = ?';
        params.push(product_id);
      }
      sql += ' ORDER BY pb.production_date ASC'; // FIFO - oldest first

      const batches = await query(sql, params);
      res.json({ success: true, data: batches });
    } catch (error) {
      console.error('Get available batches error:', error);
      res.status(500).json({ success: false, message: 'Error fetching available batches' });
    }
  };

  // Get all batches (admin view)
  getAllBatches = async (req: AuthRequest, res: Response) => {
    try {
      const { status, product_id } = req.query;

      let sql = `
        SELECT pb.*, p.name as product_name, po.order_number as production_order_number
        FROM product_batches pb
        INNER JOIN products p ON pb.product_id = p.id
        LEFT JOIN production_orders po ON pb.production_order_id = po.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (status) { sql += ' AND pb.status = ?'; params.push(status); }
      if (product_id) { sql += ' AND pb.product_id = ?'; params.push(product_id); }
      sql += ' ORDER BY pb.production_date DESC';

      const batches = await query(sql, params);
      res.json({ success: true, data: batches });
    } catch (error) {
      console.error('Get all batches error:', error);
      res.status(500).json({ success: false, message: 'Error fetching batches' });
    }
  };

  // Cancel production order
  cancelProduction = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const order = await queryOne('SELECT id, status FROM production_orders WHERE id = ?', [id]);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Production order not found' });
      }
      if (order.status === 'completed') {
        return res.status(400).json({ success: false, message: 'Cannot cancel completed production' });
      }

      await run('UPDATE production_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['cancelled', id]);
      res.json({ success: true, message: 'Production cancelled' });
    } catch (error) {
      console.error('Cancel production error:', error);
      res.status(500).json({ success: false, message: 'Error cancelling production' });
    }
  };

  // Product Recipe Management
  getProductRecipes = async (req: AuthRequest, res: Response) => {
    try {
      const { product_id } = req.params;
      const recipes = await query(`
        SELECT pr.*, rm.name as raw_material_name, rm.unit, rm.stock_quantity as available_stock
        FROM product_recipes pr
        INNER JOIN raw_materials rm ON pr.raw_material_id = rm.id
        WHERE pr.product_id = ?
      `, [product_id]);

      res.json({ success: true, data: recipes });
    } catch (error) {
      console.error('Get product recipes error:', error);
      res.status(500).json({ success: false, message: 'Error fetching product recipes' });
    }
  };

  setProductRecipe = async (req: AuthRequest, res: Response) => {
    try {
      const { product_id } = req.params;
      const { recipes } = req.body; // Array of { raw_material_id, quantity_required }

      if (!recipes || !Array.isArray(recipes) || recipes.length === 0) {
        return res.status(400).json({ success: false, message: 'Recipes array is required' });
      }

      await transaction(async () => {
        // Delete existing recipes for this product
        await run('DELETE FROM product_recipes WHERE product_id = ?', [product_id]);

        // Insert new recipes
        for (const recipe of recipes) {
          if (recipe.raw_material_id && recipe.quantity_required > 0) {
            await run(`
              INSERT INTO product_recipes (product_id, raw_material_id, quantity_required)
              VALUES (?, ?, ?)
            `, [product_id, recipe.raw_material_id, recipe.quantity_required]);
          }
        }
      });

      res.json({ success: true, message: 'Product recipe saved successfully' });
    } catch (error) {
      console.error('Set product recipe error:', error);
      res.status(500).json({ success: false, message: 'Error saving product recipe' });
    }
  };

  private generateOrderNumber(lastNumber?: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const fyStart = month >= 4 ? year : year - 1;
    const fyEnd = (fyStart + 1) % 100;
    const fyString = `${fyStart}-${fyEnd.toString().padStart(2, '0')}`;
    
    const prefix = `PROD-${fyString}/`;
    
    if (!lastNumber) return `${prefix}1`;

    const match = lastNumber.match(/PROD-\d{4}-\d{2}\/(\d+)$/);
    if (match) {
      const lastFy = lastNumber.substring(5, 12);
      if (lastFy === fyString) {
        return `${prefix}${parseInt(match[1]) + 1}`;
      }
    }
    
    return `${prefix}1`;
  }

  // Generate batch number: BATCH-YYYYMMDD-XXX (XXX = sequential for that day)
  private async generateBatchNumber(productId: number): Promise<string> {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const prefix = `BATCH-${dateStr}`;
    
    // Get count of batches created today for this product
    const countResult = await queryOne(`
      SELECT COUNT(*) as count FROM product_batches 
      WHERE product_id = ? AND date(created_at) = date('now')
    `, [productId]);
    
    const sequence = (countResult?.count || 0) + 1;
    return `${prefix}-${sequence.toString().padStart(3, '0')}`;
  }
}
