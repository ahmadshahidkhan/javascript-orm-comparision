import { desc } from 'drizzle-orm';
import { TagRepo } from '../../types';
import { db } from '../db';
import { tag } from './tag.modal';

export const tagRepo: TagRepo = {
  async listTags() {
    return await db.select().from(tag).orderBy(desc(tag.tag)).execute();
  },
};
