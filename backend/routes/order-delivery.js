import express from 'express';
import db from '../database.js';

const router = express.Router();

// Initialize tables
const initTables = (callback) => {
    db.serialize(() => {
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

// GET all orders with delivery status
router.get('/', (req, res) => {
    ensureTables(() => {
        const sql = `
            SELECT 
                so.*,
                COALESCE(ods.status, 'pending') as deliveryStatus,
                COALESCE(ods.deliveredItems, 0) as deliveredItems,
                COALESCE(ods.pendingItems, 0) as pendingItems,
                ods.deliveryDate,
                ods.notes as deliveryNotes
            FROM sales_orders so
            LEFT JOIN order_delivery_status ods ON so.id = ods.salesOrderId
            ORDER BY so.orderDate DESC
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

// GET delivery summary stats  
router.get('/summary', (req, res) => {
    ensureTables(() => {
        db.get('SELECT COUNT(*) as total FROM sales_orders', [], (err, totalResult) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            db.get(`SELECT COUNT(*) as cnt FROM order_delivery_status WHERE status = 'delivered'`, [], (err, deliveredResult) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }

                db.get(`SELECT COUNT(*) as cnt FROM order_delivery_status WHERE status = 'partial'`, [], (err, partialResult) => {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }

                    const total = totalResult?.total || 0;
                    const delivered = deliveredResult?.cnt || 0;
                    const partial = partialResult?.cnt || 0;
                    const pending = total - delivered - partial;

                    res.json({ total, delivered, partial, pending });
                });
            });
        });
    });
});

// GET captain performance
router.get('/captain-stats', (req, res) => {
    ensureTables(() => {
        const sql = `
            SELECT 
                so.salesmanName as captain,
                COUNT(DISTINCT so.id) as totalOrders,
                SUM(CASE WHEN ods.status = 'delivered' THEN 1 ELSE 0 END) as delivered,
                SUM(CASE WHEN ods.status = 'partial' THEN 1 ELSE 0 END) as partial,
                SUM(CASE WHEN ods.status IS NULL OR ods.status = 'pending' THEN 1 ELSE 0 END) as pending
            FROM sales_orders so
            LEFT JOIN order_delivery_status ods ON so.id = ods.salesOrderId
            WHERE so.salesmanName IS NOT NULL AND so.salesmanName != ''
            GROUP BY so.salesmanName
            ORDER BY totalOrders DESC
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

// GET single order with item details
router.get('/:orderId', (req, res) => {
    ensureTables(() => {
        const orderId = req.params.orderId;

        // Get order
        db.get('SELECT * FROM sales_orders WHERE id = ?', [orderId], (err, order) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (!order) {
                res.status(404).json({ error: 'Order not found' });
                return;
            }

            // Get delivery status
            db.get('SELECT * FROM order_delivery_status WHERE salesOrderId = ?', [orderId], (err, deliveryStatus) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }

                // Get item delivery details
                db.all(`
                    SELECT oid.*, p.productName as productName
                    FROM order_item_delivery oid
                    LEFT JOIN products p ON oid.productId = p.id
                    WHERE oid.salesOrderId = ?
                `, [orderId], (err, items) => {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }

                    const processItems = (orderItems) => {
                        // Get stock availability for each item
                        const itemsWithStock = [];
                        let completed = 0;

                        if (orderItems.length === 0) {
                            res.json({
                                order,
                                deliveryStatus: deliveryStatus || { status: 'pending' },
                                items: []
                            });
                            return;
                        }

                        orderItems.forEach((item, index) => {
                            db.get(`
                                SELECT COALESCE(SUM(remainingQty), 0) as availableStock
                                FROM product_batches
                                WHERE productId = ?
                            `, [item.productId], (err, stockInfo) => {
                                const availableStock = stockInfo?.availableStock || 0;
                                itemsWithStock[index] = {
                                    ...item,
                                    availableStock,
                                    canDeliver: availableStock >= (item.pendingQty || item.orderedQty)
                                };

                                completed++;
                                if (completed === orderItems.length) {
                                    res.json({
                                        order,
                                        deliveryStatus: deliveryStatus || { status: 'pending' },
                                        items: itemsWithStock
                                    });
                                }
                            });
                        });
                    };

                    // If no item delivery records, get from sales_order_items
                    if (items.length === 0) {
                        db.all(`
                            SELECT 
                                soi.productId,
                                soi.productName,
                                soi.quantity as orderedQty,
                                0 as deliveredQty,
                                soi.quantity as pendingQty,
                                'pending' as status
                            FROM sales_order_items soi
                            WHERE soi.salesOrderId = ?
                        `, [orderId], (err, salesItems) => {
                            if (err) {
                                res.status(500).json({ error: err.message });
                                return;
                            }
                            processItems(salesItems || []);
                        });
                    } else {
                        processItems(items);
                    }
                });
            });
        });
    });
});

// POST initialize delivery tracking for an order
router.post('/:orderId/init', (req, res) => {
    ensureTables(() => {
        const orderId = req.params.orderId;

        // Check if already exists
        db.get('SELECT * FROM order_delivery_status WHERE salesOrderId = ?', [orderId], (err, existing) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (existing) {
                res.json({ success: true, message: 'Already initialized', data: existing });
                return;
            }

            // Get order items
            db.all('SELECT * FROM sales_order_items WHERE salesOrderId = ?', [orderId], (err, items) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }

                const totalItems = (items || []).reduce((sum, i) => sum + (i.quantity || 0), 0);

                // Create delivery status record
                db.run(`
                    INSERT INTO order_delivery_status 
                    (salesOrderId, status, totalItems, deliveredItems, pendingItems)
                    VALUES (?, 'pending', ?, 0, ?)
                `, [orderId, totalItems, totalItems], function (err) {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }

                    // Create item delivery records
                    const insertItem = db.prepare(`
                        INSERT INTO order_item_delivery 
                        (salesOrderId, productId, productName, orderedQty, deliveredQty, pendingQty, status)
                        VALUES (?, ?, ?, ?, 0, ?, 'pending')
                    `);

                    (items || []).forEach(item => {
                        insertItem.run([orderId, item.productId, item.productName, item.quantity, item.quantity]);
                    });
                    insertItem.finalize();

                    res.json({ success: true, message: 'Delivery tracking initialized' });
                });
            });
        });
    });
});

// POST deliver items
router.post('/:orderId/deliver', (req, res) => {
    ensureTables(() => {
        const orderId = req.params.orderId;
        const { items, salesCaptain, notes } = req.body;

        if (!items || items.length === 0) {
            res.status(400).json({ error: 'No items to deliver' });
            return;
        }

        // Initialize if not already
        db.get('SELECT * FROM order_delivery_status WHERE salesOrderId = ?', [orderId], (err, existing) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            const processDelivery = () => {
                let processedCount = 0;
                const totalToProcess = items.length;

                items.forEach(item => {
                    const { productId, deliverQty, batchId } = item;

                    if (deliverQty <= 0) {
                        processedCount++;
                        if (processedCount === totalToProcess) {
                            updateOrderStatus();
                        }
                        return;
                    }

                    // Deduct from batch (FIFO if no specific batch)
                    if (batchId) {
                        db.run('UPDATE product_batches SET remainingQty = remainingQty - ? WHERE id = ? AND remainingQty >= ?',
                            [deliverQty, batchId, deliverQty]);
                    } else {
                        // Auto-deduct from available batches (FIFO)
                        db.all(`
                            SELECT * FROM product_batches 
                            WHERE productId = ? AND remainingQty > 0
                            ORDER BY receivedDate ASC
                        `, [productId], (err, batches) => {
                            if (err) return;

                            let remaining = deliverQty;
                            (batches || []).forEach(batch => {
                                if (remaining <= 0) return;
                                const deduct = Math.min(remaining, batch.remainingQty);
                                db.run('UPDATE product_batches SET remainingQty = remainingQty - ? WHERE id = ?',
                                    [deduct, batch.id]);
                                remaining -= deduct;
                            });
                        });
                    }

                    // Update item delivery record
                    db.get(`
                        SELECT * FROM order_item_delivery 
                        WHERE salesOrderId = ? AND productId = ?
                    `, [orderId, productId], (err, itemRecord) => {
                        if (err || !itemRecord) {
                            processedCount++;
                            if (processedCount === totalToProcess) {
                                updateOrderStatus();
                            }
                            return;
                        }

                        const newDelivered = (itemRecord.deliveredQty || 0) + deliverQty;
                        const newPending = Math.max(0, itemRecord.orderedQty - newDelivered);
                        const newStatus = newPending === 0 ? 'delivered' : 'partial';

                        db.run(`
                            UPDATE order_item_delivery 
                            SET deliveredQty = ?, pendingQty = ?, status = ?, batchId = ?
                            WHERE id = ?
                        `, [newDelivered, newPending, newStatus, batchId || null, itemRecord.id], () => {
                            processedCount++;
                            if (processedCount === totalToProcess) {
                                updateOrderStatus();
                            }
                        });
                    });
                });
            };

            const updateOrderStatus = () => {
                // Recalculate overall order status
                db.all('SELECT * FROM order_item_delivery WHERE salesOrderId = ?', [orderId], (err, allItems) => {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }

                    const overallDelivered = (allItems || []).reduce((sum, i) => sum + (i.deliveredQty || 0), 0);
                    const overallPending = (allItems || []).reduce((sum, i) => sum + (i.pendingQty || 0), 0);
                    const overallStatus = overallPending === 0 ? 'delivered' :
                        overallDelivered > 0 ? 'partial' : 'pending';

                    db.run(`
                        UPDATE order_delivery_status 
                        SET status = ?, deliveredItems = ?, pendingItems = ?, 
                            deliveryDate = ?, salesCaptain = ?, notes = ?, updatedAt = CURRENT_TIMESTAMP
                        WHERE salesOrderId = ?
                    `, [overallStatus, overallDelivered, overallPending,
                        new Date().toISOString().split('T')[0], salesCaptain || '', notes || '', orderId], function (err) {
                            if (err) {
                                res.status(500).json({ error: err.message });
                                return;
                            }

                            res.json({
                                success: true,
                                message: 'Delivery recorded',
                                status: overallStatus,
                                deliveredItems: overallDelivered,
                                pendingItems: overallPending
                            });
                        });
                });
            };

            if (!existing) {
                // Auto-initialize
                db.all('SELECT * FROM sales_order_items WHERE salesOrderId = ?', [orderId], (err, orderItems) => {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }

                    const totalItems = (orderItems || []).reduce((sum, i) => sum + (i.quantity || 0), 0);

                    db.run(`
                        INSERT INTO order_delivery_status 
                        (salesOrderId, status, totalItems, deliveredItems, pendingItems, salesCaptain)
                        VALUES (?, 'pending', ?, 0, ?, ?)
                    `, [orderId, totalItems, totalItems, salesCaptain || ''], function (err) {
                        if (err) {
                            res.status(500).json({ error: err.message });
                            return;
                        }

                        const insertItem = db.prepare(`
                            INSERT OR REPLACE INTO order_item_delivery 
                            (salesOrderId, productId, productName, orderedQty, deliveredQty, pendingQty, status)
                            VALUES (?, ?, ?, ?, 0, ?, 'pending')
                        `);

                        (orderItems || []).forEach(item => {
                            insertItem.run([orderId, item.productId, item.productName, item.quantity, item.quantity]);
                        });
                        insertItem.finalize(() => {
                            processDelivery();
                        });
                    });
                });
            } else {
                processDelivery();
            }
        });
    });
});

export default router;
