import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
})

async function migrate() {
    console.log('🚀 Migrating Invoice and InvoiceItem tables...')

    // Columns to add to Invoice
    const invoiceCols = [
        { name: 'discountPercent', type: 'REAL' }
    ]

    // Columns to add to InvoiceItem
    const invoiceItemCols = [
        { name: 'discountPercent', type: 'REAL' },
        { name: 'discountAmount', type: 'REAL' }
    ]

    for (const col of invoiceCols) {
        try {
            await client.execute(`ALTER TABLE "Invoice" ADD COLUMN "${col.name}" ${col.type}`)
            console.log(`  [Invoice] Added: ${col.name}`)
        } catch (e: any) {
            if (e.message.includes('duplicate column name')) {
                console.log(`  [Invoice] Column ${col.name} already exists`)
            } else {
                console.error(`  [Invoice] Error adding ${col.name}:`, e.message)
            }
        }
    }

    for (const col of invoiceItemCols) {
        try {
            await client.execute(`ALTER TABLE "InvoiceItem" ADD COLUMN "${col.name}" ${col.type}`)
            console.log(`  [InvoiceItem] Added: ${col.name}`)
        } catch (e: any) {
            if (e.message.includes('duplicate column name')) {
                console.log(`  [InvoiceItem] Column ${col.name} already exists`)
            } else {
                console.error(`  [InvoiceItem] Error adding ${col.name}:`, e.message)
            }
        }
    }

    console.log('\n✅ Migration complete!')
}

migrate().catch(console.error)
