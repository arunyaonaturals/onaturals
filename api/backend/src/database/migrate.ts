import { initDatabase, exec, run, queryOne, query } from '../config/database';
import bcrypt from 'bcryptjs';

export const runMigrations = async () => {
  console.log('Running database migrations...');

  await initDatabase();

  // Users table (username-based login)
  await exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'staff',
      phone TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Staff table (employee/staff records)
  await exec(`
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT,
      city TEXT,
      state TEXT,
      pincode TEXT,
      aadhar_number TEXT,
      emergency_contact_name TEXT,
      emergency_contact_phone TEXT,
      photo_url TEXT,
      role TEXT NOT NULL,
      date_of_joining DATE,
      salary REAL,
      bank_account_number TEXT,
      bank_name TEXT,
      ifsc_code TEXT,
      user_id INTEGER,
      is_active INTEGER DEFAULT 1,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Product Categories
  await exec(`
    CREATE TABLE IF NOT EXISTS product_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Products table
  await exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      hsn_code TEXT,
      weight REAL,
      weight_unit TEXT DEFAULT 'g',
      cost REAL DEFAULT 0,
      selling_price REAL DEFAULT 0,
      mrp REAL DEFAULT 0,
      gst_rate REAL DEFAULT 0,
      category_id INTEGER,
      description TEXT,
      stock_quantity INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES product_categories(id)
    )
  `);

  // Areas table
  await exec(`
    CREATE TABLE IF NOT EXISTS areas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      sales_captain_id INTEGER,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sales_captain_id) REFERENCES users(id)
    )
  `);

  // Stores table
  await exec(`
    CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      city TEXT,
      state TEXT,
      pincode TEXT,
      phone TEXT,
      email TEXT,
      gst_number TEXT,
      contact_person TEXT,
      area_id INTEGER,
      is_active INTEGER DEFAULT 1,
      classification TEXT DEFAULT 'medium',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (area_id) REFERENCES areas(id)
    )
  `);

  // Indexes for performance
  await exec(`CREATE INDEX IF NOT EXISTS idx_stores_area_id ON stores(area_id)`);
  await exec(`CREATE INDEX IF NOT EXISTS idx_areas_sales_captain_id ON areas(sales_captain_id)`);
  await exec(`CREATE INDEX IF NOT EXISTS idx_stores_is_active ON stores(is_active)`);

  // Store Product Margins
  await exec(`
    CREATE TABLE IF NOT EXISTS store_product_margins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      margin_percentage REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(store_id, product_id),
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);

  // Orders table
  await exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      store_id INTEGER NOT NULL,
      status TEXT DEFAULT 'draft',
      total_amount REAL DEFAULT 0,
      notes TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (store_id) REFERENCES stores(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Order Items table
  await exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      store_stock INTEGER DEFAULT 0,
      unit_price REAL DEFAULT 0,
      total_price REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // Invoices table
  await exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      order_id INTEGER,
      store_id INTEGER NOT NULL,
      invoice_date DATE NOT NULL,
      due_date DATE,
      subtotal REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      cgst REAL DEFAULT 0,
      sgst REAL DEFAULT 0,
      igst REAL DEFAULT 0,
      total_gst REAL DEFAULT 0,
      round_off REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      payment_status TEXT DEFAULT 'pending',
      notes TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (store_id) REFERENCES stores(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Invoice Items table
  await exec(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      discount REAL DEFAULT 0,
      gst_rate REAL DEFAULT 0,
      gst_amount REAL DEFAULT 0,
      total_price REAL NOT NULL,
      hsn_code TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // Invoice Payments table
  await exec(`
    CREATE TABLE IF NOT EXISTS invoice_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      payment_date DATE NOT NULL,
      payment_method TEXT DEFAULT 'cash',
      reference_number TEXT,
      collected_by INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
      FOREIGN KEY (collected_by) REFERENCES users(id)
    )
  `);

  // Dispatches table (packing_order_id without FK - packing_orders is created later)
  await exec(`
    CREATE TABLE IF NOT EXISTS dispatches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dispatch_number TEXT UNIQUE NOT NULL,
      invoice_id INTEGER NOT NULL,
      dispatch_date DATE NOT NULL,
      status TEXT DEFAULT 'pending',
      delivery_address TEXT,
      notes TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Add columns to dispatches if missing (for new CREATE and for existing Turso DBs)
  try { await run('ALTER TABLE dispatches ADD COLUMN packing_order_id INTEGER'); } catch (_) { }
  try { await run('ALTER TABLE dispatches ADD COLUMN priority INTEGER DEFAULT 1'); } catch (_) { }
  try { await run('ALTER TABLE dispatches ADD COLUMN is_small_order INTEGER DEFAULT 0'); } catch (_) { }

  // Dispatch Items table
  await exec(`
    CREATE TABLE IF NOT EXISTS dispatch_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dispatch_id INTEGER NOT NULL,
      invoice_item_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dispatch_id) REFERENCES dispatches(id) ON DELETE CASCADE,
      FOREIGN KEY (invoice_item_id) REFERENCES invoice_items(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // Vendors table
  await exec(`
    CREATE TABLE IF NOT EXISTS vendors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      city TEXT,
      state TEXT,
      pincode TEXT,
      phone TEXT,
      email TEXT,
      gst_number TEXT,
      contact_person TEXT,
      payment_days INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Raw Materials table
  await exec(`
    CREATE TABLE IF NOT EXISTS raw_materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      hsn_code TEXT,
      unit TEXT DEFAULT 'kg',
      stock_quantity REAL DEFAULT 0,
      cost_per_unit REAL DEFAULT 0,
      vendor_id INTEGER,
      reorder_level REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id)
    )
  `);

  // Product Recipes table
  await exec(`
    CREATE TABLE IF NOT EXISTS product_recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      raw_material_id INTEGER NOT NULL,
      quantity_required REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(product_id, raw_material_id),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (raw_material_id) REFERENCES raw_materials(id)
    )
  `);

  // Purchase Requests table
  await exec(`
    CREATE TABLE IF NOT EXISTS purchase_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_number TEXT UNIQUE NOT NULL,
      vendor_id INTEGER NOT NULL,
      created_by INTEGER NOT NULL,
      status TEXT DEFAULT 'draft',
      request_date DATE,
      expected_date DATE,
      total_amount REAL DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Purchase Request Items table
  await exec(`
    CREATE TABLE IF NOT EXISTS purchase_request_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      raw_material_id INTEGER NOT NULL,
      quantity_ordered REAL NOT NULL,
      quantity_received REAL DEFAULT 0,
      unit_price REAL DEFAULT 0,
      total REAL DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (request_id) REFERENCES purchase_requests(id) ON DELETE CASCADE,
      FOREIGN KEY (raw_material_id) REFERENCES raw_materials(id)
    )
  `);

  // Raw Material Receipts (Vendor Bills)
  await exec(`
    CREATE TABLE IF NOT EXISTS raw_material_receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_number TEXT UNIQUE NOT NULL,
      vendor_id INTEGER NOT NULL,
      receipt_date DATE NOT NULL,
      total_amount REAL DEFAULT 0,
      payment_status TEXT DEFAULT 'pending',
      payment_date DATE,
      due_date DATE,
      purchase_request_id INTEGER,
      arrival_status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id),
      FOREIGN KEY (purchase_request_id) REFERENCES purchase_requests(id)
    )
  `);

  // Vendor Payments table
  await exec(`
    CREATE TABLE IF NOT EXISTS vendor_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendor_id INTEGER NOT NULL,
      receipt_id INTEGER,
      amount REAL NOT NULL,
      payment_date DATE NOT NULL,
      payment_method TEXT DEFAULT 'cash',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id),
      FOREIGN KEY (receipt_id) REFERENCES raw_material_receipts(id)
    )
  `);

  // Production Orders table
  await exec(`
    CREATE TABLE IF NOT EXISTS production_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      product_id INTEGER NOT NULL,
      quantity_to_produce INTEGER NOT NULL,
      quantity_produced INTEGER DEFAULT 0,
      source_order_id INTEGER,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      created_by INTEGER NOT NULL,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (source_order_id) REFERENCES orders(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Production Materials table
  await exec(`
    CREATE TABLE IF NOT EXISTS production_materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      production_order_id INTEGER NOT NULL,
      raw_material_id INTEGER NOT NULL,
      quantity_required REAL NOT NULL,
      quantity_used REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (production_order_id) REFERENCES production_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (raw_material_id) REFERENCES raw_materials(id)
    )
  `);

  // Product Batches table
  await exec(`
    CREATE TABLE IF NOT EXISTS product_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      batch_number TEXT NOT NULL,
      production_order_id INTEGER,
      quantity_produced INTEGER NOT NULL,
      quantity_remaining INTEGER NOT NULL,
      production_date DATE NOT NULL,
      status TEXT DEFAULT 'available',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (production_order_id) REFERENCES production_orders(id) ON DELETE SET NULL,
      UNIQUE(product_id, batch_number)
    )
  `);

  // Dispatch Batches table
  await exec(`
    CREATE TABLE IF NOT EXISTS dispatch_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dispatch_id INTEGER NOT NULL,
      invoice_item_id INTEGER NOT NULL,
      batch_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dispatch_id) REFERENCES dispatches(id) ON DELETE CASCADE,
      FOREIGN KEY (invoice_item_id) REFERENCES invoice_items(id),
      FOREIGN KEY (batch_id) REFERENCES product_batches(id)
    )
  `);

  // Packing Orders table
  await exec(`
    CREATE TABLE IF NOT EXISTS packing_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      priority INTEGER DEFAULT 0,
      assigned_to INTEGER,
      started_at DATETIME,
      completed_at DATETIME,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id),
      FOREIGN KEY (assigned_to) REFERENCES users(id)
    )
  `);

  // Attendance table
  await exec(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date DATE NOT NULL,
      status TEXT DEFAULT 'present',
      check_in TIME,
      check_out TIME,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Salaries table
  await exec(`
    CREATE TABLE IF NOT EXISTS salaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      basic_salary REAL DEFAULT 0,
      allowances REAL DEFAULT 0,
      deductions REAL DEFAULT 0,
      net_salary REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      paid_date DATE,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, month, year),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Settings table
  await exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Classification thresholds table (for store volume classification)
  await exec(`
    CREATE TABLE IF NOT EXISTS classification_thresholds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      high_volume_min REAL DEFAULT 100000,
      medium_volume_min REAL DEFAULT 50000,
      period_days INTEGER DEFAULT 30,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default classification thresholds if not exists
  const existingThresholds = await queryOne('SELECT id FROM classification_thresholds LIMIT 1');
  if (!existingThresholds) {
    await run('INSERT INTO classification_thresholds (high_volume_min, medium_volume_min, period_days) VALUES (?, ?, ?)', [
      100000,
      50000,
      30
    ]);
    console.log('Default classification thresholds created');
  }

  // Insert default admin user if not exists
  const existingAdmin = await queryOne('SELECT id FROM users WHERE username = ?', ['sanjay']);
  if (!existingAdmin) {
    const hashedPassword = bcrypt.hashSync('demo123', 10);
    await run('INSERT INTO users (username, name, email, password, role) VALUES (?, ?, ?, ?, ?)', [
      'sanjay',
      'Sanjay',
      'sanjay@arunya.com',
      hashedPassword,
      'admin'
    ]);
    console.log('Default admin user created (username: sanjay, password: demo123)');
  }

  // Insert default settings
  const defaultSettings = [
    ['high_volume_threshold', '100000'],
    ['medium_volume_threshold', '50000'],
    ['company_name', 'Arunya O Naturals'],
    ['company_address', ''],
    ['company_gst', ''],
    ['company_phone', ''],
  ];

  for (const [key, value] of defaultSettings) {
    const existing = await queryOne('SELECT id FROM settings WHERE key = ?', [key]);
    if (!existing) {
      await run('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value]);
    }
  }

  console.log('Migrations completed successfully!');
};

// Only run if executed directly (not imported)
if (require.main === module) {
  runMigrations().catch(console.error);
}
