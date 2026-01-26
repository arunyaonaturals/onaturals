import express from 'express';
import db from '../database.js';

const router = express.Router();

// Get all products
router.get('/', (req, res) => {
    db.all('SELECT * FROM products ORDER BY id ASC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Add a single product
router.post('/', (req, res) => {
    const { serialNumber, productName, weight, mrp, hsnCode, gstRate, distributorMargin } = req.body;
    const sql = `INSERT INTO products (serialNumber, productName, weight, mrp, hsnCode, gstRate, distributorMargin) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [serialNumber, productName, weight, mrp, hsnCode || '', gstRate || 0, distributorMargin || 0];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({
            id: this.lastID,
            ...req.body
        });
    });
});

// Batch add products (Import)
router.post('/batch', (req, res) => {
    const products = req.body;
    if (!Array.isArray(products) || products.length === 0) {
        res.status(400).json({ error: 'Invalid data format. Expected an array of products.' });
        return;
    }

    const sql = `INSERT INTO products (serialNumber, productName, weight, mrp, hsnCode, gstRate, distributorMargin) VALUES (?, ?, ?, ?, ?, ?, ?)`;

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        const stmt = db.prepare(sql);

        products.forEach(product => {
            stmt.run([
                product.serialNumber || product['S.No.'] || '',
                product.productName || product['Product Name'] || '',
                product.weight || product['Weight'] || '',
                parseFloat(product.mrp || product['MRP'] || 0),
                product.hsnCode || product['HSN Code'] || '',
                parseFloat(product.gstRate || product['GST Rate'] || 0),
                parseFloat(product.distributorMargin || product['Distributor Margin'] || 0)
            ]);
        });

        stmt.finalize();
        db.run('COMMIT', (err) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ message: `Successfully imported ${products.length} products` });
        });
    });
});

// Update a product
router.put('/:id', (req, res) => {
    const { serialNumber, productName, weight, mrp, hsnCode, gstRate, distributorMargin } = req.body;
    const sql = `UPDATE products SET serialNumber = ?, productName = ?, weight = ?, mrp = ?, hsnCode = ?, gstRate = ?, distributorMargin = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`;
    const params = [serialNumber, productName, weight, mrp, hsnCode || '', gstRate || 0, distributorMargin || 0, req.params.id];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({
            id: req.params.id,
            ...req.body,
            changes: this.changes
        });
    });
});

// Delete a product
router.delete('/:id', (req, res) => {
    db.run('DELETE FROM products WHERE id = ?', req.params.id, function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ message: 'Deleted successfully', changes: this.changes });
    });
});

// Clear all products
router.delete('/', (req, res) => {
    db.run('DELETE FROM products', [], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        db.run('DELETE FROM sqlite_sequence WHERE name="products"', [], (err) => {
            res.json({ message: 'All products cleared', changes: this.changes });
        });
    });
});

// Reset all product margins to 0
router.put('/reset-margins', (req, res) => {
    db.run('UPDATE products SET distributorMargin = 0', [], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: 'All product margins reset to 0',
            changes: this.changes
        });
    });
});

export default router;
