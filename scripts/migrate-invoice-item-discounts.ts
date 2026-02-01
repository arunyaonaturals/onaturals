import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

dotenv.config()

const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
})

async function migrate() {
    console.log('🚀 Migrating InvoiceItem table...')

    try {
        await client.execute('ALTER TABLE "InvoiceItem" ADD COLUMN "discountPercent" REAL DEFAULT 0')
        console.log('  Added: discountPercent')
    } catch (e: any) {
        if (e.message.includes('duplicate column name')) {
            console.log('  Column discountPercent already exists')
        } else {
            console.error('  Error adding discountPercent:', e.message)
        }
    }

    try {
        await client.execute('ALTER TABLE "InvoiceItem" ADD COLUMN "discountAmount" REAL DEFAULT 0')
        console.log('  Added: discountAmount')
    } catch (e: any) {
        if (e.message.includes('duplicate column name')) {
            console.log('  Column discountAmount already exists')
        } else {
            console.error('  Error adding discountAmount:', e.message)
        }
    }

    console.log('\n✅ Migration complete!')
}

migrate().catch(console.error)
