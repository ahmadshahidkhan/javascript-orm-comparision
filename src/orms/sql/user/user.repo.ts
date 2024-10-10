import { SqlEntityManager } from '@mikro-orm/postgresql';
import { UserWithPassword, User } from 'app/user/user.types';
import { UserRepo } from 'orms/types';
import pool from '../sql';

export const userRepo: UserRepo = {
  create: function (
    params: Omit<UserWithPassword, 'id'>,
    meta: { em: SqlEntityManager },
  ): Promise<User> {
    throw new Error('Function not implemented.');
  },
  findByEmail: function (
    email: string,
    meta: { em: SqlEntityManager },
  ): Promise<UserWithPassword | undefined> {
    throw new Error('Function not implemented.');
  },

  findById: async function (
    id: number,
    meta: { em: SqlEntityManager },
  ): Promise<UserWithPassword | undefined> {
    const client = await pool.connect();
    const sql = `SELECT * FROM "user" WHERE id = ?`;
    const result = await client.query(sql, [id]);
    client.release();
    return result.rows[0];
  },
  updateUser: function (
    user: User,
    params: Partial<Omit<UserWithPassword, 'id'>>,
    meta: { em: SqlEntityManager },
  ): Promise<User> {
    throw new Error('Function not implemented.');
  },
};
