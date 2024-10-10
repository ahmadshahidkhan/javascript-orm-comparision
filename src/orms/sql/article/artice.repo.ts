import { SqlEntityManager } from '@mikro-orm/postgresql';
import { ArticleForResponse, Article } from 'app/article/article.types';
import { User } from 'app/user/user.types';
import { ArticleRepo } from 'orms/types';
import pool from '../sql';

export const articleRepo: ArticleRepo = {
  async listArticles(params, currentUser) {
    const client = await pool.connect();
    let query = `SELECT * FROM article`;
    // add limit and offset
    if (params.limit) {
      query += ` LIMIT ${params.limit}`;
    }
    if (params.offset) {
      query += ` OFFSET ${params.offset}`;
    }

    // count all records
    const countQuery = `SELECT COUNT(*) FROM article`;

    const result = await client.query(query);
    const countResult = await client.query(countQuery);
    const articles = result.rows;
    const count = countResult.rows[0];
    client.release();
    return {
      articles,
      count,
    } as unknown as { articles: ArticleForResponse[]; count: number };
  },
  getArticleBySlug: function (
    slug: string,
    currentUser: User | undefined,
    meta: { em: SqlEntityManager },
  ): Promise<ArticleForResponse> {
    throw new Error('Function not implemented.');
  },
  createArticle: async function (
    params: Pick<Article, 'title' | 'slug' | 'description' | 'body'> & {
      tagList: string[];
    },
    currentUser: User,
    meta: { em: SqlEntityManager },
  ): Promise<ArticleForResponse> {
    const { title, slug, description, body, tagList } = params;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const articleResult = await client.query(
        `INSERT INTO article (title, slug, description, body, "authorId") VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [title, slug, description, body, currentUser.id],
      );
      const article = articleResult.rows[0];

      const tagValues = tagList.map((tag) => `('${tag}')`).join(',');
      const tagResult = await client.query(
        `INSERT INTO "tag" (tag)
         VALUES ${tagValues}
         ON CONFLICT (tag) DO UPDATE SET tag = EXCLUDED.tag
         RETURNING id, tag`,
      );
      const tagIds = tagResult.rows.map((row) => row.id);

      // Insert into articleTag table
      const articleTagValues = tagIds
        .map((tagId) => `(${article.id}, ${tagId})`)
        .join(',');
      await client.query(
        `INSERT INTO "articleTag" ("articleId", "tagId")
         VALUES ${articleTagValues}`,
      );

      await client.query('COMMIT');

      // get last return article
      const articleForResponse = await client.query(
        `SELECT * FROM article WHERE id = $1`,
        [article.id],
      );
      return articleForResponse.rows[0] as unknown as ArticleForResponse;
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    } finally {
      await client.release();
    }
  },

  updateArticleBySlug: function (
    slug: string,
    params: Partial<Pick<Article, 'title' | 'description' | 'body'>> & {
      tagList?: string[];
    },
    currentUser: User,
    meta: { em: SqlEntityManager },
  ): Promise<ArticleForResponse> {
    throw new Error('Function not implemented.');
  },
  deleteArticleBySlug: function (
    slug: string,
    currentUser: User,
    meta: { em: SqlEntityManager },
  ): Promise<void> {
    throw new Error('Function not implemented.');
  },
  markAsFavoriteBySlug: function (
    slug: string,
    currentUser: User,
    meta: { em: SqlEntityManager },
  ): Promise<ArticleForResponse> {
    throw new Error('Function not implemented.');
  },
  unmarkAsFavoriteBySlug: function (
    slug: string,
    currentUser: User,
    meta: { em: SqlEntityManager },
  ): Promise<ArticleForResponse> {
    throw new Error('Function not implemented.');
  },
};
