import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database ' + dbPath + ': ' + err.message);
        process.exit(1);
    }
    console.log('Connected to the SQLite database.');
});

db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // 1. Update default margin for all products
    db.run('UPDATE products SET distributorMargin = 25', function (err) {
        if (err) {
            console.error('Error updating products:', err.message);
            db.run('ROLLBACK');
            return;
        }
        console.log(`Updated ${this.changes} products to 25% margin.`);

        // 2. Clear store-specific overrides
        db.run('DELETE FROM store_product_margins', function (err) {
            if (err) {
                console.error('Error clearing store margins:', err.message);
                db.run('ROLLBACK');
                return;
            }
            console.log(`Deleted ${this.changes} store-specific margin overrides.`);

            db.run('COMMIT', (err) => {
                if (err) {
                    console.error('Error committing transaction:', err.message);
                    return;
                }
                console.log('Successfully completed all updates.');
                db.close();
            });
        });
    });
});
