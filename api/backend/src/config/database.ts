import { createClient, Client } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

let client: Client | null = null;

export const initDatabase = async (): Promise<Client> => {
  if (client) return client;

  // Use Turso for production, local file for development
  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    console.log('Connected to Turso database');
  } else {
    // Local development fallback
    client = createClient({
      url: 'file:./data/local.db',
    });
    console.log('Connected to local SQLite database');
  }

  return client;
};

export const getDb = (): Client => {
  if (!client) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return client;
};

// Helper function to run queries (returns all rows)
export const query = async (sql: string, params: any[] = []): Promise<any[]> => {
  const database = getDb();
  const result = await database.execute({ sql, args: params });
  return result.rows as any[];
};

// Helper function to run a single query (returns one row)
export const queryOne = async (sql: string, params: any[] = []): Promise<any> => {
  const results = await query(sql, params);
  return results.length > 0 ? results[0] : null;
};

// Helper function for insert/update/delete
export const run = async (sql: string, params: any[] = []): Promise<{ lastInsertRowid: number; changes: number }> => {
  const database = getDb();
  const result = await database.execute({ sql, args: params });
  return { 
    lastInsertRowid: Number(result.lastInsertRowid) || 0, 
    changes: result.rowsAffected 
  };
};

// Execute multiple statements
export const exec = async (sql: string): Promise<void> => {
  const database = getDb();
  // Split by semicolons and execute each statement
  const statements = sql.split(';').filter(s => s.trim());
  for (const stmt of statements) {
    if (stmt.trim()) {
      await database.execute(stmt);
    }
  }
};

// Execute multiple statements in a single round-trip
export const batch = async (queries: { sql: string, args: any[] }[]): Promise<any[]> => {
  const database = getDb();
  const results = await database.batch(queries);
  return results.map(r => r.rows as any[]);
};

// Transaction helper
export const transaction = async <T>(fn: () => Promise<T>): Promise<T> => {
  const database = getDb();
  const tx = await database.transaction('write');
  try {
    const result = await fn();
    await tx.commit();
    return result;
  } catch (error) {
    await tx.rollback();
    throw error;
  }
};

// Sync versions for backward compatibility (wraps async)
export const querySync = (sql: string, params: any[] = []): any[] => {
  throw new Error('Sync queries not supported with Turso. Use async query() instead.');
};

export const queryOneSync = (sql: string, params: any[] = []): any => {
  throw new Error('Sync queries not supported with Turso. Use async queryOne() instead.');
};

export const runSync = (sql: string, params: any[] = []): { lastInsertRowid: number; changes: number } => {
  throw new Error('Sync queries not supported with Turso. Use async run() instead.');
};

export default { initDatabase, getDb, query, queryOne, run, exec, transaction };
