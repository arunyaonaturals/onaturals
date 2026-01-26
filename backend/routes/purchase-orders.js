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
    const sql = `SELECT po.*, s.supplierName 
                 FROM purchase_orders po 
                 LEFT JOIN suppliers s ON po.supplierId = s.id 
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

    const orderSql = `INSERT INTO purchase_orders 
                      (orderNo, orderDate, supplierId, supplierName, expectedDeliveryDate,
                       subtotal, gstTotal, grandTotal, notes, status, paymentStatus, paymentAmount, paymentDate)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`;

    db.run(orderSql, [
        orderNo, orderDate, supplierId, supplierName, expectedDeliveryDate,
        subtotal, gstTotal, grandTotal, notes,
        paymentStatus || 'unpaid', paymentAmount || 0, paymentDate || null
    ], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        const orderId = this.lastID;

        if (!items || items.length === 0) {
            res.json({ id: orderId, orderNo, message: 'Purchase order created successfully' });
            return;
        }

        // Insert order items
        const itemSql = `INSERT INTO purchase_order_items 
                         (orderId, productId, productName, weight, hsnCode, quantity, rate, amount, gstRate, gstAmount, totalAmount)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const stmt = db.prepare(itemSql);

        items.forEach(item => {
            stmt.run([
                orderId,
                item.productId || null,
                item.productName,
                item.weight || '',
                item.hsnCode || '',
                item.quantity,
                item.rate,
                item.amount,
                item.gstRate,
                item.gstAmount,
                item.totalAmount
            ]);
        });

        stmt.finalize((err) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: orderId, orderNo, message: 'Purchase order created successfully with items' });
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
router.put('/:id/receive', (req, res) => {
    const { items, receivedDate, invoiceNo } = req.body;
    const orderId = req.params.id;

    // Update each item's received quantity
    const updateItemSql = `UPDATE purchase_order_items SET receivedQty = ? WHERE id = ?`;

    items.forEach(item => {
        db.run(updateItemSql, [item.receivedQty, item.id]);
    });

    // Check if all items received
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
                res.json({ message: 'Items received successfully', status });
            }
        );
    });
});

// Delete purchase order
router.delete('/:id', (req, res) => {
    const sql = `DELETE FROM purchase_orders WHERE id = ?`;
    db.run(sql, [req.params.id], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Purchase order deleted successfully', changes: this.changes });
    });
});

export default router;
