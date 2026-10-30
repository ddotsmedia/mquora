import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';
import { UpdateMeDto } from './users.dto';

const POST_CARD = {
  id: true, seoSlug: true, title: true, language: true, voteScore: true,
  answerCount: true, viewCount: true, createdAt: true,
  isAnonymous: true,
  author: { select: { id: true, username: true, displayName: true } },
  community: { select: { id: true, slug: true, name: true } },
} as const;

function startOfDubaiMonth(): Date {
  const now = new Date(Date.now() + 4 * 60 * 60 * 1000);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) - 4 * 60 * 60 * 1000);
}

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
        profile: { select: { bio: true, avatarUrl: true, location: true, website: true, credential: true } },
        badges: { select: { awardedAt: true, badge: { select: { name: true, description: true } } }, orderBy: { awardedAt: 'desc' } },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const live = { authorId: user.id, status: 'PUBLISHED' as const, deletedAt: null };
    const [posts, postCount, answerCount, followerCount, followingCount, views, viewsThisMonth, knows] = await Promise.all([
      this.prisma.post.findMany({ where: { ...live, isAnonymous: false }, select: POST_CARD, orderBy: { createdAt: 'desc' }, take: 20 }),
      this.prisma.post.count({ where: { ...live, isAnonymous: false } }),
      this.prisma.answer.count({ where: live }),
      this.prisma.follow.count({ where: { followingId: user.id } }),
      this.prisma.follow.count({ where: { followerId: user.id } }),
      // Views of questions they asked or answered.
      this.prisma.post.aggregate({
        where: { status: 'PUBLISHED', deletedAt: null, OR: [{ authorId: user.id }, { answers: { some: { authorId: user.id, deletedAt: null } } }] },
        _sum: { viewCount: true },
      }),
      // Views in the current month (Dubai time, UTC+4) of questions they asked or answered.
      this.prisma.postView.count({
        where: {
          createdAt: { gte: startOfDubaiMonth() },
          post: { status: 'PUBLISHED', deletedAt: null, OR: [{ authorId: user.id }, { answers: { some: { authorId: user.id, deletedAt: null } } }] },
        },
      }),
      // "Knows about": communities where they answered most.
      this.prisma.answer.findMany({ where: live, select: { post: { select: { community: { select: { slug: true, name: true } } } } }, take: 500 }),
    ]);
    const tally = new Map<string, { slug: string; name: string; answers: number }>();
    for (const a of knows) {
      const c = a.post.community;
      if (!c) continue;
      const t = tally.get(c.slug) ?? { ...c, answers: 0 };
      t.answers += 1;
      tally.set(c.slug, t);
    }
    const knowsAbout = [...tally.values()].sort((x, y) => y.answers - x.answers).slice(0, 5);

    const { profile, ...rest } = user;
    return {
      ...rest,
      bio: profile?.bio ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
      location: profile?.location ?? null,
      website: profile?.website ?? null,
      credential: profile?.credential ?? null,
      posts,
      knowsAbout,
      stats: { posts: postCount, answers: answerCount, followers: followerCount, following: followingCount, views: views._sum.viewCount ?? 0, viewsThisMonth },
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, username: true, displayName: true, role: true,
        profile: { select: { bio: true, location: true, website: true, credential: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    const { profile, ...rest } = user;
    return { ...rest, bio: profile?.bio ?? '', location: profile?.location ?? '', website: profile?.website ?? '', credential: profile?.credential ?? '' };
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    const clean = (v?: string) => (v === undefined ? undefined : v.trim() || null);
    const profile = { bio: clean(dto.bio), location: clean(dto.location), website: clean(dto.website), credential: clean(dto.credential) };
    await this.prisma.$transaction([
      ...(dto.displayName !== undefined
        ? [this.prisma.user.update({ where: { id: userId }, data: { displayName: dto.displayName.trim() } })]
        : []),
      this.prisma.userProfile.upsert({ where: { userId }, create: { userId, ...profile }, update: profile }),
    ]);
    return this.me(userId);
  }

  // Quick user search for "Ask to Answer" and similar features.
  async searchUsers(q: string, limit = 8) {
    if (!q || q.trim().length < 2) return { data: [] };
    const term = q.trim().toLowerCase();
    const data = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        OR: [
          { username: { contains: term, mode: 'insensitive' } },
          { displayName: { contains: term, mode: 'insensitive' } },
        ],
      },
      select: { id: true, username: true, displayName: true, isVerified: true },
      take: Math.min(limit, 20),
      orderBy: { displayName: 'asc' },
    });
    return { data };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.passwordHash) throw new BadRequestException('This account uses social login — password cannot be changed here');
    const valid = await argon2.verify(user.passwordHash, currentPassword);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');
    const newHash = await argon2.hash(newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });
    return { ok: true };
  }

  // A user's answers with the question they belong to (profile "Answers" tab).
  async answersOf(username: string, limit = 20) {
    const user = await this.prisma.user.findFirst({ where: { username, deletedAt: null }, select: { id: true } });
    if (!user) throw new NotFoundException('User not found');
    const data = await this.prisma.answer.findMany({
      where: { authorId: user.id, status: 'PUBLISHED', deletedAt: null, post: { status: 'PUBLISHED', deletedAt: null } },
      select: { id: true, body: true, voteScore: true, isAccepted: true, createdAt: true, post: { select: { seoSlug: true, title: true } } },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit || 20, 1), 50),
    });
    return { data };
  }
}
