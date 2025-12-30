import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database ' + dbPath + ': ' + err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS stores (
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
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS products (
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
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS billing (
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
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS sales_orders (
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
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS sales_order_items (
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
        )`);

        // Add weight column if it doesn't exist (for existing databases)
        db.run(`ALTER TABLE sales_order_items ADD COLUMN weight TEXT`, (err) => {
            // Ignore error if column already exists
        });

        db.run(`CREATE TABLE IF NOT EXISTS company_settings (
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
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS store_product_margins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            storeId INTEGER NOT NULL,
            productId INTEGER NOT NULL,
            margin REAL DEFAULT 0,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE,
            FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
            UNIQUE(storeId, productId)
        )`);

        // Staff table with all details
        db.run(`CREATE TABLE IF NOT EXISTS staff (
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
        )`);

        // Daily attendance table
        db.run(`CREATE TABLE IF NOT EXISTS attendance (
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
        )`);

        // Beats table for user-defined beats
        db.run(`CREATE TABLE IF NOT EXISTS beats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            beatName TEXT NOT NULL UNIQUE,
            salesman TEXT,
            areas TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Settings table (single row for app configuration)
        db.run(`CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY CHECK(id = 1),
            companyName TEXT DEFAULT 'ARUNAYA CONSUMABLES PRIVATE LIMITED',
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
        )`);

        // Insert default settings if not exists
        db.run(`INSERT OR IGNORE INTO settings (id) VALUES (1)`);

        // Insert default company settings if not exists (legacy compatibility)
        db.run(`INSERT OR IGNORE INTO company_settings (id, companyName, address, state, stateCode)
                VALUES (1, 'ARUNAYA CONSUMABLES PRIVATE LIMITED', 
                'No. 14, Barnaby Road, Kilpauk, Chennai - 600 010', 
                'Tamil Nadu', '33')`);

        // Suppliers table
        db.run(`CREATE TABLE IF NOT EXISTS suppliers (
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
        )`);

        // Purchase Orders table
        db.run(`CREATE TABLE IF NOT EXISTS purchase_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            orderNo TEXT UNIQUE,
            orderDate TEXT,
            supplierId INTEGER,
            supplierName TEXT,
            expectedDeliveryDate TEXT,
            status TEXT DEFAULT 'pending',
            subtotal REAL DEFAULT 0,
            gstTotal REAL DEFAULT 0,
            grandTotal REAL DEFAULT 0,
            notes TEXT,
            receivedDate TEXT,
            invoiceNo TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (supplierId) REFERENCES suppliers(id)
        )`);

        // Purchase Order Items table
        db.run(`CREATE TABLE IF NOT EXISTS purchase_order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            orderId INTEGER,
            productId INTEGER,
            productName TEXT,
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
        )`);

        // Salary Components table (per staff)
        db.run(`CREATE TABLE IF NOT EXISTS salary_components (
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
        )`);

        // Payroll records table (monthly payroll)
        db.run(`CREATE TABLE IF NOT EXISTS payroll (
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
        )`);

        // Users table for authentication
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'restricted',
            name TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Seed admin user if not exists
        const adminPassword = bcrypt.hashSync('demo123', 10);
        db.run(`INSERT OR IGNORE INTO users (username, password, role, name) VALUES (?, ?, ?, ?)`,
            ['sanjay', adminPassword, 'admin', 'Sanjay (Admin)']);
    });
}

export default db;
