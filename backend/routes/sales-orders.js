import express from 'express';
import db from '../database.js';

const router = express.Router();

// Get next invoice number
router.get('/next-invoice-no', (req, res) => {
    // Get both last invoice and count for better sequencing
    const sql = `SELECT invoiceNo FROM sales_orders ORDER BY id DESC LIMIT 1`;
    const countSql = `SELECT COUNT(*) as total FROM sales_orders`;

    db.get(countSql, [], (err, countRow) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        const totalInvoices = countRow?.total || 0;

        db.get(sql, [], (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            let nextInvoiceNo;
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1;
            const financialYear = month >= 4 ? year : year - 1;
            const nextYear = financialYear + 1;

            if (!row) {
                // No invoices yet
                nextInvoiceNo = `${financialYear}-${String(nextYear).slice(-2)}/001`;
            } else {
                const lastInvoiceNo = row.invoiceNo;
                const fyMatch = lastInvoiceNo.match(/^(\d{4})-(\d{2})\/(\d+)$/);

                if (fyMatch) {
                    const fyYear = fyMatch[1];
                    const fyNextYear = fyMatch[2];
                    const sequenceNum = parseInt(fyMatch[3], 10);
                    const currentFY = month >= 4 ? year : year - 1;

                    if (parseInt(fyYear, 10) === currentFY) {
                        const nextSeq = String(sequenceNum + 1).padStart(3, '0');
                        nextInvoiceNo = `${fyYear}-${fyNextYear}/${nextSeq}`;
                    } else {
                        nextInvoiceNo = `${currentFY}-${String(nextYear).slice(-2)}/001`;
                    }
                } else {
                    // For non-standard formats, use count + 1 with FY format
                    const nextSeq = String(totalInvoices + 1).padStart(3, '0');
                    nextInvoiceNo = `${financialYear}-${String(nextYear).slice(-2)}/${nextSeq}`;
                }
            }

            res.json({ nextInvoiceNo });
        });
    });
});

// Get all sales orders
router.get('/', (req, res) => {
    const sql = `SELECT * FROM sales_orders ORDER BY orderDate DESC, id DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get single order with items
router.get('/:id', (req, res) => {
    const orderId = req.params.id;

    const orderSql = `SELECT * FROM sales_orders WHERE id = ?`;
    const itemsSql = `SELECT * FROM sales_order_items WHERE orderId = ?`;

    db.get(orderSql, [orderId], (err, order) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!order) {
            res.status(404).json({ error: 'Order not found' });
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

// Create new invoice with items
router.post('/', (req, res) => {
    const {
        invoiceNo, orderDate, storeId, storeName, storeSerialNumber,
        storeAddress, storeGstin, storeState, storeStateCode,
        subtotal, cgstTotal, sgstTotal, roundOff, grandTotal, items
    } = req.body;

    const orderSql = `INSERT INTO sales_orders 
                      (invoiceNo, orderDate, storeId, storeName, storeSerialNumber, 
                       storeAddress, storeGstin, storeState, storeStateCode,
                       subtotal, cgstTotal, sgstTotal, roundOff, grandTotal, status) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')`;

    db.run(orderSql, [
        invoiceNo, orderDate, storeId, storeName, storeSerialNumber,
        storeAddress, storeGstin, storeState, storeStateCode,
        subtotal, cgstTotal, sgstTotal, roundOff, grandTotal
    ], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        const orderId = this.lastID;

        if (!items || items.length === 0) {
            res.json({ id: orderId, invoiceNo, message: 'Invoice created successfully' });
            return;
        }

        // Insert order items
        const itemSql = `INSERT INTO sales_order_items 
                         (orderId, productId, productName, weight, serialNumber, hsnCode, gstRate, 
                          mrp, quantity, unit, shippedQty, billedQty, distributorMargin, 
                          distributorPrice, amount, cgst, sgst, totalAmount) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const stmt = db.prepare(itemSql);

        items.forEach(item => {
            stmt.run([
                orderId,
                item.productId,
                item.productName,
                item.weight || '',
                item.serialNumber,
                item.hsnCode,
                item.gstRate,
                item.mrp,
                item.quantity,
                item.unit || 'NOS',
                item.shippedQty || item.quantity,
                item.billedQty || item.quantity,
                item.distributorMargin,
                item.distributorPrice,
                item.amount,
                item.cgst || 0,
                item.sgst || 0,
                item.totalAmount
            ]);
        });

        stmt.finalize((err) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: orderId, invoiceNo, message: 'Invoice created successfully with items' });
        });
    });
});

// Delete order (cascade deletes items)
router.delete('/:id', (req, res) => {
    const sql = `DELETE FROM sales_orders WHERE id = ?`;
    db.run(sql, [req.params.id], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Order deleted successfully', changes: this.changes });
    });
});

export default router;
