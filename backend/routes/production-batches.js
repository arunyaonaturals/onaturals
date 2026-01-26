import express from 'express';
import db from '../database.js';

const router = express.Router();

// Get next batch number
router.get('/next-batch-no', (req, res) => {
    const sql = `SELECT batchNumber FROM production_batches ORDER BY id DESC LIMIT 1`;
    db.get(sql, [], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        let nextBatchNo;
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');

        if (!row) {
            nextBatchNo = `BAT-${year}${month}-001`;
        } else {
            const match = row.batchNumber.match(/BAT-(\d{6})-(\d+)/);
            if (match) {
                const lastYearMonth = match[1];
                const currentYearMonth = `${year}${month}`;

                if (lastYearMonth === currentYearMonth) {
                    const num = parseInt(match[2], 10) + 1;
                    nextBatchNo = `BAT-${currentYearMonth}-${String(num).padStart(3, '0')}`;
                } else {
                    nextBatchNo = `BAT-${currentYearMonth}-001`;
                }
            } else {
                nextBatchNo = `BAT-${year}${month}-001`;
            }
        }
        res.json({ nextBatchNo });
    });
});

// Get all production batches
router.get('/', (req, res) => {
    const sql = `
        SELECT 
            pb.*,
            p.weight as productWeight,
            p.mrp
        FROM production_batches pb
        LEFT JOIN products p ON pb.productId = p.id
        ORDER BY pb.productionDate DESC, pb.id DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get single batch with materials used
router.get('/:id', (req, res) => {
    const batchId = req.params.id;

    const batchSql = `SELECT * FROM production_batches WHERE id = ?`;
    const materialsSql = `
        SELECT bm.*, rms.weight, rms.vendorName
        FROM batch_materials bm
        LEFT JOIN raw_material_stock rms ON bm.rawMaterialId = rms.id
        WHERE bm.batchId = ?
    `;

    db.get(batchSql, [batchId], (err, batch) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!batch) {
            res.status(404).json({ error: 'Batch not found' });
            return;
        }

        db.all(materialsSql, [batchId], (err, materials) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ ...batch, materials });
        });
    });
});

// Create new production batch
router.post('/', (req, res) => {
    const {
        batchNumber, productId, productName, quantityProduced,
        productionDate, expiryDate, notes, materials
    } = req.body;

    // Start transaction
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Insert batch
        const batchSql = `
            INSERT INTO production_batches 
            (batchNumber, productId, productName, quantityProduced, productionDate, expiryDate, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        db.run(batchSql, [
            batchNumber,
            productId || null,
            productName,
            quantityProduced || 0,
            productionDate || new Date().toISOString().split('T')[0],
            expiryDate || null,
            notes || ''
        ], function (err) {
            if (err) {
                db.run('ROLLBACK');
                res.status(500).json({ error: err.message });
                return;
            }

            const batchId = this.lastID;

            // If no materials, commit and return
            if (!materials || materials.length === 0) {
                db.run('COMMIT', (err) => {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    res.json({ id: batchId, batchNumber, message: 'Production batch created' });
                });
                return;
            }

            // Insert materials and update stock
            let completed = 0;
            let errors = [];

            materials.forEach((mat) => {
                // Insert batch_materials record
                db.run(
                    `INSERT INTO batch_materials (batchId, rawMaterialId, materialName, quantityUsed, unit)
                     VALUES (?, ?, ?, ?, ?)`,
                    [batchId, mat.rawMaterialId, mat.materialName, mat.quantityUsed, mat.unit || 'units'],
                    (err) => {
                        if (err) errors.push(err.message);
                    }
                );

                // Update raw material stock
                db.run(
                    `UPDATE raw_material_stock 
                     SET remainingQty = remainingQty - ?, updatedAt = CURRENT_TIMESTAMP 
                     WHERE id = ? AND remainingQty >= ?`,
                    [mat.quantityUsed, mat.rawMaterialId, mat.quantityUsed],
                    function (err) {
                        if (err) {
                            errors.push(err.message);
                        } else if (this.changes === 0) {
                            errors.push(`Insufficient stock for material ID ${mat.rawMaterialId}`);
                        }
                        completed++;

                        // Check if all materials processed
                        if (completed === materials.length) {
                            if (errors.length > 0) {
                                db.run('ROLLBACK');
                                res.status(400).json({ error: 'Some materials failed', details: errors });
                            } else {
                                db.run('COMMIT', (err) => {
                                    if (err) {
                                        res.status(500).json({ error: err.message });
                                        return;
                                    }
                                    res.json({
                                        id: batchId,
                                        batchNumber,
                                        message: 'Production batch created with materials deducted'
                                    });
                                });
                            }
                        }
                    }
                );
            });
        });
    });
});

// Update batch status
router.put('/:id/status', (req, res) => {
    const { status } = req.body;
    db.run(
        'UPDATE production_batches SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        [status, req.params.id],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ message: 'Status updated', changes: this.changes });
        }
    );
});

// Delete batch
router.delete('/:id', (req, res) => {
    // Note: batch_materials will be deleted automatically due to ON DELETE CASCADE
    db.run('DELETE FROM production_batches WHERE id = ?', [req.params.id], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Batch deleted', changes: this.changes });
    });
});

export default router;
