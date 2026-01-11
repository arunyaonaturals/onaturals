import express from 'express';
import db from '../database.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for logo upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.resolve(__dirname, '../../public/assets');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        cb(null, 'logo' + ext);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb('Error: Images only (jpeg, jpg, png, gif)');
        }
    },
    limits: { fileSize: 2 * 1024 * 1024 } //2MB limit
});

// Get settings
router.get('/', (req, res) => {
    db.get('SELECT * FROM settings WHERE id = 1', [], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(row || {});
    });
});

// Update settings
router.post('/', (req, res) => {
    const {
        companyName,
        address,
        phone,
        email,
        gstin,
        state,
        stateCode,
        bankName,
        accountNo,
        ifscCode,
        branch,
        declaration,
        logoPath
    } = req.body;

    const sql = `UPDATE settings SET 
        companyName = ?, 
        address = ?, 
        phone = ?, 
        email = ?, 
        gstin = ?, 
        state = ?, 
        stateCode = ?, 
        bankName = ?, 
        accountNo = ?, 
        ifscCode = ?, 
        branch = ?, 
        declaration = ?,
        logoPath = ?,
        updatedAt = CURRENT_TIMESTAMP 
        WHERE id = 1`;

    const params = [
        companyName, address, phone, email, gstin, state, stateCode,
        bankName, accountNo, ifscCode, branch, declaration, logoPath
    ];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }

        // Return updated settings
        db.get('SELECT * FROM settings WHERE id = 1', [], (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(row);
        });
    });
});

// Upload logo
router.post('/logo', upload.single('logo'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const logoPath = '/public/assets/' + req.file.filename;

    // Update settings with new logo path
    db.run(
        'UPDATE settings SET logoPath = ? WHERE id = 1',
        [logoPath],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ logoPath });
        }
    );
});

// Master reset - clears all business data except staff and products
router.post('/master-reset', async (req, res) => {
    const tables = [
        'sales_orders',
        'sales_order_items',
        'billing',
        'store_product_margins'
    ];

    const runQuery = (sql) => {
        return new Promise((resolve, reject) => {
            db.run(sql, [], function (err) {
                if (err) {
                    // Table might not exist, that's ok
                    console.warn(`Warning on ${sql}:`, err.message);
                    resolve(); // Continue anyway
                } else {
                    console.log(`Executed: ${sql}`);
                    resolve();
                }
            });
        });
    };

    try {
        // Clear each table
        for (const table of tables) {
            await runQuery(`DELETE FROM ${table}`);
        }

        // Reset product stock quantities to 0
        await runQuery('UPDATE products SET stock = 0');

        console.log('Master reset completed successfully');
        res.json({ message: 'Master reset completed successfully' });
    } catch (error) {
        console.error('Master reset error:', error);
        res.status(500).json({ error: 'Master reset failed: ' + error.message });
    }
});

export default router;
