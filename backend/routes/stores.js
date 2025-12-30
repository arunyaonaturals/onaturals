import express from 'express';
import db from '../database.js';

const router = express.Router();

// Get all stores
router.get('/', (req, res) => {
    db.all('SELECT * FROM stores ORDER BY id ASC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Add a single store
router.post('/', (req, res) => {
    const { serialNumber, storeId, storeName, area, addressLine1, addressLine2, pinCode, orderPhone, accountsPhone, email, gstNumber, distributor, salesCaptain, beat, storeCategory } = req.body;
    const sql = `INSERT INTO stores (serialNumber, storeId, storeName, area, addressLine1, addressLine2, pinCode, orderPhone, accountsPhone, email, gstNumber, distributor, salesCaptain, beat, storeCategory) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [serialNumber, storeId, storeName, area, addressLine1, addressLine2, pinCode, orderPhone, accountsPhone, email, gstNumber, distributor, salesCaptain, beat, storeCategory];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({
            id: this.lastID,
            ...req.body
        });
    });
});

// Batch add stores (Import)
router.post('/batch', (req, res) => {
    const stores = req.body;
    if (!Array.isArray(stores) || stores.length === 0) {
        res.status(400).json({ error: 'Invalid data format. Expected an array of stores.' });
        return;
    }

    const sql = `INSERT INTO stores (serialNumber, storeId, storeName, area, addressLine1, addressLine2, pinCode, orderPhone, accountsPhone, email, gstNumber, distributor, salesCaptain, beat, storeCategory) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        const stmt = db.prepare(sql);

        stores.forEach(store => {
            stmt.run([
                store.serialNumber || store['S.No.'] || '',
                store.storeId || store['Store ID'] || '',
                store.storeName || store['Store Name'] || '',
                store.area || store['Area'] || '',
                store.addressLine1 || store['Address Line 1'] || store.address || store['Address'] || '',
                store.addressLine2 || store['Address Line 2'] || '',
                store.pinCode || store['Pin Code'] || '',
                store.orderPhone || store['Order Phone No.'] || store.phone1 || store['Phone 1'] || '',
                store.accountsPhone || store['Accounts Phone Number'] || store.phone2 || store['Phone 2'] || '',
                store.email || store['Email Address'] || '',
                store.gstNumber || store['GST Number'] || '',
                store.distributor || store['Distributor'] || '',
                store.salesCaptain || store['Sales Captain'] || '',
                store.beat || store['Beat'] || '',
                store.storeCategory || store['Store Category'] || ''
            ]);
        });

        stmt.finalize();
        db.run('COMMIT', (err) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ message: `Successfully imported ${stores.length} stores` });
        });
    });
});

// Update a store
router.put('/:id', (req, res) => {
    const { storeName, area, addressLine1, addressLine2, pinCode, orderPhone, accountsPhone, email, gstNumber, distributor, salesCaptain, beat, storeId, storeCategory } = req.body;
    const sql = `UPDATE stores SET storeName = ?, area = ?, addressLine1 = ?, addressLine2 = ?, pinCode = ?, orderPhone = ?, accountsPhone = ?, email = ?, gstNumber = ?, distributor = ?, salesCaptain = ?, beat = ?, storeId = ?, storeCategory = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`;
    const params = [storeName, area, addressLine1, addressLine2, pinCode, orderPhone, accountsPhone, email, gstNumber, distributor, salesCaptain, beat, storeId, storeCategory, req.params.id];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({
            id: req.params.id,
            ...req.body,
            changes: this.changes
        });
    });
});

// Delete a store
router.delete('/:id', (req, res) => {
    db.run('DELETE FROM stores WHERE id = ?', req.params.id, function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ message: 'Deleted successfully', changes: this.changes });
    });
});

// Clear all stores
router.delete('/', (req, res) => {
    db.run('DELETE FROM stores', [], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        // Reset auto increment
        db.run('DELETE FROM sqlite_sequence WHERE name="stores"', [], (err) => {
            res.json({ message: 'All stores cleared', changes: this.changes });
        });
    });
});

export default router;
