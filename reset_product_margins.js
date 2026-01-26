// Script to reset all product margins to 0 (remove the 25% default)
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
    console.log('Connected to database.');
});

// Reset all product margins to 0
db.run('UPDATE products SET distributorMargin = 0', function(err) {
    if (err) {
        console.error('Error updating products:', err.message);
    } else {
        console.log(`✅ Updated ${this.changes} products - set distributorMargin to 0`);
    }
    
    // Show current products with margins
    db.all('SELECT id, productName, distributorMargin FROM products ORDER BY id', [], (err, rows) => {
        if (err) {
            console.error('Error fetching products:', err.message);
        } else {
            console.log('\nCurrent Products (after reset):');
            console.table(rows.slice(0, 10)); // Show first 10
            console.log(`... and ${rows.length - 10} more products` );
        }
        
        db.close((err) => {
            if (err) console.error('Error closing database:', err.message);
            else console.log('\n✅ Done! All product margins have been reset to 0.');
        });
    });
});
