import express from 'express';
import db from '../database.js';

const router = express.Router();

// Get company settings
router.get('/', (req, res) => {
    const sql = `SELECT * FROM company_settings WHERE id = 1`;
    db.get(sql, [], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(row || {});
    });
});

// Update company settings
router.put('/', (req, res) => {
    const { companyName, address, phone, gstin, state, stateCode, email, bankName, accountNo, ifscCode, branch } = req.body;

    const sql = `UPDATE company_settings 
                 SET companyName = ?, address = ?, phone = ?, gstin = ?, state = ?, stateCode = ?,
                     email = ?, bankName = ?, accountNo = ?, ifscCode = ?, branch = ?,
                     updatedAt = CURRENT_TIMESTAMP
                 WHERE id = 1`;

    db.run(sql, [companyName, address, phone, gstin, state, stateCode, email, bankName, accountNo, ifscCode, branch], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Company settings updated successfully', changes: this.changes });
    });
});

export default router;
