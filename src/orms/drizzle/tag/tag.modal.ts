import { integer, pgTable, serial, text } from 'drizzle-orm/pg-core';
import { articleTag } from '../article/articleTag.modal';
import { article } from '../article/article.modal';

export const tag = pgTable('tag', {
  id: serial('id').primaryKey(),
  tag: text('tag').notNull(),
});

export const tagArticleTags = pgTable('tagArticleTag', {
  tagId: integer('tagId')
    .references(() => tag.id)
    .notNull(),
  articleTagId: integer('articleTagId')
    .references(() => articleTag.id)
    .notNull(),
});

export const tagArticles = pgTable('tag_article', {
  tagId: integer('tagId')
    .references(() => tag.id)
    .notNull(),
  articleId: integer('articleId')
    .references(() => article.id)
    .notNull(),
});
