import { createClient } from '@libsql/client'

const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
})

async function main() {
    console.log('Adding columns to Product table...')
    try {
        await client.execute('ALTER TABLE Product ADD COLUMN currentStock REAL DEFAULT 0')
        console.log('Added currentStock column.')
    } catch (e: any) {
        if (e.message.includes('duplicate column name')) {
            console.log('currentStock column already exists.')
        } else {
            console.error('Error adding currentStock:', e)
        }
    }

    try {
        await client.execute('ALTER TABLE Product ADD COLUMN minStock REAL DEFAULT 0')
        console.log('Added minStock column.')
    } catch (e: any) {
        if (e.message.includes('duplicate column name')) {
            console.log('minStock column already exists.')
        } else {
            console.error('Error adding minStock:', e)
        }
    }
}

main().catch(console.error)
