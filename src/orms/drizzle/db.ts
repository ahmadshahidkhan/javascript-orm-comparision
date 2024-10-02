import { drizzle } from 'drizzle-orm/node-postgres';
import { Client, Pool } from 'pg';
import config from 'config';

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle>;

export const getDb = async () => {
  if (!pool) {
    pool = new Pool({
      connectionString: config.dbUrl,
      max: 10,
      min: 0,
      connectionTimeoutMillis: 5000,
    });

    try {
      db = drizzle(pool);
    } catch (error) {
      console.error('Error connecting to db:', error);
      throw error; // Re-throw the error after logging it
    }
  }
  return db;
};

export const closeDb = async () => {
  if (pool) {
    try {
      await pool.end();
    } catch (error) {
      console.error('Error closing the database connection:', error);
    }
    pool = null;
  }
};

(async () => {
  try {
    await getDb();
  } catch (error) {
    console.error('Error connecting to db:', error);
  }
})();

export { db };
