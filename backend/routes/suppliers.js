import express from 'express';
import db from '../database.js';

const router = express.Router();

// Get all suppliers
router.get('/', (req, res) => {
    const sql = `SELECT * FROM suppliers ORDER BY supplierName ASC`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get single supplier
router.get('/:id', (req, res) => {
    const sql = `SELECT * FROM suppliers WHERE id = ?`;
    db.get(sql, [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Supplier not found' });
            return;
        }
        res.json(row);
    });
});

// Generate next supplier code
router.get('/next/code', (req, res) => {
    const sql = `SELECT supplierCode FROM suppliers ORDER BY id DESC LIMIT 1`;
    db.get(sql, [], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        let nextCode = 'SUP001';
        if (row && row.supplierCode) {
            const match = row.supplierCode.match(/SUP(\d+)/);
            if (match) {
                const num = parseInt(match[1], 10) + 1;
                nextCode = `SUP${String(num).padStart(3, '0')}`;
            }
        }
        res.json({ nextCode });
    });
});

// Create new supplier
router.post('/', (req, res) => {
    const {
        supplierCode, supplierName, contactPerson, phone, email,
        address, city, state, pinCode, gstin, panNumber,
        bankName, accountNo, ifscCode, paymentTerms, status
    } = req.body;

    const sql = `INSERT INTO suppliers 
                 (supplierCode, supplierName, contactPerson, phone, email,
                  address, city, state, pinCode, gstin, panNumber,
                  bankName, accountNo, ifscCode, paymentTerms, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [
        supplierCode, supplierName, contactPerson, phone, email,
        address, city, state || 'Tamil Nadu', pinCode, gstin, panNumber,
        bankName, accountNo, ifscCode, paymentTerms || 'Net 30', status || 'active'
    ], function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID, message: 'Supplier created successfully' });
    });
});

// Update supplier
router.put('/:id', (req, res) => {
    const {
        supplierCode, supplierName, contactPerson, phone, email,
        address, city, state, pinCode, gstin, panNumber,
        bankName, accountNo, ifscCode, paymentTerms, status
    } = req.body;

    const sql = `UPDATE suppliers SET 
                 supplierCode = ?, supplierName = ?, contactPerson = ?, phone = ?, email = ?,
                 address = ?, city = ?, state = ?, pinCode = ?, gstin = ?, panNumber = ?,
                 bankName = ?, accountNo = ?, ifscCode = ?, paymentTerms = ?, status = ?,
                 updatedAt = CURRENT_TIMESTAMP
                 WHERE id = ?`;

    db.run(sql, [
        supplierCode, supplierName, contactPerson, phone, email,
        address, city, state, pinCode, gstin, panNumber,
        bankName, accountNo, ifscCode, paymentTerms, status,
        req.params.id
    ], function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ message: 'Supplier updated successfully', changes: this.changes });
    });
});

// Delete supplier
router.delete('/:id', (req, res) => {
    const sql = `DELETE FROM suppliers WHERE id = ?`;
    db.run(sql, [req.params.id], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Supplier deleted successfully', changes: this.changes });
    });
});

export default router;
