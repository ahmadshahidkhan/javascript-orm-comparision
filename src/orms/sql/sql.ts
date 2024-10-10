import { Client, Pool } from 'pg';
import { articleRepo } from './article/artice.repo';
import config from 'config';
import userRepo from 'orms/orchid-orm/user/user.repo';

const pool = new Pool({
  connectionString: config.dbUrl,
  max: 10,
  min: 0,
});

let poolEnded = false;

export const sqlRaw: any = {
  async initialize() {
    // await pool.connect();
  },
  async close() {
    if (!poolEnded) {
      await pool.end();
      poolEnded = true;
    }
  },
  articleRepo,
  userRepo,
};

export default pool;
