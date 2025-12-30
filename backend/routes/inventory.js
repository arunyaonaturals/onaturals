import express from 'express';
import db from '../database.js';

const router = express.Router();

// Initialize inventory table
const initTables = (callback) => {
    db.run(`
        CREATE TABLE IF NOT EXISTS inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            productId INTEGER NOT NULL,
            month INTEGER NOT NULL,
            year INTEGER NOT NULL,
            opening INTEGER DEFAULT 0,
            stockIn INTEGER DEFAULT 0,
            stockOut INTEGER DEFAULT 0,
            closing INTEGER DEFAULT 0,
            notes TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (productId) REFERENCES products(id),
            UNIQUE(productId, month, year)
        )
    `, callback);
};

// Ensure tables exist on first request
let tablesInitialized = false;
const ensureTables = (callback) => {
    if (tablesInitialized) {
        callback();
    } else {
        initTables(() => {
            tablesInitialized = true;
            callback();
        });
    }
};

// GET all inventory records
router.get('/', (req, res) => {
    ensureTables(() => {
        db.all('SELECT * FROM inventory ORDER BY year DESC, month DESC', [], (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows || []);
        });
    });
});

// GET inventory for a specific month/year
router.get('/month/:year/:month', (req, res) => {
    ensureTables(() => {
        const { year, month } = req.params;

        const sql = `
            SELECT i.*, p.productName as productName, p.weight as category
            FROM inventory i
            LEFT JOIN products p ON i.productId = p.id
            WHERE i.year = ? AND i.month = ?
        `;
        db.all(sql, [parseInt(year), parseInt(month)], (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows || []);
        });
    });
});

// POST create/update inventory entry
router.post('/', (req, res) => {
    ensureTables(() => {
        const { productId, month, year, stockIn, stockOut, notes } = req.body;

        if (!productId || !month || !year) {
            res.status(400).json({ error: 'productId, month, and year are required' });
            return;
        }

        // Check if entry exists
        db.get(`
            SELECT * FROM inventory WHERE productId = ? AND month = ? AND year = ?
        `, [productId, month, year], (err, existing) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            if (existing) {
                // Update existing entry
                const newStockIn = (existing.stockIn || 0) + (parseInt(stockIn) || 0);
                const newStockOut = (existing.stockOut || 0) + (parseInt(stockOut) || 0);
                const newClosing = existing.opening + newStockIn - newStockOut;

                db.run(`
                    UPDATE inventory 
                    SET stockIn = ?, stockOut = ?, closing = ?, notes = ?, updatedAt = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [newStockIn, newStockOut, newClosing, notes || '', existing.id], function (err) {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    res.json({ success: true, message: 'Inventory updated' });
                });
            } else {
                // Create new entry
                const opening = 0; // Can be set from previous month's closing
                const closing = opening + (parseInt(stockIn) || 0) - (parseInt(stockOut) || 0);

                db.run(`
                    INSERT INTO inventory (productId, month, year, opening, stockIn, stockOut, closing, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [productId, month, year, opening, stockIn || 0, stockOut || 0, closing, notes || ''], function (err) {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    res.json({ success: true, message: 'Inventory entry created' });
                });
            }
        });
    });
});

// DELETE inventory entry
router.delete('/:id', (req, res) => {
    db.run('DELETE FROM inventory WHERE id = ?', [req.params.id], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true, message: 'Inventory entry deleted' });
    });
});

export default router;
