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
import { mean, std, median } from 'mathjs'; // Ensure you have mathjs installed
import os from 'os';

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
      // await measureORMsConcurrently();
      // await measureORMsConcurrentlyV2();
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
  const results: { [key in OrmName]: number[] } = {
    sequelize: [],
    typeorm: [],
    knex: [],
    prisma: [],
    objection: [],
    mikroorm: [],
    drizzleORM: [],
    sqlRaw: [],
    'orchid-orm': [],
  };

  for (const ormName of ormNames) {
    const timings = [];
    const totalStart = getMs();

    for (let i = 0; i < requestsPerORM; i++) {
      const start = getMs();
      await performRequest(ormName);
      const end = getMs();
      timings.push(end - start);
    }

    const totalEnd = getMs();

    results[ormName] = timings;
    console.log(`${ormName}: ${formatMs(totalEnd - totalStart)}`);
  }

  // Calculate and print statistical summary
  for (const ormName of ormNames) {
    const timings = results[ormName];
    const avg = mean(timings);
    const stdDev = std(timings, 'uncorrected');
    const med = median(timings);

    console.log(
      `${ormName} - Average: ${formatMs(avg)}, Std Dev: ${formatMs(
        stdDev as number,
      )}, Median: ${formatMs(med)}`,
    );
  }
}

async function measureORMsConcurrently() {
  const results: { [key in OrmName]: number[] } = {
    sequelize: [],
    typeorm: [],
    knex: [],
    prisma: [],
    objection: [],
    mikroorm: [],
    drizzleORM: [],
    sqlRaw: [],
    'orchid-orm': [],
  };

  for (const ormName of ormNames) {
    const timings: number[] = [];
    const totalStart = getMs();

    const promises = Array.from({ length: requestsPerORM }, () => {
      const start = getMs();
      return performRequest(ormName).then(() => {
        const end = getMs();
        timings.push(end - start);
      });
    });
    await Promise.all(promises);

    const totalEnd = getMs();

    results[ormName] = timings;
    console.log(`${ormName}: ${formatMs(totalEnd - totalStart)}`);
  }

  // Calculate and print statistical summary
  for (const ormName of ormNames) {
    const timings = results[ormName];
    const avg = mean(timings);
    const stdDev = std(timings, 'uncorrected');
    const med = median(timings);

    console.log(
      `${ormName} - Average: ${formatMs(avg)}, Std Dev: ${formatMs(
        stdDev as number,
      )}, Median: ${formatMs(med)}`,
    );
  }
}

async function measureORMsConcurrentlyV2() {
  const maxConcurrentRequests = 2000; // Adjust this based on your needs
  const step = 50; // Increase the load by this step each time

  for (const ormName of ormNames) {
    for (
      let concurrentRequests = step;
      concurrentRequests <= maxConcurrentRequests;
      concurrentRequests += step
    ) {
      const { totalTime, errors } = await loadTestORM(
        ormName,
        concurrentRequests,
      );
      if (errors.length > 0) {
        console.log(
          `Reached limit for ${ormName} at ${
            concurrentRequests - step
          } concurrent requests`,
        );
        break;
      }
    }
  }
}

async function loadTestORM(ormName: OrmName, concurrentRequests: number) {
  const timings: number[] = [];
  const errors: any[] = [];
  const totalStart = getMs();

  const promises = Array.from({ length: concurrentRequests }, () => {
    const start = getMs();
    return performRequest(ormName)
      .then(() => {
        const end = getMs();
        timings.push(end - start);
      })
      .catch((error) => {
        errors.push(error);
      });
  });

  await Promise.all(promises);

  const totalEnd = getMs();
  const totalTime = totalEnd - totalStart;

  console.log(`${ormName} with ${concurrentRequests} concurrent requests:`);
  console.log(`Total time: ${formatMs(totalTime)}`);
  console.log(`Number of errors: ${errors.length}`);
  if (errors.length > 0) {
    console.log(`Errors:`, errors);
  }

  return { totalTime, errors };
}

// async function measureORMs() {
//   for (const ormName of ormNames) {
//     const start = getMs();

//     for (let i = 0; i < requestsPerORM; i++) {
//       await performRequest(ormName);
//     }

//     const end = getMs();

//     console.log(`${ormName}: ${formatMs(end - start)}`);
//   }
// }

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
