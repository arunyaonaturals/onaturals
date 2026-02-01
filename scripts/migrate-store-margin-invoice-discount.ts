/**
 * One-off migration: add Store.marginDiscountPercent and Invoice.discountPercent, discountAmount.
 * Run: npx tsx scripts/migrate-store-margin-invoice-discount.ts
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
    await client.execute('ALTER TABLE "Store" ADD COLUMN "marginDiscountPercent" REAL')
    console.log('Added Store.marginDiscountPercent')
  } catch (e: unknown) {
    const msg = String((e as Error)?.message ?? e)
    if (msg.includes('duplicate column') || msg.includes('already exists')) {
      console.log('Store.marginDiscountPercent already exists')
    } else throw e
  }

  try {
    await client.execute('ALTER TABLE "Invoice" ADD COLUMN "discountPercent" REAL')
    console.log('Added Invoice.discountPercent')
  } catch (e: unknown) {
    const msg = String((e as Error)?.message ?? e)
    if (msg.includes('duplicate column') || msg.includes('already exists')) {
      console.log('Invoice.discountPercent already exists')
    } else throw e
  }

  try {
    await client.execute('ALTER TABLE "Invoice" ADD COLUMN "discountAmount" REAL NOT NULL DEFAULT 0')
    console.log('Added Invoice.discountAmount')
  } catch (e: unknown) {
    const msg = String((e as Error)?.message ?? e)
    if (msg.includes('duplicate column') || msg.includes('already exists')) {
      console.log('Invoice.discountAmount already exists')
    } else throw e
  }

  console.log('Migration done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
