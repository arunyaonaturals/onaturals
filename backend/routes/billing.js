import express from 'express';
import db from '../database.js';

const router = express.Router();

// Get all billing records
router.get('/', (req, res) => {
    const sql = `SELECT * FROM billing ORDER BY billDate DESC, id DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get daily sales summary (group by date and salesCaptain)
// NOTE: This must come BEFORE /:id route to prevent matching "daily" as an ID
router.get('/daily', (req, res) => {
    const sql = `
        SELECT 
            billDate,
            salesCaptain,
            COUNT(*) as billCount,
            SUM(billAmount) as totalBillAmount,
            SUM(paymentAmount) as totalPaymentAmount
        FROM billing
        GROUP BY billDate, salesCaptain
        ORDER BY billDate DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get monthly sales summary (group by month and salesCaptain)
// NOTE: This must come BEFORE /:id route to prevent matching "monthly" as an ID
router.get('/monthly', (req, res) => {
    const sql = `
        SELECT 
            strftime('%Y-%m', billDate) as month,
            salesCaptain,
            COUNT(*) as billCount,
            SUM(billAmount) as totalBillAmount,
            SUM(paymentAmount) as totalPaymentAmount
        FROM billing
        GROUP BY strftime('%Y-%m', billDate), salesCaptain
        ORDER BY month DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get sales by salesperson
// NOTE: This must come BEFORE /:id route to prevent matching "by-salesperson" as an ID
router.get('/by-salesperson', (req, res) => {
    const sql = `
        SELECT 
            salesCaptain,
            COUNT(*) as billCount,
            SUM(billAmount) as totalBillAmount,
            SUM(paymentAmount) as totalPaymentAmount,
            SUM(billAmount) - SUM(paymentAmount) as pendingAmount
        FROM billing
        GROUP BY salesCaptain
        ORDER BY totalBillAmount DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get single billing record by ID
// NOTE: This must come AFTER specific routes (/daily, /monthly, /by-salesperson)
router.get('/:id', (req, res) => {
    const sql = `SELECT * FROM billing WHERE id = ?`;
    db.get(sql, [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Billing record not found' });
            return;
        }
        res.json(row);
    });
});

// Add a single billing record
router.post('/', (req, res) => {
    const { billNo, storeName, salesCaptain, billDate, billAmount, paymentAmount, paymentMode, paymentDate, remarks } = req.body;
    const sql = `INSERT INTO billing (billNo, storeName, salesCaptain, billDate, billAmount, paymentAmount, paymentMode, paymentDate, remarks) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [billNo, storeName, salesCaptain, billDate, billAmount, paymentAmount, paymentMode, paymentDate, remarks];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID, ...req.body });
    });
});

// Batch import billing records
router.post('/batch', (req, res) => {
    const bills = req.body;
    if (!Array.isArray(bills) || bills.length === 0) {
        res.status(400).json({ error: 'Invalid data format. Expected an array of billing records.' });
        return;
    }

    // Helper function to convert dd/mm/yyyy to yyyy-mm-dd
    function convertDDMMYYYY(dateStr) {
        if (!dateStr) return '';

        // Check if already in yyyy-mm-dd format
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return dateStr;
        }

        // Handle dd/mm/yyyy format
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            return `${year}-${month}-${day}`;
        }

        return dateStr;
    }

    const sql = `INSERT INTO billing (billNo, storeName, salesCaptain, billDate, billAmount, paymentAmount, paymentMode, paymentDate, remarks) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        const stmt = db.prepare(sql);

        bills.forEach(bill => {
            stmt.run([
                bill.billNo || bill['BILL NO'] || '',
                bill.storeName || bill['STORE NAME'] || '',
                bill.salesCaptain || bill['Sales Captain'] || '',
                convertDDMMYYYY(bill.billDate || bill['BILL DATE'] || ''),
                parseFloat(bill.billAmount || bill['BILL AMOUNT'] || 0),
                parseFloat(bill.paymentAmount || bill['PAYMENT AMOUNT'] || 0),
                bill.paymentMode || bill['PAYMENT MODE'] || '',
                convertDDMMYYYY(bill.paymentDate || bill['PAYMENT DATE'] || ''),
                bill.remarks || bill['REMARKS'] || ''
            ]);
        });

        stmt.finalize();
        db.run('COMMIT', (err) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ message: `Successfully imported ${bills.length} billing records` });
        });
    });
});

// Update a billing record
router.put('/:id', (req, res) => {
    const { billNo, storeName, salesCaptain, billDate, billAmount, paymentAmount, paymentMode, paymentDate, remarks } = req.body;
    const sql = `UPDATE billing SET billNo = ?, storeName = ?, salesCaptain = ?, billDate = ?, billAmount = ?, 
                 paymentAmount = ?, paymentMode = ?, paymentDate = ?, remarks = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`;
    const params = [billNo, storeName, salesCaptain, billDate, billAmount, paymentAmount, paymentMode, paymentDate, remarks, req.params.id];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ id: req.params.id, ...req.body, changes: this.changes });
    });
});

// Delete a billing record
router.delete('/:id', (req, res) => {
    db.run('DELETE FROM billing WHERE id = ?', req.params.id, function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ message: 'Deleted successfully', changes: this.changes });
    });
});

// Clear all billing records
router.delete('/', (req, res) => {
    db.run('DELETE FROM billing', [], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        db.run('DELETE FROM sqlite_sequence WHERE name="billing"', [], (err) => {
            res.json({ message: 'All billing records cleared', changes: this.changes });
        });
    });
});

export default router;
