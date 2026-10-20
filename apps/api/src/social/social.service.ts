import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const POST_CARD = {
  id: true, seoSlug: true, title: true, body: true, language: true, voteScore: true,
  answerCount: true, viewCount: true, followerCount: true, createdAt: true,
  author: { select: { id: true, username: true, displayName: true, isVerified: true } },
  community: { select: { id: true, slug: true, name: true } },
} as const;
const LIVE = { status: 'PUBLISHED' as const, deletedAt: null };
const clamp = (n: number | undefined, d: number) => Math.min(Math.max(Number(n) || d, 1), 50);

@Injectable()
export class SocialService {
  private prisma = new PrismaClient();

  private async interests(userId: string) {
    const [members, tags, people] = await Promise.all([
      this.prisma.communityMember.findMany({ where: { userId }, select: { communityId: true } }),
      this.prisma.tagFollow.findMany({ where: { userId }, select: { tagId: true } }),
      this.prisma.follow.findMany({ where: { followerId: userId }, select: { followingId: true } }),
    ]);
    return {
      communityIds: members.map((m) => m.communityId),
      tagIds: tags.map((t) => t.tagId),
      userIds: people.map((p) => p.followingId),
    };
  }

  // Questions from people, communities and topics I follow (newest first).
  async followingFeed(userId: string, cursor?: string, limit?: number) {
    const take = clamp(limit, 20);
    const { communityIds, tagIds, userIds } = await this.interests(userId);
    const or = [
      ...(userIds.length ? [{ authorId: { in: userIds } }] : []),
      ...(communityIds.length ? [{ communityId: { in: communityIds } }] : []),
      ...(tagIds.length ? [{ tags: { some: { tagId: { in: tagIds } } } }] : []),
    ];
    if (!or.length) return { data: [], nextCursor: null, empty: true };
    const rows = await this.prisma.post.findMany({
      where: { ...LIVE, OR: or, ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}) },
      select: POST_CARD,
      orderBy: { createdAt: 'desc' },
      take: take + 1,
    });
    const data = rows.slice(0, take);
    return { data, nextCursor: rows.length > take ? data[data.length - 1].createdAt.toISOString() : null, empty: false };
  }

  // "Questions for you": few/no answers, in my communities/topics, not mine, not passed, not already answered by me.
  async questionsForYou(userId: string, limit?: number) {
    const take = clamp(limit, 20);
    const { communityIds, tagIds } = await this.interests(userId);
    const base = {
      ...LIVE,
      authorId: { not: userId },
      passes: { none: { userId } },
      answers: { none: { authorId: userId, deletedAt: null } },
      answerCount: { lt: 5 },
    };
    const or = [
      ...(communityIds.length ? [{ communityId: { in: communityIds } }] : []),
      ...(tagIds.length ? [{ tags: { some: { tagId: { in: tagIds } } } }] : []),
    ];
    const order = [{ answerCount: 'asc' as const }, { followerCount: 'desc' as const }, { createdAt: 'desc' as const }];
    const mine = or.length ? await this.prisma.post.findMany({ where: { ...base, OR: or }, select: POST_CARD, orderBy: order, take }) : [];
    if (mine.length >= take) return { data: mine, personalised: true };
    // Top up with any open question so the page is never empty.
    const more = await this.prisma.post.findMany({
      where: { ...base, id: { notIn: mine.map((p) => p.id) } },
      select: POST_CARD,
      orderBy: order,
      take: take - mine.length,
    });
    return { data: [...mine, ...more], personalised: mine.length > 0 };
  }

  // ---- question follow / pass ----
  async followQuestion(userId: string, postId: string) {
    const post = await this.prisma.post.findFirst({ where: { id: postId, ...LIVE }, select: { id: true } });
    if (!post) throw new NotFoundException('Question not found');
    const existing = await this.prisma.questionFollow.findUnique({ where: { userId_postId: { userId, postId } } });
    if (!existing) {
      await this.prisma.$transaction([
        this.prisma.questionFollow.create({ data: { userId, postId } }),
        this.prisma.post.update({ where: { id: postId }, data: { followerCount: { increment: 1 } } }),
      ]);
    }
    return this.questionStatus(userId, postId);
  }

  async unfollowQuestion(userId: string, postId: string) {
    const { count } = await this.prisma.questionFollow.deleteMany({ where: { userId, postId } });
    if (count) await this.prisma.post.updateMany({ where: { id: postId, followerCount: { gt: 0 } }, data: { followerCount: { decrement: 1 } } });
    return this.questionStatus(userId, postId);
  }

  async questionStatus(userId: string, postId: string) {
    const [follow, post] = await Promise.all([
      this.prisma.questionFollow.findUnique({ where: { userId_postId: { userId, postId } }, select: { id: true } }),
      this.prisma.post.findUnique({ where: { id: postId }, select: { followerCount: true } }),
    ]);
    return { following: !!follow, followerCount: post?.followerCount ?? 0 };
  }

  async passQuestion(userId: string, postId: string) {
    await this.prisma.questionPass.upsert({ where: { userId_postId: { userId, postId } }, create: { userId, postId }, update: {} });
    return { passed: true };
  }

  // ---- topics ----
  async followTag(userId: string, slug: string, follow: boolean) {
    const tag = await this.prisma.tag.findUnique({ where: { slug }, select: { id: true } });
    if (!tag) throw new NotFoundException('Topic not found');
    if (follow) await this.prisma.tagFollow.upsert({ where: { userId_tagId: { userId, tagId: tag.id } }, create: { userId, tagId: tag.id }, update: {} });
    else await this.prisma.tagFollow.deleteMany({ where: { userId, tagId: tag.id } });
    return this.tagStatus(userId, slug);
  }

  async tagStatus(userId: string, slug: string) {
    const tag = await this.prisma.tag.findUnique({ where: { slug }, select: { id: true, _count: { select: { followers: true } } } });
    if (!tag) throw new NotFoundException('Topic not found');
    const row = await this.prisma.tagFollow.findUnique({ where: { userId_tagId: { userId, tagId: tag.id } }, select: { id: true } });
    return { following: !!row, followerCount: tag._count.followers };
  }

  // ---- onboarding ----
  async myInterests(userId: string) {
    const [user, ids] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { onboardedAt: true } }),
      this.interests(userId),
    ]);
    return { onboarded: !!user?.onboardedAt, communityIds: ids.communityIds, tagIds: ids.tagIds };
  }

  // Joins the chosen communities and follows the chosen topics, then marks onboarding done.
  async completeOnboarding(userId: string, communityIds: string[], tagIds: string[]) {
    if (communityIds.length + tagIds.length < 3) throw new BadRequestException('Pick at least 3 interests');
    const communities = await this.prisma.community.findMany({ where: { id: { in: communityIds.slice(0, 30) }, deletedAt: null }, select: { id: true } });
    const tags = await this.prisma.tag.findMany({ where: { id: { in: tagIds.slice(0, 30) } }, select: { id: true } });
    const existing = new Set(
      (await this.prisma.communityMember.findMany({ where: { userId, communityId: { in: communities.map((c) => c.id) } }, select: { communityId: true } })).map((m) => m.communityId),
    );
    const toJoin = communities.filter((c) => !existing.has(c.id));
    await this.prisma.$transaction([
      ...toJoin.flatMap((c) => [
        this.prisma.communityMember.create({ data: { userId, communityId: c.id } }),
        this.prisma.community.update({ where: { id: c.id }, data: { memberCount: { increment: 1 } } }),
      ]),
      this.prisma.tagFollow.createMany({ data: tags.map((t) => ({ userId, tagId: t.id })), skipDuplicates: true }),
      this.prisma.user.update({ where: { id: userId }, data: { onboardedAt: new Date() } }),
    ]);
    return { onboarded: true, joined: toJoin.length, topics: tags.length };
  }

  async skipOnboarding(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { onboardedAt: new Date() } });
    return { onboarded: true };
  }
}
