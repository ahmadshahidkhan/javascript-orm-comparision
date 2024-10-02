import { OrmInterface } from 'orms/types';
import { articleRepo } from './article/article.repo';
import { commentRepo } from './comment/comment.repo';
import { closeDb, db } from './db';
import { profileRepo } from './profile/profile.repo';
import { tagRepo } from './tag/tag.repo';
import { userRepo } from './user/user.repo';

export const drizzleORM: OrmInterface = {
  async initialize() {
    await db;
  },

  async close() {
    await closeDb();
  },
  articleRepo,
  tagRepo,
  profileRepo,
  commentRepo,
  userRepo,
};
