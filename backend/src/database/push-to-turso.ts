import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const localDbPath = path.resolve(__dirname, '../../data/arunya_erp.db');
const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoToken) {
  console.error('Error: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in environment');
  process.exit(1);
}

const localDb = createClient({ url: `file:${localDbPath}` });
const tursoDb = createClient({ url: tursoUrl, authToken: tursoToken });

const tables = [
  'users',
  'product_categories',
  'products',
  'areas',
  'stores',
  'vendors',
  'raw_materials',
  'product_recipes',
  'orders',
  'order_items',
  'invoices',
  'invoice_items',
  'invoice_payments',
  'dispatches',
  'dispatch_items',
  'product_batches',
  'dispatch_batches',
  'purchase_requests',
  'purchase_request_items',
  'raw_material_receipts',
  'vendor_payments',
  'production_orders',
  'production_materials',
  'packing_orders',
  'attendance',
  'salaries',
  'staff',
  'settings',
];

interface ColumnInfo {
  name: string;
  notnull: number;
  dflt_value: any;
  type: string;
}

async function getTursoColumns(table: string): Promise<ColumnInfo[]> {
  try {
    const result = await tursoDb.execute({
      sql: `PRAGMA table_info(${table})`,
      args: []
    });
    return (result.rows as any[]).map((r: any) => ({
      name: r.name || r[1],
      notnull: r.notnull || r[3] || 0,
      dflt_value: r.dflt_value || r[4],
      type: r.type || r[2] || ''
    }));
  } catch {
    return [];
  }
}

async function pushDataToTurso() {
  console.log('Starting data migration from local DB to Turso...\n');
  console.log(`Local DB: ${localDbPath}`);
  console.log(`Turso DB: ${tursoUrl}\n`);

  try {
    console.log('Clearing existing data in Turso...');
    for (const table of [...tables].reverse()) {
      try {
        await tursoDb.execute({ sql: `DELETE FROM ${table}`, args: [] });
        console.log(`  Cleared ${table}`);
      } catch (error: any) {
        if (!error.message?.includes('no such table')) {
          console.log(`  Skipped ${table} (table doesn't exist or error: ${error.message})`);
        }
      }
    }
    console.log('');

    for (const table of tables) {
      try {
        const tursoCols = await getTursoColumns(table);
        if (tursoCols.length === 0) {
          console.log(`  ${table}: Table doesn't exist in Turso, skipping`);
          continue;
        }

        const localRows = await localDb.execute(`SELECT * FROM ${table}`);
        if (localRows.rows.length === 0) {
          console.log(`  ${table}: No data to migrate`);
          continue;
        }

        const localColumns = localRows.columns;
        const columns = tursoCols.filter(c => localColumns.includes(c.name));
        if (columns.length === 0) {
          console.log(`  ${table}: No matching columns, skipping`);
          continue;
        }

        const columnNames = columns.map(c => c.name).join(', ');
        const placeholders = columns.map(() => '?').join(', ');
        const notNullCols = columns.filter(c => c.notnull === 1).map(c => c.name);

        const getVal = (r: Record<string, unknown>, colName: string): unknown => {
          const raw = r[colName];
          if (raw !== null && raw !== undefined) return raw;
          if (table === 'invoices' && colName === 'invoice_date') {
            const created = r['created_at'];
            if (created) return typeof created === 'string' ? created.split('T')[0].split(' ')[0] : new Date().toISOString().split('T')[0];
            return new Date().toISOString().split('T')[0];
          }
          if (table === 'dispatches' && colName === 'dispatch_number') {
            return `DISP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          }
          if (table === 'invoice_items' && colName === 'total_price') {
            const qty = Number(r['quantity']) || 0;
            const price = Number(r['unit_price']) || 0;
            const discount = Number(r['discount']) || 0;
            return qty * price - discount;
          }
          const colInfo = columns.find(c => c.name === colName);
          if (colInfo?.dflt_value != null) return colInfo.dflt_value;
          return null;
        };

        let inserted = 0;
        let skipped = 0;
        for (const row of localRows.rows) {
          const r = row as Record<string, unknown>;
          // Skip row if any required column has no value (after defaults)
          let hasNullRequired = false;
          for (const col of notNullCols) {
            const resolved = getVal(r, col);
            if (resolved === null || resolved === undefined) {
              hasNullRequired = true;
              break;
            }
          }

          if (hasNullRequired) {
            skipped++;
            continue;
          }

          const values = columns.map(c => {
            const val = getVal(r, c.name);
            // Handle date strings: ensure YYYY-MM-DD
            if (c.type?.toUpperCase().includes('DATE') && val != null) {
              if (typeof val === 'string') return val.split('T')[0].split(' ')[0];
              if (typeof val === 'number') return new Date(val).toISOString().split('T')[0];
              return val;
            }
            return val;
          });

          try {
            await tursoDb.execute({
              sql: `INSERT INTO ${table} (${columnNames}) VALUES (${placeholders})`,
              args: values
            });
            inserted++;
          } catch (error: any) {
            if (error.message?.includes('UNIQUE constraint') || error.message?.includes('duplicate')) {
              skipped++;
            } else if (error.message?.includes('FOREIGN KEY')) {
              skipped++;
            } else {
              console.error(`    Error inserting into ${table}:`, error.message);
              skipped++;
            }
          }
        }

        const colCount = columns.length;
        const tursoCount = tursoCols.length;
        if (colCount < tursoCount || colCount < localColumns.length) {
          console.log(`  ${table}: Migrated ${inserted} rows, skipped ${skipped} (only matching columns: ${colCount})`);
        } else {
          console.log(`  ${table}: Migrated ${inserted} rows, skipped ${skipped}`);
        }
      } catch (error: any) {
        if (error.message?.includes('no such table')) {
          console.log(`  ${table}: Table doesn't exist in local DB, skipping`);
        } else {
          console.error(`  ${table}: Error -`, error.message);
        }
      }
    }

    console.log('\n✅ Data migration completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    localDb.close();
    tursoDb.close();
  }
}

pushDataToTurso();
