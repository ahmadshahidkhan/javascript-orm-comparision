import { pgTable, serial, integer } from 'drizzle-orm/pg-core';
import { user } from './user.modal';

export const userFollow = pgTable('user_follow', {
  id: serial('id').primaryKey(),
  followerId: integer('follower_id')
    .references(() => user.id)
    .notNull(),
  followingId: integer('following_id')
    .references(() => user.id)
    .notNull(),
});
