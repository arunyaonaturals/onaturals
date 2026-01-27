import express from 'express';
import db from '../database.js';

const router = express.Router();

// Get next PO number
router.get('/next-po-no', (req, res) => {
    const sql = `SELECT orderNo FROM purchase_orders ORDER BY id DESC LIMIT 1`;
    db.get(sql, [], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        let nextPoNo;
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');

        if (!row) {
            nextPoNo = `PO-${year}${month}-001`;
        } else {
            const match = row.orderNo.match(/PO-(\d{6})-(\d+)/);
            if (match) {
                const lastYearMonth = match[1];
                const currentYearMonth = `${year}${month}`;

                if (lastYearMonth === currentYearMonth) {
                    const num = parseInt(match[2], 10) + 1;
                    nextPoNo = `PO-${currentYearMonth}-${String(num).padStart(3, '0')}`;
                } else {
                    nextPoNo = `PO-${currentYearMonth}-001`;
                }
            } else {
                nextPoNo = `PO-${year}${month}-001`;
            }
        }
        res.json({ nextPoNo });
    });
});

// Get all purchase orders
router.get('/', (req, res) => {
    const sql = `SELECT po.*, s.supplierName,
                 GROUP_CONCAT(poi.productName, ', ') as itemNames
                 FROM purchase_orders po 
                 LEFT JOIN suppliers s ON po.supplierId = s.id
                 LEFT JOIN purchase_order_items poi ON po.id = poi.orderId
                 GROUP BY po.id
                 ORDER BY po.orderDate DESC, po.id DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get single purchase order with items
router.get('/:id', (req, res) => {
    const orderId = req.params.id;

    const orderSql = `SELECT po.*, s.supplierName, s.gstin as supplierGstin, s.address as supplierAddress
                      FROM purchase_orders po
                      LEFT JOIN suppliers s ON po.supplierId = s.id
                      WHERE po.id = ?`;
    const itemsSql = `SELECT * FROM purchase_order_items WHERE orderId = ?`;

    db.get(orderSql, [orderId], (err, order) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!order) {
            res.status(404).json({ error: 'Purchase order not found' });
            return;
        }

        db.all(itemsSql, [orderId], (err, items) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ ...order, items });
        });
    });
});

// Create new purchase order with items
router.post('/', (req, res) => {
    const {
        orderNo, orderDate, supplierId, supplierName, expectedDeliveryDate,
        subtotal, gstTotal, grandTotal, notes, items,
        paymentStatus, paymentAmount, paymentDate
    } = req.body;

    // Sanitize values for Turso compatibility (no undefined/null allowed)
    const sanitizedParams = [
        orderNo || '',
        orderDate || '',
        supplierId || 0,
        supplierName || '',
        expectedDeliveryDate || '',
        subtotal || 0,
        gstTotal || 0,
        grandTotal || 0,
        notes || '',
        paymentStatus || 'unpaid',
        paymentAmount || 0,
        paymentDate || ''
    ];

    const orderSql = `INSERT INTO purchase_orders 
                      (orderNo, orderDate, supplierId, supplierName, expectedDeliveryDate,
                       subtotal, gstTotal, grandTotal, notes, status, paymentStatus, paymentAmount, paymentDate)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`;

    db.run(orderSql, sanitizedParams, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        const orderId = this.lastID;

        if (!items || items.length === 0) {
            res.json({ id: orderId, orderNo, message: 'Purchase order created successfully' });
            return;
        }

        // Insert order items - use different SQL based on whether productId is valid
        const itemSqlWithProduct = `INSERT INTO purchase_order_items 
                         (orderId, productId, productName, weight, hsnCode, quantity, unit, rate, amount, gstRate, gstAmount, totalAmount)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const itemSqlNoProduct = `INSERT INTO purchase_order_items 
                         (orderId, productName, weight, hsnCode, quantity, unit, rate, amount, gstRate, gstAmount, totalAmount)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const promises = items.map(item => {
            const hasValidProductId = item.productId && item.productId > 0;
            const unit = item.unit || 'KG'; // Default to KG if not specified

            const itemParams = hasValidProductId ? [
                orderId,
                item.productId,
                item.productName || '',
                item.weight || '',
                item.hsnCode || '',
                item.quantity || 0,
                unit,
                item.rate || 0,
                item.amount || 0,
                item.gstRate || 0,
                item.gstAmount || 0,
                item.totalAmount || 0
            ] : [
                orderId,
                item.productName || '',
                item.weight || '',
                item.hsnCode || '',
                item.quantity || 0,
                unit,
                item.rate || 0,
                item.amount || 0,
                item.gstRate || 0,
                item.gstAmount || 0,
                item.totalAmount || 0
            ];

            const sql = hasValidProductId ? itemSqlWithProduct : itemSqlNoProduct;

            return new Promise((resolve, reject) => {
                db.run(sql, itemParams, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });

        Promise.all(promises)
            .then(() => {
                res.json({ id: orderId, orderNo, message: 'Purchase order created successfully with items' });
            })
            .catch(err => {
                res.status(500).json({ error: err.message });
            });
    });
});

// Update purchase order status
router.put('/:id/status', (req, res) => {
    const { status, receivedDate, invoiceNo } = req.body;

    let sql = `UPDATE purchase_orders SET status = ?, updatedAt = CURRENT_TIMESTAMP`;
    const params = [status];

    if (receivedDate) {
        sql += `, receivedDate = ?`;
        params.push(receivedDate);
    }
    if (invoiceNo) {
        sql += `, invoiceNo = ?`;
        params.push(invoiceNo);
    }

    sql += ` WHERE id = ?`;
    params.push(req.params.id);

    db.run(sql, params, function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ message: 'Status updated successfully', changes: this.changes });
    });
});

// Receive items
router.put('/:id/receive', async (req, res) => {
    const { items, receivedDate, invoiceNo } = req.body;
    const orderId = req.params.id;

    const getAsync = (sql, params) => new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
    });

    const allAsync = (sql, params) => new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
    });

    const runAsync = (sql, params) => new Promise((resolve, reject) => {
        db.run(sql, params, function (err) { err ? reject(err) : resolve(this); });
    });

    try {
        // First get order details for vendor info
        const order = await getAsync('SELECT supplierId, supplierName, orderDate FROM purchase_orders WHERE id = ?', [orderId]);
        if (!order) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }

        // Process items sequentially to ensure consistency
        const updateItemSql = `UPDATE purchase_order_items SET receivedQty = ? WHERE id = ?`;

        for (const item of items) {
            const currentItem = await getAsync('SELECT receivedQty, productName, weight, rate, productId, unit, quantity FROM purchase_order_items WHERE id = ?', [item.id]);

            if (currentItem) {
                const prevQty = currentItem.receivedQty || 0;
                const newQty = item.receivedQty || 0;
                const diff = newQty - prevQty;
                const unit = currentItem.unit || 'KG';

                if (diff > 0) {
                    // Add to raw material stock
                    const stockEntry = await getAsync('SELECT id, remainingQty FROM raw_material_stock WHERE purchaseItemId = ?', [item.id]);

                    if (stockEntry) {
                        // Update existing
                        await runAsync(
                            'UPDATE raw_material_stock SET initialQty = initialQty + ?, remainingQty = remainingQty + ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
                            [diff, diff, stockEntry.id]
                        );
                    } else {
                        // Insert new
                        const stockParams = [
                            orderId || 0,
                            item.id || 0,
                            currentItem.productName || 'Unknown Material',
                            currentItem.weight || '',
                            diff || 0,
                            diff || 0,
                            unit,
                            currentItem.rate || 0,
                            order.supplierId || 0,
                            order.supplierName || '',
                            receivedDate || order.orderDate || ''
                        ];

                        await runAsync(
                            `INSERT INTO raw_material_stock 
                            (purchaseOrderId, purchaseItemId, materialName, weight, initialQty, remainingQty, unit, rate, vendorId, vendorName, purchaseDate)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            stockParams
                        );
                    }
                }

                // Update PO item
                await runAsync(updateItemSql, [newQty, item.id]);
            }
        }

        // Update Order Status
        const orderItems = await allAsync(`SELECT quantity, receivedQty FROM purchase_order_items WHERE orderId = ?`, [orderId]);

        const allReceived = orderItems.every(item => item.receivedQty >= item.quantity);
        const partialReceived = orderItems.some(item => item.receivedQty > 0);

        let status = 'pending';
        if (allReceived) status = 'received';
        else if (partialReceived) status = 'partial';

        await runAsync(
            `UPDATE purchase_orders SET status = ?, receivedDate = ?, invoiceNo = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
            [status, receivedDate, invoiceNo, orderId]
        );

        res.json({ message: 'Items received and added to stock', status });

    } catch (err) {
        console.error('Receive error:', err);
        res.status(500).json({ error: 'Failed to receive items: ' + err.message });
    }
});

function updateOrderStatus(orderId, receivedDate, invoiceNo, res) {
    db.all(`SELECT quantity, receivedQty FROM purchase_order_items WHERE orderId = ?`, [orderId], (err, orderItems) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        const allReceived = orderItems.every(item => item.receivedQty >= item.quantity);
        const partialReceived = orderItems.some(item => item.receivedQty > 0);

        let status = 'pending';
        if (allReceived) status = 'received';
        else if (partialReceived) status = 'partial';

        db.run(
            `UPDATE purchase_orders SET status = ?, receivedDate = ?, invoiceNo = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
            [status, receivedDate, invoiceNo, orderId],
            function (err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({ message: 'Items received and added to stock', status });
            }
        );
    });
}

// Delete purchase order (cascade delete raw materials and items)
router.delete('/:id', (req, res) => {
    const orderId = req.params.id;

    // First delete associated raw materials
    db.run('DELETE FROM raw_material_stock WHERE purchaseOrderId = ?', [orderId], (err) => {
        if (err) {
            console.error('Error deleting raw materials:', err.message);
        }

        // Then delete order items
        db.run('DELETE FROM purchase_order_items WHERE orderId = ?', [orderId], (err) => {
            if (err) {
                console.error('Error deleting order items:', err.message);
            }

            // Finally delete the order
            db.run('DELETE FROM purchase_orders WHERE id = ?', [orderId], function (err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({ message: 'Purchase order deleted successfully', changes: this.changes });
            });
        });
    });
});

export default router;
