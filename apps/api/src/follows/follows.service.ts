import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class FollowsService {
  private prisma = new PrismaClient();

  async follow(followerId: string, followingId: string) {
    if (!followingId) throw new BadRequestException('followingId is required');
    if (followerId === followingId) throw new BadRequestException('You cannot follow yourself');
    const target = await this.prisma.user.findFirst({ where: { id: followingId, deletedAt: null }, select: { id: true } });
    if (!target) throw new NotFoundException('User not found');

    const existing = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
      select: { id: true },
    });
    if (existing) return { following: true };

    await this.prisma.follow.create({ data: { followerId, followingId } });
    const follower = await this.prisma.user.findUnique({ where: { id: followerId }, select: { username: true, displayName: true } });
    if (follower) {
      await this.prisma.notification
        .create({
          data: {
            userId: followingId,
            type: 'FOLLOW',
            title: 'New follower',
            body: `${follower.displayName} started following you`,
            link: `/profile/${follower.username}`,
          },
        })
        .catch(() => undefined); // a failed notification must not fail the follow
    }
    return { following: true };
  }

  async unfollow(followerId: string, followingId: string) {
    await this.prisma.follow.deleteMany({ where: { followerId, followingId } });
    return { following: false };
  }

  async status(followerId: string, followingId: string) {
    const row = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
      select: { id: true },
    });
    return { following: !!row };
  }

  async findFollowers(userId: string, cursor?: string, limit = 20) {
    limit = Math.min(Math.max(limit || 20, 1), 50);
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
    limit = Math.min(Math.max(limit || 20, 1), 50);
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
