import sqlite3 from 'sqlite3';
import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production' || process.env.TURSO_URL;

let db;

if (isProduction && process.env.TURSO_URL) {
    console.log('Connecting to Turso database...');
    const client = createClient({
        url: process.env.TURSO_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
    });

    // Compatibility layer for sqlite3 API
    db = {
        run(sql, params, callback) {
            if (typeof params === 'function') {
                callback = params;
                params = [];
            }
            client.execute({ sql, args: params })
                .then(result => {
                    // Convert BigInt to Number for compatibility
                    const lastID = result.lastInsertRowid ? Number(result.lastInsertRowid) : undefined;
                    const changes = result.rowsAffected !== undefined ? Number(result.rowsAffected) : 0;

                    if (callback) {
                        callback.call({ lastID, changes }, null);
                    }
                })
                .catch(err => {
                    console.error('Turso db.run error:', {
                        message: err.message,
                        stack: err.stack,
                        sql: sql
                    });
                    if (callback) callback(err);
                });
            return this;
        },
        all(sql, params, callback) {
            if (typeof params === 'function') {
                callback = params;
                params = [];
            }
            client.execute({ sql, args: params })
                .then(result => {
                    if (callback) callback(null, result.rows);
                })
                .catch(err => {
                    console.error('Turso db.all error:', {
                        message: err.message,
                        stack: err.stack,
                        sql: sql
                    });
                    if (callback) callback(err);
                });
            return this;
        },
        get(sql, params, callback) {
            if (typeof params === 'function') {
                callback = params;
                params = [];
            }
            client.execute({ sql, args: params })
                .then(result => {
                    if (callback) callback(null, result.rows[0]);
                })
                .catch(err => {
                    console.error('Turso db.get error:', {
                        message: err.message,
                        stack: err.stack,
                        sql: sql
                    });
                    if (callback) callback(err);
                });
            return this;
        },
        serialize(callback) {
            // libSQL doesn't have serialize, but we can just run the callback
            callback();
            return this;
        },
        prepare(sql) {
            return {
                run(params, callback) {
                    db.run(sql, params, callback);
                },
                finalize() { }
            };
        }
    };

    // Initialize DB schema if needed
    // In production, we might want a separate migration script, 
    // but for now let's call initDb.
    setTimeout(() => initDb(), 1000);

} else {
    console.log('Connecting to local SQLite database...');
    const dbPath = path.resolve(__dirname, '../database.sqlite');
    const sqliteDb = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Error opening database ' + dbPath + ': ' + err.message);
        } else {
            console.log('Connected to the SQLite database.');
            initDb();
        }
    });
    db = sqliteDb;
}

function initDb() {
    console.log('Initializing database schema...');

    const run = (sql) => {
        return new Promise((resolve, reject) => {
            db.run(sql, [], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    };

    const schema = [
        `CREATE TABLE IF NOT EXISTS stores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            serialNumber TEXT,
            storeId TEXT,
            storeName TEXT,
            area TEXT,
            addressLine1 TEXT,
            addressLine2 TEXT,
            pinCode TEXT,
            orderPhone TEXT,
            accountsPhone TEXT,
            email TEXT,
            gstNumber TEXT,
            distributor TEXT,
            salesCaptain TEXT,
            beat TEXT,
            storeCategory TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            serialNumber TEXT,
            productName TEXT,
            weight TEXT,
            mrp REAL,
            hsnCode TEXT,
            gstRate REAL,
            distributorMargin REAL DEFAULT 0,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS billing (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            billNo TEXT,
            storeName TEXT,
            salesCaptain TEXT,
            billDate TEXT,
            billAmount REAL,
            paymentAmount REAL,
            paymentMode TEXT,
            paymentDate TEXT,
            remarks TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS sales_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoiceNo TEXT UNIQUE,
            orderDate TEXT,
            storeId INTEGER,
            storeName TEXT,
            storeSerialNumber TEXT,
            storeAddress TEXT,
            storeGstin TEXT,
            storeState TEXT,
            storeStateCode TEXT,
            subtotal REAL DEFAULT 0,
            cgstTotal REAL DEFAULT 0,
            sgstTotal REAL DEFAULT 0,
            roundOff REAL DEFAULT 0,
            grandTotal REAL DEFAULT 0,
            status TEXT DEFAULT 'completed',
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS sales_order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            orderId INTEGER,
            productId INTEGER,
            productName TEXT,
            weight TEXT,
            serialNumber TEXT,
            hsnCode TEXT,
            gstRate REAL,
            mrp REAL,
            quantity INTEGER,
            unit TEXT DEFAULT 'NOS',
            shippedQty INTEGER,
            billedQty INTEGER,
            distributorMargin REAL,
            distributorPrice REAL,
            amount REAL,
            cgst REAL DEFAULT 0,
            sgst REAL DEFAULT 0,
            totalAmount REAL,
            FOREIGN KEY (orderId) REFERENCES sales_orders(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS company_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            companyName TEXT,
            address TEXT,
            phone TEXT,
            gstin TEXT,
            state TEXT,
            stateCode TEXT,
            email TEXT,
            bankName TEXT,
            accountNo TEXT,
            ifscCode TEXT,
            branch TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS store_product_margins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            storeId INTEGER NOT NULL,
            productId INTEGER NOT NULL,
            margin REAL DEFAULT 0,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE,
            FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
            UNIQUE(storeId, productId)
        )`,
        `CREATE TABLE IF NOT EXISTS staff (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            designation TEXT,
            dob TEXT,
            address TEXT,
            aadharNumber TEXT,
            phoneNumber TEXT,
            email TEXT,
            joiningDate TEXT,
            salary REAL,
            status TEXT DEFAULT 'Active',
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            staffId INTEGER NOT NULL,
            date TEXT NOT NULL,
            status TEXT DEFAULT 'Present',
            checkIn TEXT,
            checkOut TEXT,
            remarks TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (staffId) REFERENCES staff(id) ON DELETE CASCADE,
            UNIQUE(staffId, date)
        )`,
        `CREATE TABLE IF NOT EXISTS beats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            beatName TEXT NOT NULL UNIQUE,
            salesman TEXT,
            areas TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY CHECK(id = 1),
            companyName TEXT DEFAULT 'ARUNYA CONSUMABLES PRIVATE LIMITED',
            address TEXT DEFAULT 'No. 14, Barnaby Road, Kilpauk, Chennai - 600 010',
            phone TEXT DEFAULT '9444741534',
            email TEXT DEFAULT 'arunyaconsumables@gmail.com',
            gstin TEXT DEFAULT '33AAXCA3298E1ZC',
            state TEXT DEFAULT 'Tamil Nadu',
            stateCode TEXT DEFAULT '33',
            logoPath TEXT,
            bankName TEXT,
            accountNo TEXT,
            ifscCode TEXT,
            branch TEXT,
            declaration TEXT DEFAULT 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.',
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `INSERT OR IGNORE INTO settings (id) VALUES (1)`,
        `CREATE TABLE IF NOT EXISTS suppliers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            supplierCode TEXT UNIQUE,
            supplierName TEXT NOT NULL,
            contactPerson TEXT,
            phone TEXT,
            email TEXT,
            address TEXT,
            city TEXT,
            state TEXT DEFAULT 'Tamil Nadu',
            pinCode TEXT,
            gstin TEXT,
            panNumber TEXT,
            bankName TEXT,
            accountNo TEXT,
            ifscCode TEXT,
            paymentTerms TEXT DEFAULT 'Net 30',
            status TEXT DEFAULT 'active',
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS purchase_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            orderNo TEXT UNIQUE,
            orderDate TEXT,
            supplierId INTEGER,
            supplierName TEXT,
            expectedDeliveryDate TEXT,
            status TEXT DEFAULT 'pending',
            paymentStatus TEXT DEFAULT 'unpaid',
            paymentAmount REAL DEFAULT 0,
            paymentDate TEXT,
            subtotal REAL DEFAULT 0,
            gstTotal REAL DEFAULT 0,
            grandTotal REAL DEFAULT 0,
            notes TEXT,
            receivedDate TEXT,
            invoiceNo TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (supplierId) REFERENCES suppliers(id)
        )`,
        `CREATE TABLE IF NOT EXISTS purchase_order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            orderId INTEGER,
            productId INTEGER,
            productName TEXT,
            weight TEXT,
            hsnCode TEXT,
            quantity INTEGER,
            receivedQty INTEGER DEFAULT 0,
            rate REAL,
            amount REAL,
            gstRate REAL,
            gstAmount REAL,
            totalAmount REAL,
            FOREIGN KEY (orderId) REFERENCES purchase_orders(id) ON DELETE CASCADE,
            FOREIGN KEY (productId) REFERENCES products(id)
        )`,
        `CREATE TABLE IF NOT EXISTS salary_components (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            staffId INTEGER UNIQUE,
            basicSalary REAL DEFAULT 0,
            hra REAL DEFAULT 0,
            conveyance REAL DEFAULT 0,
            medicalAllowance REAL DEFAULT 0,
            specialAllowance REAL DEFAULT 0,
            pf REAL DEFAULT 0,
            esi REAL DEFAULT 0,
            professionalTax REAL DEFAULT 0,
            otherDeductions REAL DEFAULT 0,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (staffId) REFERENCES staff(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS payroll (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            staffId INTEGER,
            staffName TEXT,
            designation TEXT,
            month INTEGER,
            year INTEGER,
            workingDays INTEGER DEFAULT 26,
            presentDays INTEGER DEFAULT 0,
            leaveDays INTEGER DEFAULT 0,
            basicSalary REAL DEFAULT 0,
            hra REAL DEFAULT 0,
            conveyance REAL DEFAULT 0,
            medicalAllowance REAL DEFAULT 0,
            specialAllowance REAL DEFAULT 0,
            grossSalary REAL DEFAULT 0,
            pf REAL DEFAULT 0,
            esi REAL DEFAULT 0,
            professionalTax REAL DEFAULT 0,
            tds REAL DEFAULT 0,
            otherDeductions REAL DEFAULT 0,
            totalDeductions REAL DEFAULT 0,
            netSalary REAL DEFAULT 0,
            status TEXT DEFAULT 'pending',
            paidDate TEXT,
            paymentMode TEXT,
            remarks TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (staffId) REFERENCES staff(id),
            UNIQUE(staffId, month, year)
        )`,
        `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'restricted',
            name TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS raw_material_stock (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            purchaseOrderId INTEGER,
            purchaseItemId INTEGER,
            materialName TEXT NOT NULL,
            weight TEXT,
            initialQty REAL DEFAULT 0,
            remainingQty REAL DEFAULT 0,
            unit TEXT DEFAULT 'units',
            rate REAL DEFAULT 0,
            vendorId INTEGER,
            vendorName TEXT,
            purchaseDate TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (purchaseOrderId) REFERENCES purchase_orders(id),
            FOREIGN KEY (vendorId) REFERENCES suppliers(id)
        )`,
        `CREATE TABLE IF NOT EXISTS production_batches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batchNumber TEXT UNIQUE NOT NULL,
            productId INTEGER,
            productName TEXT NOT NULL,
            quantityProduced INTEGER DEFAULT 0,
            productionDate TEXT,
            expiryDate TEXT,
            status TEXT DEFAULT 'active',
            notes TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (productId) REFERENCES products(id)
        )`,
        `CREATE TABLE IF NOT EXISTS batch_materials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batchId INTEGER NOT NULL,
            rawMaterialId INTEGER NOT NULL,
            materialName TEXT,
            quantityUsed REAL DEFAULT 0,
            unit TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (batchId) REFERENCES production_batches(id) ON DELETE CASCADE,
            FOREIGN KEY (rawMaterialId) REFERENCES raw_material_stock(id)
        )`
    ];

    async function processSchema() {
        for (const sql of schema) {
            try {
                await run(sql);
            } catch (err) {
                console.warn('Schema step skipped or failed:', err.message);
            }
        }

        // Seed admin user
        const adminPassword = bcrypt.hashSync('demo123', 10);
        db.run(`INSERT OR IGNORE INTO users (username, password, role, name) VALUES (?, ?, ?, ?)`,
            ['sanjay', adminPassword, 'admin', 'Sanjay (Admin)']);
    }

    processSchema();
}

export default db;
