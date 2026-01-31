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
  
  // Drop existing tables (in reverse order of dependencies)
  console.log('\nDropping existing tables...')
  const tables = [
    'OrderItem', 'Order', 'InvoiceItem', 'Invoice', 'Payment',
    'Product', 'Category', 'Store', 'Area', 'User',
    'RawMaterial', 'Inventory', 'Production', '_prisma_migrations'
  ]
  
  for (const table of tables) {
    try {
      await client.execute(`DROP TABLE IF EXISTS "${table}"`)
      console.log(`  Dropped: ${table}`)
    } catch (e) {
      // Ignore errors
    }
  }
  
  // ==================== CREATE TABLES ====================
  
  // User table
  console.log('\nCreating tables...')
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
  console.log('  Created: User')
  
  // Category table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "Category" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "name" TEXT UNIQUE NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  console.log('  Created: Category')
  
  // Product table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "Product" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL,
      "sku" TEXT UNIQUE,
      "categoryId" INTEGER,
      "weight" REAL,
      "weightUnit" TEXT DEFAULT 'g',
      "mrp" REAL NOT NULL DEFAULT 0,
      "gstPercent" REAL NOT NULL DEFAULT 18,
      "hsnCode" TEXT,
      "isActive" INTEGER NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
    )
  `)
  console.log('  Created: Product')
  
  // ==================== SEED DATA ====================
  console.log('\nSeeding data...')
  
  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10)
  try {
    await client.execute({
      sql: `INSERT INTO "User" (email, password, name, role, isActive) VALUES (?, ?, ?, ?, ?)`,
      args: ['admin@arunya.com', hashedPassword, 'Admin', 'admin', 1]
    })
    console.log('  Created admin user')
  } catch (e) {
    console.log('  Admin user may already exist')
  }
  
  // Create sample categories
  const categories = ['Hair Care', 'Skin Care', 'Body Care', 'Face Care', 'Oils']
  for (const cat of categories) {
    try {
      await client.execute({
        sql: `INSERT INTO "Category" (name) VALUES (?)`,
        args: [cat]
      })
    } catch (e) {
      // Ignore duplicates
    }
  }
  console.log('  Created sample categories')
  
  console.log('\n✅ Database setup complete!')
  console.log('\nAdmin credentials:')
  console.log('  Email: admin@arunya.com')
  console.log('  Password: admin123')
}

setupDatabase().catch(console.error)
