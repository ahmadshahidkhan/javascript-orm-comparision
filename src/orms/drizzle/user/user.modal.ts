import { integer, pgTable, serial, text } from 'drizzle-orm/pg-core';
import { article } from '../article/article.modal';
import { userFollow } from './userFollow.modal';
import { userArticleFavorite } from '../article/userArticleFavorite.modal';

export const user = pgTable('user', {
  id: serial('id').primaryKey(),
  email: text('email').notNull(),
  username: text('username').notNull(),
  password: text('password').notNull(),
  bio: text('bio'),
  image: text('image'),
});

export const userArticles = pgTable('user_article', {
  userId: integer('userId')
    .references(() => user.id)
    .notNull(),
  articleId: integer('articleId')
    .references(() => article.id)
    .notNull(),
});

export const userFollows = pgTable('user_follow', {
  userId: integer('userId')
    .references(() => user.id)
    .notNull(),
  followingId: integer('followingId')
    .references(() => userFollow.id)
    .notNull(),
});

export const userArticleFavorites = pgTable('user_article_favorite', {
  userId: integer('userId')
    .references(() => user.id)
    .notNull(),
  articleId: integer('articleId')
    .references(() => userArticleFavorite.id)
    .notNull(),
});
