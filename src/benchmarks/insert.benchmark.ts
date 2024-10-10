import 'dotenv/config';
import { Client } from 'pg';
import {
  clearDb,
  connectAllORMs,
  disconnectAllORMs,
  formatMs,
  getMs,
  ormNames,
} from './utils';
import { create } from '../tests/utils/create';
import { OrmName } from '../orms/types';
import { createToken } from '../lib/jwt';
import config from '../config';
import { mean, std, median } from 'mathjs'; // Ensure you have mathjs installed

config.startServer = false;
import app from '../index';

const createArticlesCount = 1000;
const tagsInArticle = 5;

const tags = Array.from({ length: 30 }).map((_, i) => `tag-${i + 1}`);

(async () => {
  const db = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await db.connect();

  try {
    await clearDb(db, ['user']);
    await prepareDb(db);
    try {
      await connectAllORMs();
      await measureORMs(db);
    } finally {
      await disconnectAllORMs();
    }
  } catch (err) {
    console.error(err);
  } finally {
    await clearDb(db, ['articleTag', 'tag', 'article', 'user']);
    await db.end();
    process.exit();
  }
})();

async function prepareDb(db: Client) {
  await create(
    'user',
    [
      {
        id: 1,
        username: `username`,
        email: `email@mail.com`,
        password: 'password',
      },
    ],
    {
      db,
    },
  );
}

async function measureORMs(db: Client) {
  const token = createToken({ id: 1, email: 'email@mail.com' });
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
    await clearDb(db, ['articleTag', 'tag', 'article']);
    const timings = [];

    const totalStart = getMs();

    for (let i = 0; i < createArticlesCount; i++) {
      const articleTags = Array.from({ length: tagsInArticle }).map(
        (_, n) => tags[(i + n) % tags.length],
      );
      const start = getMs();
      await performRequest(ormName, token, {
        title: `title ${i}`,
        description: `description ${i}`,
        body: `body ${i}`,
        tagList: articleTags,
      });
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

// async function measureORMs(db: Client) {
//   const token = createToken({ id: 1, email: 'email@mail.com' });

//   for (const ormName of ormNames) {
//     await clearDb(db, ['articleTag', 'tag', 'article']);

//     const timings = [];
//     const totalStart = getMs();

//     for (let i = 0; i < createArticlesCount; i++) {
//       const articleTags = Array.from({ length: tagsInArticle }).map(
//         (_, n) => tags[(i + n) % tags.length],
//       );
//       const start = getMs();
//       await performRequest(ormName, token, {
//         title: `title ${i}`,
//         description: `description ${i}`,
//         body: `body ${i}`,
//         tagList: articleTags,
//       });
//       const end = getMs();
//       timings.push(end - start);
//     }

//     const totalEnd = getMs();
//     const total = totalEnd - totalStart;

//     console.log(`${ormName}: Total: ${formatMs(total)}`);

//     const avg = mean(timings);
//     const stdDev = std(timings, 'uncorrected');
//     const med = median(timings);

//     console.log(
//       `${ormName} - Average: ${formatMs(avg)}, Std Dev: ${formatMs(
//         stdDev as number,
//       )}, Median: ${formatMs(med)}`,
//     );
//   }
// }

async function performRequest(
  ormName: OrmName,
  token: string,
  article: {
    title: string;
    description: string;
    body: string;
    tagList: string[];
  },
) {
  return app.inject({
    method: 'POST',
    url: '/articles',
    headers: {
      'x-orm': ormName,
      authorization: `Token ${token}`,
    },
    payload: {
      article,
    },
  });
}
