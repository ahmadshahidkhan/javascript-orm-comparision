import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { user } from '../user/user.modal';

export const article = pgTable('article', {
  id: serial('id').primaryKey(),
  authorId: integer('authorId')
    .references(() => user.id)
    .notNull(),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  body: text('body').notNull(),
  favoritesCount: integer('favoritesCount').default(0),
  updatedAt: timestamp('updatedAt').defaultNow(),
  createdAt: timestamp('createdAt').defaultNow(),
});
