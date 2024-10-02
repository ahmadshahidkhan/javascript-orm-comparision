import { pgTable, serial, integer } from 'drizzle-orm/pg-core';
import { article } from './article.modal';
import { tag } from '../tag/tag.modal';

export const articleTag = pgTable('articleTag', {
  id: serial('id').primaryKey(),
  articleId: integer('articleId')
    .references(() => article.id)
    .notNull(),
  tagId: integer('tagId')
    .references(() => tag.id)
    .notNull(),
});
