import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

dotenv.config()

const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
})

async function migrate() {
    console.log('🚀 Starting Purchase Module Migration...')

    // 1. Create Vendor table
    console.log('Creating Vendor table...')
    await client.execute(`
        CREATE TABLE IF NOT EXISTS "Vendor" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "name" TEXT NOT NULL,
            "gstNumber" TEXT,
            "address" TEXT,
            "phone" TEXT,
            "email" TEXT,
            "billingCycleDays" INTEGER NOT NULL DEFAULT 0,
            "isActive" INTEGER NOT NULL DEFAULT 1,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `)

    // 2. Create PurchaseOrder table
    console.log('Creating PurchaseOrder table...')
    await client.execute(`
        CREATE TABLE IF NOT EXISTS "PurchaseOrder" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "orderNumber" TEXT UNIQUE NOT NULL,
            "vendorId" INTEGER NOT NULL,
            "status" TEXT NOT NULL DEFAULT 'pending',
            "totalAmount" REAL NOT NULL DEFAULT 0,
            "notes" TEXT,
            "reachedOfficeAt" DATETIME,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id")
        )
    `)

    // 3. Create PurchaseOrderItem table
    console.log('Creating PurchaseOrderItem table...')
    await client.execute(`
        CREATE TABLE IF NOT EXISTS "PurchaseOrderItem" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "purchaseOrderId" INTEGER NOT NULL,
            "rawMaterialId" INTEGER NOT NULL,
            "quantity" REAL NOT NULL DEFAULT 0,
            "price" REAL NOT NULL DEFAULT 0,
            "total" REAL NOT NULL DEFAULT 0,
            FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE,
            FOREIGN KEY ("rawMaterialId") REFERENCES "RawMaterial"("id")
        )
    `)

    // 4. Create VendorBill table
    console.log('Creating VendorBill table...')
    await client.execute(`
        CREATE TABLE IF NOT EXISTS "VendorBill" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "billNumber" TEXT UNIQUE,
            "vendorId" INTEGER NOT NULL,
            "purchaseOrderId" INTEGER UNIQUE NOT NULL,
            "billDate" DATETIME,
            "amount" REAL NOT NULL DEFAULT 0,
            "status" TEXT NOT NULL DEFAULT 'pending_dispatch',
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id"),
            FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id")
        )
    `)

    // 5. Drop Production table (Optional but requested)
    console.log('Dropping Production table...')
    try {
        await client.execute('DROP TABLE IF EXISTS "Production"')
    } catch (e) {
        console.error('Error dropping Production table:', e)
    }

    console.log('✅ Migration complete!')
}

migrate().catch(console.error)
