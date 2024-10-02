import { db } from '../db';
import { User as UserType } from '../../../app/user/user.types';
import { ProfileRepo } from '../../types';
import { NotFoundError } from '../../../errors';
import { and, eq, sql } from 'drizzle-orm';
import { user } from '../user/user.modal';
import { userFollow } from '../user/userFollow.modal';
import { Profile } from 'app/profile/profile.types';

export const buildProfileQuery = ({
  currentUser,
  username,
}: {
  currentUser?: UserType;
  username?: string;
}) => {
  const query = db
    .select({
      id: user.id,
      username: user.username,
      bio: user.bio,
      image: user.image,
      following: sql`${
        currentUser
          ? `coalesce((SELECT true FROM ${userFollow} WHERE ${userFollow}.followerId = ${currentUser.id} AND ${userFollow}.followingId = ${user}.id), false)`
          : 'false'
      }`,
    })
    .from(user);

  if (username) {
    query.where(eq(user.username, username));
  }

  return query;
};

export const profileRepo: ProfileRepo = {
  async getProfileByUsername(username, currentUser): Promise<Profile> {
    const query = buildProfileQuery({ username, currentUser });
    const profile = (await db.execute(sql`${query}`)) as unknown as Profile[];
    if (!profile) throw new NotFoundError();
    return profile[0];
  },

  async followByUsername(username, currentUser) {
    return await db.transaction(async (trx) => {
      const [userRecord] = await trx
        .select()
        .from(user)
        .where(eq(user.username, username))
        .execute();
      if (!userRecord) throw new NotFoundError();

      await trx
        .insert(userFollow)
        .values({
          followerId: currentUser.id,
          followingId: userRecord.id,
        })
        .execute();

      return {
        ...userRecord,
        following: true,
      };
    });
  },

  async unfollowByUsername(username, currentUser) {
    return await db.transaction(async (trx) => {
      const [userRecord] = await trx
        .select()
        .from(user)
        .where(eq(user.username, username))
        .execute();
      if (!userRecord) throw new NotFoundError();

      await trx
        .delete(userFollow)
        .where(
          and(
            eq(userFollow.followerId, currentUser.id),
            eq(userFollow.followingId, userRecord.id),
          ),
        )
        .execute();

      return {
        ...userRecord,
        following: false,
      };
    });
  },
};
