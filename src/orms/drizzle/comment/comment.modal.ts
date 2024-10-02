import { pgTable, serial, integer, text, timestamp } from 'drizzle-orm/pg-core';
import { article } from '../article/article.modal';

export const comment = pgTable('comment', {
  id: serial('id').primaryKey(),
  authorId: integer('authorId').notNull(),
  articleId: integer('articleId')
    .references(() => article.id)
    .notNull(),
  body: text('body').notNull(),
  updatedAt: timestamp('updatedAt').defaultNow(),
  createdAt: timestamp('createdAt').defaultNow(),
});
