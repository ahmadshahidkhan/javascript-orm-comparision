import { pgTable, serial, integer } from 'drizzle-orm/pg-core';
import { article } from './article.modal';
import { user } from '../user/user.modal';

export const userArticleFavorite = pgTable('user_article_favorite', {
  id: serial('id').primaryKey(),
  articleId: integer('articleId')
    .references(() => article.id)
    .notNull(),
  userId: integer('userId')
    .references(() => user.id)
    .notNull(),
});
