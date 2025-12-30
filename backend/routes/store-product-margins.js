import express from 'express';
import db from '../database.js';

const router = express.Router();

// Get all product margins for a specific store
router.get('/:storeId', (req, res) => {
    const sql = `
        SELECT 
            spm.id,
            spm.storeId,
            spm.productId,
            spm.margin,
            p.productName,
            p.weight,
            p.distributorMargin as defaultMargin
        FROM store_product_margins spm
        JOIN products p ON spm.productId = p.id
        WHERE spm.storeId = ?
        ORDER BY p.productName ASC
    `;

    db.all(sql, [req.params.storeId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get all products with their margins for a specific store (includes products without custom margins)
router.get('/:storeId/all-products', (req, res) => {
    const sql = `
        SELECT 
            p.id as productId,
            p.productName,
            p.weight,
            p.mrp,
            p.distributorMargin as defaultMargin,
            COALESCE(spm.margin, p.distributorMargin) as effectiveMargin,
            spm.id as marginId,
            spm.margin as customMargin
        FROM products p
        LEFT JOIN store_product_margins spm ON p.id = spm.productId AND spm.storeId = ?
        ORDER BY p.productName ASC
    `;

    db.all(sql, [req.params.storeId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get margin for a specific store-product combination
router.get('/:storeId/:productId', (req, res) => {
    const sql = `SELECT * FROM store_product_margins WHERE storeId = ? AND productId = ?`;

    db.get(sql, [req.params.storeId, req.params.productId], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Margin not found' });
            return;
        }
        res.json(row);
    });
});

// Create or update a margin entry
router.post('/', (req, res) => {
    const { storeId, productId, margin } = req.body;

    // First check if entry exists
    db.get(
        'SELECT id FROM store_product_margins WHERE storeId = ? AND productId = ?',
        [storeId, productId],
        (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            if (row) {
                // Update existing
                const sql = `UPDATE store_product_margins SET margin = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`;
                db.run(sql, [margin, row.id], function (err) {
                    if (err) {
                        res.status(400).json({ error: err.message });
                        return;
                    }
                    res.json({ id: row.id, storeId, productId, margin, updated: true });
                });
            } else {
                // Insert new
                const sql = `INSERT INTO store_product_margins (storeId, productId, margin) VALUES (?, ?, ?)`;
                db.run(sql, [storeId, productId, margin], function (err) {
                    if (err) {
                        res.status(400).json({ error: err.message });
                        return;
                    }
                    res.json({ id: this.lastID, storeId, productId, margin, updated: false });
                });
            }
        }
    );
});

// Batch create/update margins for a store
router.post('/batch', (req, res) => {
    const { storeId, margins } = req.body;

    if (!storeId || !Array.isArray(margins)) {
        res.status(400).json({ error: 'Invalid data. Expected storeId and margins array.' });
        return;
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        let completed = 0;
        let errors = [];

        margins.forEach((item, index) => {
            const { productId, margin } = item;

            // Check if exists
            db.get(
                'SELECT id FROM store_product_margins WHERE storeId = ? AND productId = ?',
                [storeId, productId],
                (err, row) => {
                    if (err) {
                        errors.push({ index, productId, error: err.message });
                        completed++;
                        return;
                    }

                    if (row) {
                        // Update
                        db.run(
                            'UPDATE store_product_margins SET margin = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
                            [margin, row.id],
                            (err) => {
                                if (err) errors.push({ index, productId, error: err.message });
                                completed++;
                            }
                        );
                    } else {
                        // Insert
                        db.run(
                            'INSERT INTO store_product_margins (storeId, productId, margin) VALUES (?, ?, ?)',
                            [storeId, productId, margin],
                            (err) => {
                                if (err) errors.push({ index, productId, error: err.message });
                                completed++;
                            }
                        );
                    }
                }
            );
        });

        // Wait for all operations to complete
        const checkComplete = setInterval(() => {
            if (completed === margins.length) {
                clearInterval(checkComplete);

                if (errors.length > 0) {
                    db.run('ROLLBACK');
                    res.status(500).json({ error: 'Batch operation failed', errors });
                } else {
                    db.run('COMMIT', (err) => {
                        if (err) {
                            res.status(500).json({ error: err.message });
                            return;
                        }
                        res.json({
                            message: `Successfully updated ${margins.length} margin(s) for store ${storeId}`,
                            count: margins.length
                        });
                    });
                }
            }
        }, 50);
    });
});

// Delete a margin entry
router.delete('/:id', (req, res) => {
    db.run('DELETE FROM store_product_margins WHERE id = ?', req.params.id, function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ message: 'Deleted successfully', changes: this.changes });
    });
});

// Delete all margins for a store
router.delete('/store/:storeId', (req, res) => {
    db.run('DELETE FROM store_product_margins WHERE storeId = ?', req.params.storeId, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'All margins for store deleted', changes: this.changes });
    });
});

export default router;
