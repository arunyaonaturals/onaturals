/**
 * Import stores from an Excel file directly into Turso.
 * Run: npm run db:import-stores
 * Or:  npx tsx scripts/import-stores-from-xlsx.ts [path/to/stores.xlsx]
 * Or:  npx tsx scripts/import-stores-from-xlsx.ts --clear [path]  (clear all stores and related data first, then import)
 *
 * Uses TURSO_DATABASE_URL and TURSO_AUTH_TOKEN from .env.
 * Preserves ID from sheet when present; leaves blank cells as NULL.
 */
import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import * as XLSX from 'xlsx'

dotenv.config()

const DEFAULT_PATH = path.join(process.env.HOME || process.env.USERPROFILE || '', 'Desktop', 'stores.xlsx')

// Map sheet header names (lowercase, no extra spaces) to Store table column names
const HEADER_TO_FIELD: Record<string, string> = {
  id: 'id',
  name: 'name',
  'store name': 'name',
  storename: 'name',
  store: 'name',
  'outlet name': 'name',
  outletname: 'name',
  outlet: 'name',
  'name of store': 'name',
  'customer name': 'name',
  customer: 'name',
  address: 'address',
  'address line': 'address',
  'address line 1': 'address',
  location: 'address',
  'store address': 'address',
  'full address': 'address',
  city: 'city',
  state: 'state',
  pincode: 'pincode',
  'pin code': 'pincode',
  pin: 'pincode',
  'postal code': 'pincode',
  phone: 'phone',
  'phone number': 'phone',
  'phone no': 'phone',
  'phone no.': 'phone',
  'contact no': 'phone',
  'contact no.': 'phone',
  'contact number': 'phone',
  mobile: 'phone',
  tel: 'phone',
  email: 'email',
  gst: 'gstNumber',
  'gst number': 'gstNumber',
  gstnumber: 'gstNumber',
  'gst no': 'gstNumber',
  'gst no.': 'gstNumber',
  contactperson: 'contactPerson',
  'contact person': 'contactPerson',
  contact: 'contactPerson',
  'contact name': 'contactPerson',
  area: 'areaId',
  areaid: 'areaId',
  'area id': 'areaId',
  'area name': 'areaName',
  areaname: 'areaName',
}

// Columns we never import (e.g. draft sheet has Sales Captain names — not stored)
const IGNORED_HEADERS = new Set([
  'sales captain', 'sales captain name', 'salescaptain', 'sales captain name',
])

function normalizeHeader(h: string): string {
  return String(h).toLowerCase().replace(/\s+/g, ' ').trim()
}

function mapRow(row: Record<string, unknown>): Record<string, string | number | null> {
  const out: Record<string, string | number | null> = {}
  for (const [key, value] of Object.entries(row)) {
    const norm = normalizeHeader(key)
    if (IGNORED_HEADERS.has(norm)) continue
    const field = HEADER_TO_FIELD[norm]
    if (!field) continue
    if (value === undefined || value === null || value === '') {
      out[field] = null
    } else if (field === 'id' || field === 'areaId') {
      const n = Number(value)
      out[field] = Number.isNaN(n) ? null : n
    } else {
      out[field] = String(value).trim() || null
    }
  }
  return out
}

function emptyToNull(val: string | number | null): string | number | null {
  if (val === null || val === undefined) return null
  if (typeof val === 'string' && val.trim() === '') return null
  return val
}

async function main() {
  const args = process.argv.slice(2)
  const clearFirst = args.includes('--clear')
  const filePath = args.find((a) => !a.startsWith('--')) || process.env.STORES_XLSX_PATH || DEFAULT_PATH

  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath)
    console.error('Usage: npx tsx scripts/import-stores-from-xlsx.ts [path/to/stores.xlsx]')
    console.error('       npx tsx scripts/import-stores-from-xlsx.ts --clear [path]  (clear stores + orders/invoices first)')
    process.exit(1)
  }

  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN
  if (!url) {
    console.error('TURSO_DATABASE_URL is not set in .env')
    process.exit(1)
  }

  const client = createClient({ url, authToken })

  if (clearFirst) {
    console.log('Clearing stores and related data (orders, invoices, payments)...')
    await client.execute({ sql: 'DELETE FROM "Payment"' })
    await client.execute({ sql: 'DELETE FROM "InvoiceItem"' })
    await client.execute({ sql: 'DELETE FROM "Invoice"' })
    await client.execute({ sql: 'DELETE FROM "OrderItem"' })
    await client.execute({ sql: 'DELETE FROM "Order"' })
    await client.execute({ sql: 'DELETE FROM "Store"' })
    console.log('Cleared.')
  }

  const workbook = XLSX.readFile(filePath, { type: 'file' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    console.error('No sheet found in', filePath)
    process.exit(1)
  }
  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[]
  if (rows.length === 0) {
    console.log('No data rows in sheet.')
    return
  }

  // Log first row keys so user can see what columns we're reading
  const firstRow = rows[0]
  const sheetHeaders = Object.keys(firstRow).filter((k) => k != null && String(k).trim() !== '')
  console.log('Sheet columns detected:', sheetHeaders.length ? sheetHeaders.join(', ') : '(none)')

  // Resolve area name to areaId (Excel may have "Area" as text)
  const areaRows = await client.execute({ sql: 'SELECT id, name FROM "Area"' })
  const areaNameToId: Record<string, number> = {}
  for (const r of areaRows.rows as { id: number; name: string }[]) {
    const key = String(r.name || '').trim().toLowerCase()
    if (key) areaNameToId[key] = r.id
  }

  const now = new Date().toISOString()
  let inserted = 0
  let skipped = 0

  for (const row of rows) {
    const m = mapRow(row)
    // Use mapped name, or fallback: first non-empty value that looks like a name (not purely numeric)
    let name = emptyToNull(m.name)
    if (name === null || name === '') {
      const str = Object.values(row).find((v) => {
        if (v == null) return false
        const s = String(v).trim()
        if (s === '') return false
        if (/^\d+$/.test(s)) return false
        return true
      }) as string | undefined
      name = str != null ? String(str).trim() : null
    }
    if (name === null || name === '') {
      skipped++
      continue
    }
    const id = m.id != null && typeof m.id === 'number' ? m.id : null
    const address = emptyToNull(m.address)
    const city = emptyToNull(m.city)
    const state = emptyToNull(m.state)
    const pincode = emptyToNull(m.pincode)
    const phone = emptyToNull(m.phone)
    const email = emptyToNull(m.email)
    const gstNumber = emptyToNull(m.gstNumber)
    const contactPerson = emptyToNull(m.contactPerson)
    let areaId: number | null = m.areaId != null && typeof m.areaId === 'number' ? m.areaId : null
    if (areaId == null && m.areaName != null && String(m.areaName).trim() !== '') {
      const areaKey = String(m.areaName).trim().toLowerCase()
      areaId = areaNameToId[areaKey] ?? null
    }

    try {
      if (id != null && Number.isInteger(id) && id > 0) {
        await client.execute({
          sql: `INSERT OR IGNORE INTO "Store" ("id", "name", "address", "city", "state", "pincode", "phone", "email", "gstNumber", "contactPerson", "areaId", "isActive", "createdAt", "updatedAt")
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
          args: [
            id,
            name,
            address ?? null,
            city ?? null,
            state ?? null,
            pincode ?? null,
            phone ?? null,
            email ?? null,
            gstNumber ?? null,
            contactPerson ?? null,
            areaId ?? null,
            now,
            now,
          ],
        })
      } else {
        await client.execute({
          sql: `INSERT INTO "Store" ("name", "address", "city", "state", "pincode", "phone", "email", "gstNumber", "contactPerson", "areaId", "isActive", "createdAt", "updatedAt")
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
          args: [
            name,
            address ?? null,
            city ?? null,
            state ?? null,
            pincode ?? null,
            phone ?? null,
            email ?? null,
            gstNumber ?? null,
            contactPerson ?? null,
            areaId ?? null,
            now,
            now,
          ],
        })
      }
      inserted++
    } catch (e) {
      console.warn('Row skipped:', name, e)
      skipped++
    }
  }

  console.log('Done. Inserted:', inserted, 'Skipped:', skipped)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
