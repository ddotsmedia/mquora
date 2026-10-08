import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class FollowsService {
  private prisma = new PrismaClient();

  async follow(followerId: string, followingId: string) {
    return this.prisma.follow.upsert({
      where: { followerId_followingId: { followerId, followingId } },
      create: { followerId, followingId },
      update: {},
      select: { id: true },
    });
  }

  async unfollow(followerId: string, followingId: string) {
    await this.prisma.follow.delete({
      where: { followerId_followingId: { followerId, followingId } },
    });
  }

  async findFollowers(userId: string, cursor?: string, limit = 20) {
    const whereClause = { followingId: userId, ...(cursor && { createdAt: { lt: new Date(cursor) } }) };

    const followers = await this.prisma.follow.findMany({
      where: whereClause,
      select: { follower: { select: { id: true, username: true, displayName: true } }, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = followers.length > limit;
    const data = followers.slice(0, limit);
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].createdAt.toISOString() : null;

    return { data, nextCursor };
  }

  async findFollowing(userId: string, cursor?: string, limit = 20) {
    const whereClause = { followerId: userId, ...(cursor && { createdAt: { lt: new Date(cursor) } }) };

    const following = await this.prisma.follow.findMany({
      where: whereClause,
      select: { following: { select: { id: true, username: true, displayName: true } }, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = following.length > limit;
    const data = following.slice(0, limit);
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].createdAt.toISOString() : null;

    return { data, nextCursor };
  }
}
