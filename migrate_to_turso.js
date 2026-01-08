import db from './backend/database.js';

console.log('Starting migration to Turso...');

// The database.js already calls initDb() inside a setTimeout when connecting to Turso.
// We just need to give it a few seconds to finish.

setTimeout(() => {
    console.log('Migration attempt completed. Check console for any errors.');
    process.exit(0);
}, 5000);
