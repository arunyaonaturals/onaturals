/**
 * Database Migration Script
 * 
 * This script migrates the stores table to the new schema
 * with updated field names and new fields.
 * 
 * Run this with: node migrate_stores.js
 */

import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to database for migration.');
});

function runMigration() {
    db.serialize(() => {
        console.log('Starting migration...');

        // Step 1: Create a new table with the updated schema
        console.log('1. Creating new stores table...');
        db.run(`
            CREATE TABLE IF NOT EXISTS stores_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                serialNumber TEXT,
                storeId TEXT,
                storeName TEXT,
                area TEXT,
                addressLine1 TEXT,
                addressLine2 TEXT,
                pinCode TEXT,
                orderPhone TEXT,
                accountsPhone TEXT,
                email TEXT,
                gstNumber TEXT,
                distributor TEXT,
                salesCaptain TEXT,
                beat TEXT,
                storeCategory TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) {
                console.error('Error creating new table:', err.message);
                process.exit(1);
            }
            console.log('✓ New table created');

            // Step 2: Copy data from old table to new table
            console.log('2. Migrating data...');
            db.run(`
                INSERT INTO stores_new (
                    id, serialNumber, storeName, area, addressLine1, 
                    orderPhone, accountsPhone, gstNumber, distributor, 
                    salesCaptain, beat, createdAt, updatedAt
                )
                SELECT 
                    id, serialNumber, storeName, area, address, 
                    phone1, phone2, gstNumber, distributor, 
                    salesCaptain, beat, createdAt, updatedAt
                FROM stores
            `, (err) => {
                if (err) {
                    console.error('Error migrating data:', err.message);
                    process.exit(1);
                }
                console.log('✓ Data migrated');

                // Step 3: Drop old table
                console.log('3. Dropping old table...');
                db.run('DROP TABLE stores', (err) => {
                    if (err) {
                        console.error('Error dropping old table:', err.message);
                        process.exit(1);
                    }
                    console.log('✓ Old table dropped');

                    // Step 4: Rename new table
                    console.log('4. Renaming new table...');
                    db.run('ALTER TABLE stores_new RENAME TO stores', (err) => {
                        if (err) {
                            console.error('Error renaming table:', err.message);
                            process.exit(1);
                        }
                        console.log('✓ Table renamed');
                        console.log('\n✅ Migration completed successfully!');
                        console.log('\nNotes:');
                        console.log('- Old "address" field data → "addressLine1"');
                        console.log('- Old "phone1" field data → "orderPhone"');
                        console.log('- Old "phone2" field data → "accountsPhone"');
                        console.log('- "contactNumber" field was removed');
                        console.log('- New fields added: storeId, addressLine2, pinCode, email, storeCategory');

                        db.close();
                    });
                });
            });
        });
    });
}

// Check if stores table exists first
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='stores'", (err, row) => {
    if (err) {
        console.error('Error checking table:', err.message);
        process.exit(1);
    }

    if (!row) {
        console.log('Stores table does not exist yet. No migration needed.');
        console.log('The database will create the new schema automatically when the app starts.');
        db.close();
    } else {
        // Check if migration already done by checking for new columns
        db.get("PRAGMA table_info(stores)", (err, row) => {
            if (err) {
                console.error('Error checking columns:', err.message);
                process.exit(1);
            }

            db.all("PRAGMA table_info(stores)", (err, columns) => {
                if (err) {
                    console.error('Error getting columns:', err.message);
                    process.exit(1);
                }

                const hasOrderPhone = columns.some(col => col.name === 'orderPhone');

                if (hasOrderPhone) {
                    console.log('Migration already completed. Database is up to date.');
                    db.close();
                } else {
                    console.log('Old schema detected. Running migration...\n');
                    runMigration();
                }
            });
        });
    }
});
