import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { UpdateMeDto } from './users.dto';

const POST_CARD = {
  id: true, seoSlug: true, title: true, language: true, voteScore: true,
  answerCount: true, viewCount: true, createdAt: true,
  author: { select: { id: true, username: true, displayName: true } },
  community: { select: { id: true, slug: true, name: true } },
} as const;

@Injectable()
export class UsersService {
  private prisma = new PrismaClient();

  // Public profile. Deleted or banned-forever users are hidden.
  async publicProfile(username: string) {
    const user = await this.prisma.user.findFirst({
      where: { username, deletedAt: null },
      select: {
        id: true, username: true, displayName: true, role: true, reputationScore: true,
        isVerified: true, createdAt: true,
        profile: { select: { bio: true, avatarUrl: true, location: true, website: true } },
        badges: { select: { awardedAt: true, badge: { select: { name: true, description: true } } }, orderBy: { awardedAt: 'desc' } },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const live = { authorId: user.id, status: 'PUBLISHED' as const, deletedAt: null };
    const [posts, postCount, answerCount, followerCount, followingCount] = await Promise.all([
      this.prisma.post.findMany({ where: live, select: POST_CARD, orderBy: { createdAt: 'desc' }, take: 20 }),
      this.prisma.post.count({ where: live }),
      this.prisma.answer.count({ where: live }),
      this.prisma.follow.count({ where: { followingId: user.id } }),
      this.prisma.follow.count({ where: { followerId: user.id } }),
    ]);

    const { profile, ...rest } = user;
    return {
      ...rest,
      bio: profile?.bio ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
      location: profile?.location ?? null,
      website: profile?.website ?? null,
      posts,
      stats: { posts: postCount, answers: answerCount, followers: followerCount, following: followingCount },
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, username: true, displayName: true, role: true,
        profile: { select: { bio: true, location: true, website: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    const { profile, ...rest } = user;
    return { ...rest, bio: profile?.bio ?? '', location: profile?.location ?? '', website: profile?.website ?? '' };
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    const clean = (v?: string) => (v === undefined ? undefined : v.trim() || null);
    const profile = { bio: clean(dto.bio), location: clean(dto.location), website: clean(dto.website) };
    await this.prisma.$transaction([
      ...(dto.displayName !== undefined
        ? [this.prisma.user.update({ where: { id: userId }, data: { displayName: dto.displayName.trim() } })]
        : []),
      this.prisma.userProfile.upsert({ where: { userId }, create: { userId, ...profile }, update: profile }),
    ]);
    return this.me(userId);
  }
}
