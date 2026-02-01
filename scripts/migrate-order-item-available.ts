/**
 * One-off migration: add availableQuantity to OrderItem if missing.
 * Run: npx tsx scripts/migrate-order-item-available.ts
 * Safe to run multiple times (ignores if column already exists).
 */
import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

dotenv.config()

async function main() {
  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN
  if (!url) {
    console.error('TURSO_DATABASE_URL is not set in .env')
    process.exit(1)
  }
  const client = createClient({ url, authToken })
  try {
    await client.execute('ALTER TABLE "OrderItem" ADD COLUMN "availableQuantity" INTEGER')
    console.log('Added OrderItem.availableQuantity column.')
  } catch (e: unknown) {
    const msg = String((e as Error)?.message ?? e)
    if (msg.includes('duplicate column') || msg.includes('already exists')) {
      console.log('Column availableQuantity already exists, skipping.')
    } else {
      throw e
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
