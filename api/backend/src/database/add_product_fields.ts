import { initDatabase, exec, saveDatabase } from '../config/database';

/**
 * Migration script to add mrp column to existing products table
 * Run this script to update existing databases with the new field
 */
export const addProductFields = async () => {
  console.log('Running product fields migration...');

  await initDatabase();

  // Add mrp column to products table if it doesn't exist
  try {
    exec(`ALTER TABLE products ADD COLUMN mrp REAL`);
    console.log('Added mrp column to products table');
  } catch (error: any) {
    // Column might already exist
    if (error.message?.includes('duplicate column name')) {
      console.log('mrp column already exists, skipping...');
    } else {
      console.error('Error adding mrp column:', error.message);
    }
  }

  saveDatabase();
  console.log('Product fields migration completed!');
};

// Run migration if this file is executed directly
if (require.main === module) {
  addProductFields()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
