import { createClient } from '@libsql/client';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to local SQLite
const localDb = new sqlite3.Database(path.join(__dirname, 'database.sqlite'));

// Connect to Turso
const turso = createClient({
    url: process.env.TURSO_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

// Tables to migrate (in order to respect foreign key dependencies)
const tables = [
    'stores',
    'products',
    'staff',
    'settings',
    'users',
    'suppliers',
    'beats',
    'billing',
    'sales_orders',
    'sales_order_items',
    'store_product_margins',
    'attendance',
    'salary_components',
    'payroll',
    'purchase_orders',
    'purchase_order_items',
    'raw_material_stock',
    'production_batches',
    'batch_materials'
];

async function getLocalData(table) {
    return new Promise((resolve, reject) => {
        localDb.all(`SELECT * FROM ${table}`, [], (err, rows) => {
            if (err) {
                console.log(`Table ${table} might not exist locally, skipping...`);
                resolve([]);
            } else {
                resolve(rows || []);
            }
        });
    });
}

async function migrateTable(table, rows) {
    if (rows.length === 0) {
        console.log(`⏭️  ${table}: No data to migrate`);
        return;
    }

    const columns = Object.keys(rows[0]);
    const placeholders = columns.map(() => '?').join(', ');

    let successCount = 0;
    let errorCount = 0;

    for (const row of rows) {
        const values = columns.map(col => row[col]);
        const sql = `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

        try {
            await turso.execute({ sql, args: values });
            successCount++;
        } catch (error) {
            errorCount++;
            if (errorCount <= 3) {
                console.error(`   Error inserting into ${table}:`, error.message);
            }
        }
    }

    console.log(`✅ ${table}: Migrated ${successCount}/${rows.length} records${errorCount > 0 ? ` (${errorCount} errors)` : ''}`);
}

async function main() {
    console.log('🚀 Starting migration from local SQLite to Turso...\n');
    console.log(`Turso URL: ${process.env.TURSO_URL}\n`);

    // Test Turso connection
    try {
        await turso.execute('SELECT 1');
        console.log('✅ Connected to Turso\n');
    } catch (error) {
        console.error('❌ Failed to connect to Turso:', error.message);
        process.exit(1);
    }

    // Migrate each table
    for (const table of tables) {
        try {
            const rows = await getLocalData(table);
            await migrateTable(table, rows);
        } catch (error) {
            console.error(`❌ Error migrating ${table}:`, error.message);
        }
    }

    console.log('\n✅ Migration complete!');

    // Close local database
    localDb.close();
    process.exit(0);
}

main().catch(console.error);
