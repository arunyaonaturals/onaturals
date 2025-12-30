import express from 'express';
import db from '../database.js';

const router = express.Router();

// Initialize tables
const initTables = (callback) => {
    db.serialize(() => {
        // Product batches table
        db.run(`
            CREATE TABLE IF NOT EXISTS product_batches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                purchaseOrderId INTEGER,
                productId INTEGER NOT NULL,
                batchNumber TEXT NOT NULL UNIQUE,
                packageSize TEXT,
                quantity INTEGER DEFAULT 0,
                remainingQty INTEGER DEFAULT 0,
                costPerUnit REAL DEFAULT 0,
                receivedDate TEXT,
                expiryDate TEXT,
                notes TEXT,
                createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (productId) REFERENCES products(id)
            )
        `);

        // Order delivery status table
        db.run(`
            CREATE TABLE IF NOT EXISTS order_delivery_status (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                salesOrderId INTEGER NOT NULL UNIQUE,
                status TEXT DEFAULT 'pending',
                totalItems INTEGER DEFAULT 0,
                deliveredItems INTEGER DEFAULT 0,
                pendingItems INTEGER DEFAULT 0,
                deliveryDate TEXT,
                salesCaptain TEXT,
                notes TEXT,
                createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
                updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (salesOrderId) REFERENCES sales_orders(id)
            )
        `);

        // Order item delivery tracking
        db.run(`
            CREATE TABLE IF NOT EXISTS order_item_delivery (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                salesOrderId INTEGER NOT NULL,
                productId INTEGER NOT NULL,
                productName TEXT,
                orderedQty INTEGER DEFAULT 0,
                deliveredQty INTEGER DEFAULT 0,
                pendingQty INTEGER DEFAULT 0,
                batchId INTEGER,
                status TEXT DEFAULT 'pending',
                createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (salesOrderId) REFERENCES sales_orders(id),
                FOREIGN KEY (productId) REFERENCES products(id)
            )
        `, callback);
    });
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

// GET all batches with product info
router.get('/', (req, res) => {
    ensureTables(() => {
        const sql = `
            SELECT pb.*, p.productName as productName, p.weight as productCategory
            FROM product_batches pb
            LEFT JOIN products p ON pb.productId = p.id
            ORDER BY pb.createdAt DESC
        `;
        db.all(sql, [], (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows || []);
        });
    });
});

// GET stock summary by product
router.get('/stock-summary', (req, res) => {
    ensureTables(() => {
        const sql = `
            SELECT 
                p.id as productId,
                p.productName as productName,
                p.weight as category,
                COALESCE(SUM(pb.remainingQty), 0) as totalStock,
                COUNT(pb.id) as batchCount
            FROM products p
            LEFT JOIN product_batches pb ON p.id = pb.productId
            GROUP BY p.id
            ORDER BY totalStock ASC
        `;
        db.all(sql, [], (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows || []);
        });
    });
});

// GET low stock products (threshold: 10 units)
router.get('/low-stock', (req, res) => {
    ensureTables(() => {
        const threshold = parseInt(req.query.threshold) || 10;
        const sql = `
            SELECT 
                p.id as productId,
                p.productName as productName,
                p.weight as category,
                COALESCE(SUM(pb.remainingQty), 0) as totalStock
            FROM products p
            LEFT JOIN product_batches pb ON p.id = pb.productId
            GROUP BY p.id
            HAVING totalStock < ?
            ORDER BY totalStock ASC
        `;
        db.all(sql, [threshold], (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows || []);
        });
    });
});

// GET batches for a specific product
router.get('/product/:productId', (req, res) => {
    ensureTables(() => {
        const sql = `
            SELECT * FROM product_batches 
            WHERE productId = ? AND remainingQty > 0
            ORDER BY receivedDate ASC
        `;
        db.all(sql, [req.params.productId], (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows || []);
        });
    });
});

// POST create new batch
router.post('/', (req, res) => {
    ensureTables(() => {
        const {
            purchaseOrderId,
            productId,
            batchNumber,
            quantity,
            receivedDate
        } = req.body;

        if (!productId || !batchNumber || !quantity) {
            res.status(400).json({ error: 'productId, batchNumber, and quantity are required' });
            return;
        }

        // Get product details for defaults if needed
        db.get('SELECT weight FROM products WHERE id = ?', [productId], (err, product) => {
            // We can store weight as packageSize if needed, or just leave it blank as it's redundant
            const packageSize = product ? product.weight : '';

            const sql = `
                INSERT INTO product_batches 
                (purchaseOrderId, productId, batchNumber, packageSize, quantity, remainingQty, costPerUnit, receivedDate, expiryDate, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            db.run(sql, [
                purchaseOrderId || null,
                productId,
                batchNumber,
                packageSize,
                quantity,
                quantity, // remainingQty starts same as quantity
                0, // costPerUnit removed
                receivedDate || new Date().toISOString().split('T')[0],
                null, // expiryDate removed
                '' // notes removed
            ], function (err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({
                    success: true,
                    id: this.lastID,
                    message: 'Batch created successfully'
                });
            });
        });
    });
});

// ... (PUT and POST deduct routes remain same)

// Generate batch number
router.get('/generate-batch-number/:productId', (req, res) => {
    db.get('SELECT productName, weight FROM products WHERE id = ?', [req.params.productId], (err, product) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!product) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }

        const now = new Date();
        const monthYear = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getFullYear()).slice(-2)}`;
        const prefix = product.productName.substring(0, 4).toUpperCase().replace(/\s/g, '');
        // Use product weight from DB as package size
        const size = (product.weight || 'STD').toUpperCase().replace(/\s/g, '');

        db.get(`
            SELECT COUNT(*) as cnt FROM product_batches 
            WHERE batchNumber LIKE ?
        `, [`${prefix}-${size}-${monthYear}%`], (err, count) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            const seq = String((count?.cnt || 0) + 1).padStart(3, '0');
            const batchNumber = `${prefix}-${size}-${monthYear}-${seq}`;

            res.json({ batchNumber });
        });
    });
});

export default router;
