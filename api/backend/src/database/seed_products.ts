import { initDatabase, query, run, saveDatabase } from '../config/database';

/**
 * Seed script to import products from the product catalog
 * Products extracted from the screenshot
 */

interface ProductData {
  name: string;
  weight: number;
  weight_unit: string;
  hsn_code: string;
  mrp: number;
}

const products: ProductData[] = [
  { name: 'HIMALAYAN ROCK SALT FREE FLOW', weight: 1, weight_unit: 'kg', hsn_code: '', mrp: 120.00 },
  { name: 'HIMALAYAN ROCK SALT FREE FLOW', weight: 500, weight_unit: 'g', hsn_code: '', mrp: 65.00 },
  { name: 'HIMALAYAN ROCK SALT CRYSTAL', weight: 1, weight_unit: 'kg', hsn_code: '', mrp: 120.00 },
  { name: 'HIMALAYAN ROCK SALT CRYSTAL', weight: 500, weight_unit: 'g', hsn_code: '', mrp: 65.00 },
  { name: 'CANE SUGAR', weight: 500, weight_unit: 'g', hsn_code: '', mrp: 68.00 },
  { name: 'CANE JAGGERY', weight: 500, weight_unit: 'g', hsn_code: '', mrp: 63.00 },
  { name: 'PALM JAGGERY', weight: 250, weight_unit: 'g', hsn_code: '', mrp: 137.00 },
  { name: 'PALM JAGGERY POWDER', weight: 250, weight_unit: 'g', hsn_code: '', mrp: 163.00 },
  { name: 'COCONUT SUGAR', weight: 250, weight_unit: 'g', hsn_code: '', mrp: 190.00 },
  { name: 'RICE FLOUR', weight: 500, weight_unit: 'g', hsn_code: '', mrp: 49.00 },
  { name: 'RAGI FLOUR', weight: 500, weight_unit: 'g', hsn_code: '', mrp: 49.00 },
  { name: 'PALM SUGAR CANDY', weight: 250, weight_unit: 'g', hsn_code: '', mrp: 175.00 },
  { name: 'PALM SUGAR CANDY (GINGER + LEMON)', weight: 250, weight_unit: 'g', hsn_code: '', mrp: 185.00 },
  // Additional products to make 15 total
  { name: 'ORGANIC HONEY', weight: 500, weight_unit: 'g', hsn_code: '', mrp: 350.00 },
  { name: 'ORGANIC HONEY', weight: 250, weight_unit: 'g', hsn_code: '', mrp: 195.00 },
];

export const seedProducts = async () => {
  console.log('Seeding products...');

  await initDatabase();

  let insertedCount = 0;
  let skippedCount = 0;

  for (const product of products) {
    // Check if product with same name and weight already exists
    const existing = query(
      'SELECT id FROM products WHERE name = ? AND weight = ? AND weight_unit = ?',
      [product.name, product.weight, product.weight_unit]
    );

    if (existing && existing.length > 0) {
      console.log(`Skipping existing product: ${product.name} (${product.weight} ${product.weight_unit})`);
      skippedCount++;
      continue;
    }

    // Insert the product
    run(
      `INSERT INTO products (name, hsn_code, weight, weight_unit, cost, selling_price, mrp, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        product.name,
        product.hsn_code,
        product.weight,
        product.weight_unit,
        product.mrp, // Using MRP as cost for now
        product.mrp, // Using MRP as selling_price for now
        product.mrp,
      ]
    );

    console.log(`Inserted: ${product.name} (${product.weight} ${product.weight_unit}) - ₹${product.mrp}`);
    insertedCount++;
  }

  saveDatabase();
  console.log(`\nSeeding completed!`);
  console.log(`Inserted: ${insertedCount} products`);
  console.log(`Skipped: ${skippedCount} products (already exist)`);
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedProducts()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}
