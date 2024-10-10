import { ArticleRepo } from '../../types';
import { db } from '../db';
import { ForbiddenError, NotFoundError } from '../../../errors';
import { articleTag } from './articleTag.modal';
import { article } from './article.modal';
import { tag } from '../tag/tag.modal';
import { user } from '../user/user.modal';
import { userFollow } from '../user/userFollow.modal';
import { User as UserType } from '../../../app/user/user.types';
import { eq, inArray, notExists, sql } from 'drizzle-orm';
import { userArticleFavorite } from './userArticleFavorite.modal';
import { ArticleForResponse } from 'app/article/article.types';
import { create } from 'domain';
import { PgTransaction } from 'drizzle-orm/pg-core';

type ArticlesQueryParams = {
  currentUser?: UserType;
  tag?: string;
  author?: string;
  favorited?: string;
  fromFollowedAuthors?: boolean;
  id?: number;
  slug?: string;
  limit?: number;
  offset?: number;
};

const buildQuery = async ({ currentUser, ...params }: ArticlesQueryParams) => {
  const query = db.select().from(article);
  if (params.tag) {
    query
      .innerJoin(articleTag, eq(article.id, articleTag.articleId))
      .innerJoin(tag, eq(articleTag.tagId, tag.id))
      .where(eq(tag.tag, params.tag));
  }

  if (params.author) {
    query
      .innerJoin(user, eq(article.authorId, user.id))
      .where(eq(user.username, params.author));
  }

  if (params.favorited) {
    query
      .innerJoin(
        userArticleFavorite,
        eq(article.id, userArticleFavorite.articleId),
      )
      .innerJoin(user, eq(userArticleFavorite.userId, user.id))
      .where(eq(user.username, params.favorited));
  }

  if (params.fromFollowedAuthors && currentUser) {
    query
      .innerJoin(user, eq(article.authorId, user.id))
      .innerJoin(userFollow, eq(user.id, userFollow.followingId))
      .where(eq(userFollow.followerId, currentUser.id));
  }

  if (params.id) {
    query.where(eq(article.id, params.id));
  }

  if (params.slug) {
    query.where(eq(article.slug, params.slug));
  }

  const articles = await query
    .limit(params.limit ?? 20)
    .offset(params.offset ?? 0)
    .execute();

  const countResult = await db
    .select({ count: sql`COUNT(${article.id})` })
    .from(article)
    .execute();
  return [articles, countResult[0].count] as const;
};

const getArticleForResponse = async (
  params: Omit<ArticlesQueryParams, 'limit' | 'offset'>,
) => {
  const [articles] = await buildQuery({
    ...params,
    limit: 1,
  });
  const article = articles[0];
  if (!article) throw new NotFoundError();
  return article;
};

const deleteUnusedTags = async () => {
  const subQuery = db
    .select({
      tagId: articleTag.tagId,
    })
    .from(articleTag)
    .where(eq(articleTag.tagId, tag.id));

  await db.delete(tag).where(notExists(subQuery)).execute();
};

const createArticleTags = async ({
  articleDetail,
  trx,
  tagList,
}: {
  articleDetail: any;
  trx: any;
  tagList?: string[];
}) => {
  if (!tagList?.length) return [];
  // const existingTags = await db
  //   .select()
  //   .from(tag)
  //   .where(inArray(tag.tag, tagList))
  //   .execute();
  // const existingTagNames = existingTags.map((t) => t.tag);
  // const newTags = tagList.filter((t) => !existingTagNames.includes(t));

  const createdTags = await trx
    .insert(tag)
    .values(tagList.map((name) => ({ tag: name })))
    .onConflictDoUpdate({
      target: tag.tag,
      set: { tag: sql`gen_random_uuid()::text` },
    })
    .returning()
    .execute();

  await trx
    .insert(articleTag)
    .values(
      createdTags.map((t: any) => ({
        tagId: t.id,
        articleId: articleDetail.id,
      })),
    )
    .execute();
};

export const articleRepo: ArticleRepo = {
  async listArticles(params, currentUser) {
    const [articles, count] = await buildQuery({
      currentUser,
      ...params,
    });

    return {
      articles,
      count,
    } as unknown as { articles: ArticleForResponse[]; count: number };
  },

  async getArticleBySlug(slug, currentUser) {
    return (await getArticleForResponse({
      currentUser,
      slug,
    })) as unknown as ArticleForResponse;
  },

  async createArticle(params, currentUser) {
    const { id } = await db.transaction(async (trx) => {
      const [articleDetail] = await trx
        .insert(article)
        .values({
          ...params,
          authorId: currentUser.id,
        })
        .returning()
        .execute();

      await createArticleTags({
        articleDetail,
        trx,
        tagList: params.tagList,
      });

      return articleDetail;
    });

    return (await getArticleForResponse({
      currentUser,
      id,
    })) as unknown as ArticleForResponse;
  },

  async updateArticleBySlug(slug, { tagList, ...params }, currentUser) {
    const id = await db.transaction(async (trx) => {
      const [articlee] = await trx
        .select()
        .from(article)
        .where(eq(article.slug, slug))
        .execute();

      if (!articlee) throw new NotFoundError();
      if (articlee.authorId !== currentUser.id) throw new ForbiddenError();

      await trx
        .update(article)
        .set(params)
        .where(eq(article.id, article.id))
        .execute();

      return articlee.id;
    });

    return (await getArticleForResponse({
      currentUser,
      id,
    })) as unknown as ArticleForResponse;
  },

  async deleteArticleBySlug(slug, currentUser) {
    await db.transaction(async (trx) => {
      const [articleDetail] = await trx
        .select()
        .from(article)
        .where(eq(article.slug, slug))
        .execute();

      if (!articleDetail) throw new NotFoundError();
      if (articleDetail.authorId !== currentUser.id) throw new ForbiddenError();

      await trx
        .delete(articleTag)
        .where(eq(articleTag.articleId, article.id))
        .execute();
      await trx.delete(article).where(eq(article.id, article.id)).execute();
      await deleteUnusedTags();
    });
  },

  async markAsFavoriteBySlug(slug, currentUser) {
    const id = await db.transaction(async (trx) => {
      const [articleDetail] = await trx
        .select()
        .from(article)
        .where(eq(article.slug, slug))
        .execute();
      if (!articleDetail) throw new NotFoundError();

      try {
        await trx
          .insert(userArticleFavorite)
          .values({
            articleId: article.id as unknown as number,
            userId: currentUser.id,
          })
          .execute();

        await trx
          .update(article)
          .set({
            favoritesCount: (article.favoritesCount as unknown as number) + 1,
          })
          .where(eq(article.id, article.id))
          .execute();
      } catch (error) {
        if (!(error instanceof Error)) throw error;
      }

      return articleDetail.id;
    });

    return getArticleForResponse({
      currentUser,
      id,
    }) as unknown as ArticleForResponse;
  },

  async unmarkAsFavoriteBySlug(slug, currentUser) {
    const id = await db.transaction(async (trx) => {
      const [articlee] = await trx
        .select()
        .from(article)
        .where(eq(article.slug, slug))
        .execute();
      if (!articlee) throw new NotFoundError();

      return articlee.id;
    });

    return getArticleForResponse({
      currentUser,
      id,
    }) as unknown as ArticleForResponse;
  },
};
