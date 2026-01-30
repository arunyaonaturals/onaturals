import { initDatabase, exec, run, saveDatabase, query } from '../config/database';
import bcrypt from 'bcryptjs';

export const resetUsers = async () => {
  console.log('Resetting users...');

  await initDatabase();

  // Disable foreign key checks temporarily
  exec('PRAGMA foreign_keys = OFF');

  // Clear user references in related tables
  console.log('Clearing user references...');
  try { run('UPDATE areas SET sales_captain_id = NULL'); } catch(e) { console.log('areas update skipped'); }
  try { run('UPDATE invoices SET created_by = NULL'); } catch(e) { console.log('invoices update skipped'); }
  try { run('UPDATE orders SET created_by = NULL'); } catch(e) { console.log('orders update skipped'); }
  try { run('UPDATE invoice_payments SET collected_by = NULL'); } catch(e) { console.log('invoice_payments update skipped'); }
  try { run('DELETE FROM attendance'); } catch(e) { console.log('attendance delete skipped'); }
  try { run('DELETE FROM salaries'); } catch(e) { console.log('salaries delete skipped'); }
  
  // Delete all existing users
  console.log('Deleting all existing users...');
  run('DELETE FROM users');

  // Re-enable foreign key checks
  exec('PRAGMA foreign_keys = ON');

  // Create default admin user (username: sanjay, password: demo123)
  const hashedPassword = bcrypt.hashSync('demo123', 10);
  run('INSERT INTO users (username, name, email, password, role) VALUES (?, ?, ?, ?, ?)', [
    'sanjay',
    'Sanjay',
    'sanjay@arunya.com',
    hashedPassword,
    'admin'
  ]);
  console.log('Created admin user: sanjay / demo123');

  saveDatabase();
  console.log('Users reset completed!');
};

// Run if executed directly
resetUsers();
