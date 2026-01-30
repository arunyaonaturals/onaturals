import { initDatabase, run, query } from '../config/database';

// HSN codes and GST rates based on product types
const productGstMapping = [
  // Salt products - 0% GST
  { pattern: /himalayan.*salt|rock.*salt|salt.*free.*flow|salt.*crystal/i, hsn_code: '25010020', gst_rate: 0 },

  // Cane Sugar - 5% GST
  { pattern: /cane.*sugar/i, hsn_code: '17011490', gst_rate: 5 },

  // Cane Jaggery - 5% GST
  { pattern: /cane.*jaggery/i, hsn_code: '17011410', gst_rate: 5 },

  // Palm Jaggery (including powder) - 5% GST
  { pattern: /palm.*jaggery/i, hsn_code: '17029010', gst_rate: 5 },

  // Coconut Sugar - 5% GST
  { pattern: /coconut.*sugar/i, hsn_code: '17021110', gst_rate: 5 },

  // Generic Jaggery - 5% GST
  { pattern: /jaggery/i, hsn_code: '17011410', gst_rate: 5 },

  // Generic Sugar - 5% GST
  { pattern: /sugar/i, hsn_code: '17011490', gst_rate: 5 },
];

export const updateProductGst = async () => {
  console.log('Updating product HSN codes and GST rates...\n');

  await initDatabase();

  // Get all products
  const products = await query('SELECT id, name, hsn_code, gst_rate FROM products');

  let updatedCount = 0;
  let skippedCount = 0;

  for (const product of products) {
    let matched = false;

    for (const mapping of productGstMapping) {
      if (mapping.pattern.test(product.name)) {
        // Update the product
        await run(
          'UPDATE products SET hsn_code = ?, gst_rate = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [mapping.hsn_code, mapping.gst_rate, product.id]
        );

        console.log(`Updated: ${product.name}`);
        console.log(`  HSN: ${mapping.hsn_code}, GST: ${mapping.gst_rate}%`);

        updatedCount++;
        matched = true;
        break;
      }
    }

    if (!matched) {
      console.log(`Skipped (no match): ${product.name}`);
      skippedCount++;
    }
  }


  console.log('\n=== Update Summary ===');
  console.log(`Updated: ${updatedCount} products`);
  console.log(`Skipped: ${skippedCount} products (no pattern match)`);
  console.log('\nDone!');
};

// Run if executed directly
if (require.main === module) {
  updateProductGst()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error:', err);
      process.exit(1);
    });
}
