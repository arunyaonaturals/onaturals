import { initDatabase, query, run, saveDatabase } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Seed script to import stores from the Excel-exported JSON data
 */

interface StoreData {
  name: string;
  branch: string;
  gst_number: string;
  address: string;
  phone: string;
  sales_captain: string;
}

export const seedStoresFromExcel = async () => {
  console.log('Seeding stores from Excel data...');

  await initDatabase();

  // First, clear existing stores and reset auto-increment
  console.log('Clearing existing stores...');
  run('DELETE FROM stores');
  
  // Reset the auto-increment counter by deleting from sqlite_sequence
  try {
    run("DELETE FROM sqlite_sequence WHERE name='stores'");
  } catch (e) {
    // sqlite_sequence might not exist if no inserts happened yet
  }

  // Read the JSON data
  const jsonPath = path.join('/Users/sanjaydakshinamoorthy/Desktop', 'stores_data.json');
  const storesData: StoreData[] = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  console.log(`Found ${storesData.length} stores to import`);

  let storeId = 1; // Start IDs from 1

  for (const store of storesData) {
    // Combine store name with branch for unique identification
    const storeName = store.branch && store.branch !== '-' 
      ? `${store.name} - ${store.branch}`
      : store.name;

    // Clean GST number - if 'UR' (Unregistered), set to null
    const gstNumber = store.gst_number === 'UR' || store.gst_number === '' 
      ? null 
      : store.gst_number;

    // Extract city from branch or address
    const city = store.branch && store.branch !== '-' ? store.branch : 'Chennai';

    // Insert the store with explicit ID (without sales_captain)
    run(
      `INSERT INTO stores (id, name, address, city, state, phone, gst_number, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        storeId,
        storeName,
        store.address || '',
        city,
        'Tamil Nadu',
        store.phone || null,
        gstNumber,
      ]
    );

    storeId++;
    if ((storeId - 1) % 50 === 0) {
      console.log(`Imported ${storeId - 1} stores...`);
    }
  }

  saveDatabase();
  console.log(`\nSeeding completed!`);
  console.log(`Total stores imported: ${storeId - 1}`);
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedStoresFromExcel()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}
