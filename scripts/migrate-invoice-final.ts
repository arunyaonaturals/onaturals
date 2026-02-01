import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
})

async function migrate() {
    console.log('🚀 Comprehensive Migration for Invoice Tables...')

    // Potential missing columns for Invoice
    const invoiceCols = [
        { name: 'discountPercent', type: 'REAL' },
        { name: 'discountAmount', type: 'REAL DEFAULT 0' }
    ]

    // Potential missing columns for InvoiceItem
    const invoiceItemCols = [
        { name: 'discountPercent', type: 'REAL DEFAULT 0' },
        { name: 'discountAmount', type: 'REAL DEFAULT 0' }
    ]

    console.log('\nChecking Invoice table...')
    for (const col of invoiceCols) {
        try {
            await client.execute(`ALTER TABLE "Invoice" ADD COLUMN "${col.name}" ${col.type}`)
            console.log(`  ✅ [Invoice] Added: ${col.name}`)
        } catch (e: any) {
            if (e.message.includes('duplicate column name')) {
                console.log(`  ℹ️  [Invoice] Column "${col.name}" already exists`)
            } else {
                console.error(`  ❌ [Invoice] Error adding "${col.name}":`, e.message)
            }
        }
    }

    console.log('\nChecking InvoiceItem table...')
    for (const col of invoiceItemCols) {
        try {
            await client.execute(`ALTER TABLE "InvoiceItem" ADD COLUMN "${col.name}" ${col.type}`)
            console.log(`  ✅ [InvoiceItem] Added: ${col.name}`)
        } catch (e: any) {
            if (e.message.includes('duplicate column name')) {
                console.log(`  ℹ️  [InvoiceItem] Column "${col.name}" already exists`)
            } else {
                console.error(`  ❌ [InvoiceItem] Error adding "${col.name}":`, e.message)
            }
        }
    }

    console.log('\n✅ Database synchronization complete!')
}

migrate().catch(console.error)
