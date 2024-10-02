import 'dotenv/config';
import { Client } from 'pg';
import { create } from 'tests/utils/create';
import { OrmName } from '../orms/types';
import config from '../config';
import { deepStrictEqual } from 'assert';
import {
  clearDb,
  connectAllORMs,
  disconnectAllORMs,
  formatMs,
  getMs,
  ormNames,
} from './utils';

const articlesToLoad = 1000;
const requestsPerORM = 300;

config.startServer = false;
import app from '../index';

// For prisma to serialize date properly
process.env.TZ = 'UTC';

const tables = ['articleTag', 'userArticleFavorite', 'article', 'tag', 'user'];

(async () => {
  console.log('Starting benchmark');
  const db = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await db.connect();
  console.log('Connected to database');

  try {
    console.log('Clearing database');
    await clearDb(db, tables);
    console.log('Preparing database');
    await prepareDb(db);
    try {
      console.log('Connecting all ORMs');
      await connectAllORMs();
      console.log('Verifying responses');
      await verifyResponses();
      console.log('Measuring ORMs');
      await measureORMs();
    } finally {
      console.log('Disconnecting all ORMs');
      await disconnectAllORMs();
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    console.log('Clearing database again');
    await clearDb(db, tables);
    console.log('Ending database connection');
    await db.end();
    console.log('Exiting process');
    process.exit();
  }
})();

async function prepareDb(db: Client) {
  const tagsCount = 30;
  const usersCount = 10;
  const tagsInArticle = 5;
  const articlesCount = 10000;
  const favoritesInArticle = 3;
  const now = new Date();

  await create(
    'tag',
    Array.from({ length: tagsCount }).map((_, i) => {
      const id = i + 1;
      return {
        id,
        tag: `tag-${id}`,
      };
    }),
    {
      db,
    },
  );

  await create(
    'user',
    Array.from({ length: usersCount }).map((_, i) => {
      const id = i + 1;
      return {
        id,
        username: `username-${id}`,
        email: `email-${id}@mail.com`,
        password: 'password',
      };
    }),
    {
      db,
    },
  );

  await create(
    'article',
    Array.from({ length: articlesCount }).map((_, i) => {
      const id = i + 1;
      return {
        id,
        authorId: (i % usersCount) + 1,
        slug: `slug-${id}`,
        title: `title ${id}`,
        description: `description ${id}`,
        body: `body ${id}`,
        favoritesCount: 5, // wrong count specially to make sure none of the orms will calculate this field on the fly
        createdAt: now,
        updatedAt: now,
      };
    }),
    {
      db,
    },
  );

  await create(
    'articleTag',
    Array.from({ length: articlesCount }).flatMap((_, i) => {
      return Array.from({ length: tagsInArticle }).map((_, n) => {
        const articleId = (i % articlesCount) + 1;
        return {
          id: i * tagsInArticle + n + 1,
          articleId,
          tagId: ((articleId + n) % tagsCount) + 1,
        };
      });
    }),
    {
      db,
    },
  );

  await create(
    'userArticleFavorite',
    Array.from({ length: articlesCount }).flatMap((_, i) => {
      return Array.from({ length: favoritesInArticle }).map((_, n) => {
        const articleId = (i % articlesCount) + 1;
        return {
          id: i * favoritesInArticle + n + 1,
          articleId,
          userId: ((articleId + n) % usersCount) + 1,
        };
      });
    }),
    {
      db,
    },
  );
}

async function verifyResponses() {
  const firstResponse = await getResponse(ormNames[0]);
  // console.log(`> Response of ${ormNames[0]} is verified`, firstResponse);
  for (const ormName of ormNames.slice(1)) {
    const response = await getResponse(ormName);
    try {
      deepStrictEqual(firstResponse, response);
    } catch (err) {
      console.error(
        `> Response of ${ormName} is different from ${ormNames[0]}`,
      );
      return;
      // throw err;
    }
  }
}

async function measureORMs() {
  for (const ormName of ormNames) {
    const start = getMs();

    for (let i = 0; i < requestsPerORM; i++) {
      await performRequest(ormName);
    }

    const end = getMs();

    console.log(`${ormName}: ${formatMs(end - start)}`);
  }
}

async function getResponse(ormName: OrmName) {
  const { body } = await performRequest(ormName);
  return JSON.parse(body);
}

function performRequest(ormName: OrmName) {
  return app.inject({
    method: 'GET',
    url: `/articles?limit=${articlesToLoad}&offset=1000`,
    headers: {
      'x-orm': ormName,
    },
    payload: {},
  });
}
