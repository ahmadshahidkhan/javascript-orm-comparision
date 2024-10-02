import { CommentRepo } from '../../types';
import { db } from '../db';
import { User as UserType } from '../../../app/user/user.types';
import { ForbiddenError, NotFoundError } from '../../../errors';
import { desc, eq, sql } from 'drizzle-orm';
import { comment } from './comment.modal';
import { article } from '../article/article.modal';
import { buildProfileQuery } from '../profile/profile.repo';
import { CommentForResponse } from 'app/comment/comment.types';

const buildQuery = async ({
  currentUser,
  ...params
}: {
  id?: number;
  articleSlug?: string;
  currentUser?: UserType;
}) => {
  const profileSubquery = buildProfileQuery({ currentUser }).as('profile');

  const query = db
    .select({
      id: comment.id,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      body: comment.body,
      author: sql`${profileSubquery}`,
    })
    .from(comment)
    .leftJoin(profileSubquery, eq(comment.authorId, profileSubquery.id))
    .orderBy(desc(comment.createdAt));

  if (params.id) {
    query.where(eq(comment.id, params.id));
  }

  if (params.articleSlug) {
    query
      .innerJoin(article, eq(comment.articleId, article.id))
      .where(eq(article.slug, params.articleSlug));
  }

  return query;
};

export const commentRepo: CommentRepo = {
  async articleComments(
    articleSlug,
    currentUser,
  ): Promise<CommentForResponse[]> {
    const query = await buildQuery({ articleSlug, currentUser });
    return (await db.execute(sql`${query}`)) as unknown as CommentForResponse[];
  },

  async createArticleComment(
    slug,
    params,
    currentUser,
  ): Promise<CommentForResponse> {
    const [articleRecord] = await db
      .select()
      .from(article)
      .where(eq(article.slug, slug))
      .execute();
    if (!articleRecord) throw new NotFoundError();

    const [newComment] = await db
      .insert(comment)
      .values({
        ...params,
        authorId: currentUser.id,
        articleId: articleRecord.id,
      })
      .returning()
      .execute();

    const query = await buildQuery({ id: newComment.id, currentUser });
    return (await db.execute(sql`${query}`)) as unknown as CommentForResponse;
  },

  async deleteArticleComment(id, currentUser) {
    const [commentRecord] = await db
      .select()
      .from(comment)
      .where(eq(comment.id, id))
      .execute();
    if (!commentRecord) throw new NotFoundError();
    if (commentRecord.authorId !== currentUser.id) throw new ForbiddenError();

    await db.delete(comment).where(eq(comment.id, id)).execute();
  },
};
