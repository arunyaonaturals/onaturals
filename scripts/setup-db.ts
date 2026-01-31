// Script to set up database tables in Turso
import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'
import * as bcrypt from 'bcryptjs'

dotenv.config()

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function setupDatabase() {
  console.log('🚀 Setting up database...')
  console.log('Database URL:', process.env.TURSO_DATABASE_URL)
  
  // Drop existing tables
  console.log('Dropping existing tables...')
  const tables = [
    'User', 'Product', 'Category', 'Store', 'Area', 'Order', 'OrderItem',
    'Invoice', 'InvoiceItem', 'Payment', 'RawMaterial', 'Inventory',
    'Production', '_prisma_migrations'
  ]
  
  for (const table of tables) {
    try {
      await client.execute(`DROP TABLE IF EXISTS "${table}"`)
      console.log(`  Dropped table: ${table}`)
    } catch (e) {
      // Ignore errors
    }
  }
  
  // Create User table
  console.log('Creating User table...')
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "User" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "email" TEXT UNIQUE NOT NULL,
      "password" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'sales_captain',
      "isActive" INTEGER NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  // Create admin user
  console.log('Creating admin user...')
  const hashedPassword = await bcrypt.hash('admin123', 10)
  
  try {
    await client.execute({
      sql: `INSERT INTO "User" (email, password, name, role, isActive) VALUES (?, ?, ?, ?, ?)`,
      args: ['admin@arunya.com', hashedPassword, 'Admin', 'admin', 1]
    })
  } catch (e) {
    console.log('Admin user may already exist, skipping...')
  }
  
  console.log('')
  console.log('✅ Database setup complete!')
  console.log('')
  console.log('Admin credentials:')
  console.log('  Email: admin@arunya.com')
  console.log('  Password: admin123')
}

setupDatabase().catch(console.error)
