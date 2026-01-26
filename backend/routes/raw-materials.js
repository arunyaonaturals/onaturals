import express from 'express';
import db from '../database.js';

const router = express.Router();

// Get all raw materials in stock
router.get('/', (req, res) => {
    const sql = `
        SELECT 
            rms.*,
            po.orderNo as purchaseOrderNo
        FROM raw_material_stock rms
        LEFT JOIN purchase_orders po ON rms.purchaseOrderId = po.id
        ORDER BY rms.materialName ASC, rms.createdAt DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get materials with remaining stock only
router.get('/available', (req, res) => {
    const sql = `
        SELECT * FROM raw_material_stock 
        WHERE remainingQty > 0 
        ORDER BY materialName ASC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get single raw material
router.get('/:id', (req, res) => {
    const sql = `SELECT * FROM raw_material_stock WHERE id = ?`;
    db.get(sql, [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Raw material not found' });
            return;
        }
        res.json(row);
    });
});

// Add raw material to stock (can be called manually or from purchase order)
router.post('/', (req, res) => {
    const {
        purchaseOrderId, purchaseItemId, materialName, weight,
        initialQty, unit, rate, vendorId, vendorName, purchaseDate
    } = req.body;

    const sql = `
        INSERT INTO raw_material_stock 
        (purchaseOrderId, purchaseItemId, materialName, weight, initialQty, remainingQty, unit, rate, vendorId, vendorName, purchaseDate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [
        purchaseOrderId || null,
        purchaseItemId || null,
        materialName,
        weight || '',
        initialQty || 0,
        initialQty || 0, // remainingQty = initialQty initially
        unit || 'units',
        rate || 0,
        vendorId || null,
        vendorName || '',
        purchaseDate || new Date().toISOString().split('T')[0]
    ], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID, message: 'Raw material added to stock' });
    });
});

// Update remaining quantity (used when creating production batch)
router.put('/:id/use', (req, res) => {
    const { quantityUsed } = req.body;

    // First get current remaining
    db.get('SELECT remainingQty FROM raw_material_stock WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Raw material not found' });
            return;
        }

        const newRemaining = row.remainingQty - quantityUsed;
        if (newRemaining < 0) {
            res.status(400).json({ error: 'Insufficient stock' });
            return;
        }

        db.run(
            'UPDATE raw_material_stock SET remainingQty = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
            [newRemaining, req.params.id],
            function (err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({ message: 'Stock updated', newRemaining });
            }
        );
    });
});

// Delete raw material entry
router.delete('/:id', (req, res) => {
    db.run('DELETE FROM raw_material_stock WHERE id = ?', [req.params.id], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Deleted successfully', changes: this.changes });
    });
});

export default router;
