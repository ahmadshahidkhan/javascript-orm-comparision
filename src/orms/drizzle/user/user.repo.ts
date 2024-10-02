import { UserRepo } from '../../types';
import { db } from '../db';
import { UniqueViolationError } from '../../../errors';
import { eq } from 'drizzle-orm';
import { user } from './user.modal';

export const userRepo: UserRepo = {
  async create(params) {
    try {
      console.log('Creating user with params:', params);
      const [newUser] = await db
        .insert(user)
        .values(params)
        .returning()
        .execute();
      return newUser;
    } catch (error) {
      if (error instanceof Error && error.message.includes('unique')) {
        throw new UniqueViolationError(`User with such detail  already exists`);
      }
      throw error;
    }
  },

  async findByEmail(email) {
    const [foundUser] = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .execute();
    return foundUser || undefined;
  },

  async findById(id) {
    const [foundUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, id))
      .execute();
    if (!foundUser) throw new Error('not found');
    return foundUser;
  },

  async updateUser({ id }, params) {
    const [foundUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, id))
      .execute();
    if (!foundUser) throw new Error('not found');

    const updatedUser = Object.assign(foundUser, params);
    await db.update(user).set(params).where(eq(user.id, id)).execute();
    return updatedUser;
  },
};
