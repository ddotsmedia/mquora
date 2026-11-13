import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Prisma, PrismaClient } from '@prisma/client';
import { LanguageService } from '../shared/language.service';
import { transliterate } from '../lib/transliterate';
import slug from 'slug';
import { customAlphabet } from 'nanoid';
import { recordActivity } from '../shared/streaks';

@Injectable()
export class PostsService {
  private prisma = new PrismaClient();
  private nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10);

  constructor(
    private languageService: LanguageService,
    @InjectQueue('generate-embedding') private embeddingQueue: Queue,
    @InjectQueue('duplicate-detection') private duplicateQueue: Queue,
  ) {}

  async create(dto: Record<string, unknown>, authorId: string) {
    const { body, title, type, communityId, tags } = dto;
    const isAnonymous = dto.isAnonymous === true;
    const scheduledAt = this.parseSchedule(dto.scheduledAt);
    await this.assertCanPostIn(communityId as string | undefined, authorId);
    await recordActivity(this.prisma, authorId).catch(() => undefined);
    const contentProcessed = this.languageService.processContent(`${title} ${body}`);
    const seoSlug = `${this.nanoid()}-${slug(title as string, { lower: true }).slice(0, 50)}`;

    const post = await this.prisma.post.create({
      data: {
        authorId,
        communityId: communityId as string,
        title: title as string,
        body: body as string,
        type: type as string,
        ...contentProcessed,
        seoSlug,
        isAnonymous,
        scheduledAt,
        // Scheduled questions stay as drafts until the publisher releases them.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: (scheduledAt ? 'DRAFT' : await this.resolvePostStatus(dto, authorId)) as any,
      },
      select: { id: true, seoSlug: true, title: true, authorId: true, status: true },
    });

    if (tags && Array.isArray(tags) && tags.length > 0) {
      const names = [...new Set((tags as unknown[]).map((t) => String(t).trim()).filter(Boolean))].slice(0, 5);
      for (const tagName of names) {
        const tag = await this.prisma.tag.upsert({
          where: { name: tagName },
          create: { name: tagName, slug: slug(tagName, { lower: true }) || this.nanoid() },
          update: {},
          select: { id: true },
        });
        await this.prisma.postTag.create({ data: { postId: post.id, tagId: tag.id } });
        await this.prisma.tag.update({ where: { id: tag.id }, data: { postCount: { increment: 1 } } });
      }
    }
    // Keep community counters right and let the asker follow their own question.
    if (communityId) await this.prisma.community.update({ where: { id: communityId as string }, data: { postCount: { increment: 1 } } }).catch(() => undefined);
    await this.prisma.questionFollow.create({ data: { userId: authorId, postId: post.id } }).catch(() => undefined);
    await this.prisma.post.update({ where: { id: post.id }, data: { followerCount: 1 } }).catch(() => undefined);

    // Notify admins about new question pending review (fire-and-forget)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((post.status as string) === 'PENDING_REVIEW') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.prisma as any).adminNotification.create({ // eslint-disable-line
        data: {
          type: 'NEW_QUESTION',
          title: 'New question pending review',
          body: `"${post.title}" is awaiting approval`,
          link: `/admin/content?id=${post.id}`,
          relatedPostId: post.id,
        },
      }).catch(() => undefined);
    }

    await this.embeddingQueue.add(
      { type: 'POST', id: post.id, text: `${title} ${body}` },
      { removeOnComplete: true, removeOnFail: false },
    );
    await this.duplicateQueue.add(
      { postId: post.id },
      { removeOnComplete: true, removeOnFail: false, delay: 5000 },
    );

    // IndexNow ping (fire-and-forget) — notifies Bing/Yandex of new content instantly
    if ((post.status as string) === 'PUBLISHED') {
      void this.pingIndexNow(post.seoSlug).catch(() => undefined);
    }

    return post;
  }

  async findFeed(cursor?: string, communityId?: string, limit = 20, language?: string, viewerId?: string) {
    const hidden = await this.hiddenAuthorIds(viewerId);
    const langs = ['MALAYALAM', 'ENGLISH', 'MANGLISH', 'MIXED'];
    const whereClause = {
      status: 'PUBLISHED' as const,
      deletedAt: null,
      ...(communityId && { communityId }),
      ...(language && langs.includes(language) && { language: language as 'MALAYALAM' | 'ENGLISH' | 'MANGLISH' | 'MIXED' }),
      ...(hidden.length && { authorId: { notIn: hidden } }),
      ...(cursor && { createdAt: { lt: new Date(cursor) } }),
    };

    const posts = await this.prisma.post.findMany({
      where: whereClause,
      select: {
        id: true,
        seoSlug: true,
        title: true,
        body: true,
        language: true,
        voteScore: true,
        answerCount: true,
        viewCount: true,
        createdAt: true,
        isAnonymous: true,
        author: { select: { id: true, username: true, displayName: true } },
        community: { select: { id: true, slug: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = posts.length > limit;
    const data = posts.slice(0, limit);
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].createdAt.toISOString() : null;

    return { data, nextCursor };
  }

  /** Locks or unlocks a question so no new answers can be added. Allowed for the asker, a community moderator or creator, and admins. */
  async setLocked(postId: string, userId: string, locked: boolean, reason?: string) {
    const post = await this.prisma.post.findFirst({ where: { id: postId, deletedAt: null }, select: { authorId: true, communityId: true } });
    if (!post) throw new NotFoundException('Question not found');
    const allowed = post.authorId === userId || (await this.canModerate(post.communityId, userId));
    if (!allowed) throw new ForbiddenException('Only the asker or a moderator can lock this question');
    await this.prisma.post.update({
      where: { id: postId },
      data: {
        isLocked: locked,
        lockedById: locked ? userId : null,
        lockedAt: locked ? new Date() : null,
        lockReason: locked ? (reason?.trim().slice(0, 200) || null) : null,
      },
    });
    return { locked };
  }

  private async canModerate(communityId: string | null, userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role === 'ADMIN') return true;
    if (!communityId) return false;
    const community = await this.prisma.community.findUnique({ where: { id: communityId }, select: { createdBy: true } });
    if (community?.createdBy === userId) return true;
    const membership = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
      select: { role: true },
    });
    return membership?.role === 'MODERATOR';
  }

  // Only published posts are public. A draft, pending or scheduled post is visible to its author only.
  async findBySlug(seoSlug: string, countView = true, viewerId?: string) {
    const post = await this.prisma.post.findUnique({
      where: { seoSlug },
      select: {
        id: true,
        seoSlug: true,
        title: true,
        body: true,
        status: true,
        isLocked: true,
        lockReason: true,
        language: true,
        isManglish: true,
        voteScore: true,
        answerCount: true,
        commentCount: true,
        viewCount: true,
        followerCount: true,
        createdAt: true,
        deletedAt: true,
        isAnonymous: true,
        author: { select: { id: true, username: true, displayName: true, isVerified: true } },
        community: { select: { id: true, slug: true, name: true } },
        tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
        _count: { select: { answers: true, comments: true } },
      },
    });

    const isOwnerPreview = !!post && !!viewerId && post.author.id === viewerId;
    const hidden = !post || post.deletedAt || (post.status !== 'PUBLISHED' && !isOwnerPreview);
    if (hidden) {
      // Merged duplicates: point visitors to the question they were merged into.
      const merged = await this.prisma.duplicateCandidate.findFirst({
        where: { status: 'MERGED', sourcePost: { seoSlug } },
        select: { targetPost: { select: { seoSlug: true, title: true } } },
      });
      if (merged) return { mergedInto: merged.targetPost };
      throw new NotFoundException('Post not found');
    }
    // Count the view without slowing the response. Previews by the author do not count.
    if (countView && post.status === 'PUBLISHED' && !isOwnerPreview) {
      void this.prisma.$transaction([
        this.prisma.post.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } }),
        this.prisma.postView.create({ data: { postId: post.id } }),
      ]).catch(() => undefined);
    }
    return post;
  }

  async update(id: string, dto: Record<string, unknown>, authorId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      select: { authorId: true, status: true, title: true, body: true },
    });

    if (!post || post.authorId !== authorId) throw new Error('Not authorized');

    const updateData: Record<string, unknown> = {};
    if (dto.title || dto.body) {
      const contentProcessed = this.languageService.processContent(`${dto.title || ''} ${dto.body || ''}`);
      Object.assign(updateData, contentProcessed);
    }
    if (dto.type) updateData.type = dto.type;

    // An edit to a live post goes through the same policy as a new post, so a
    // clean post cannot be changed after approval to add spam or links.
    const contentChanged = dto.title !== undefined || dto.body !== undefined;
    if (contentChanged && post.status === 'PUBLISHED') {
      updateData.status = await this.resolvePostStatus(
        { title: dto.title ?? post.title, body: dto.body ?? post.body },
        authorId,
      );
    }

    return this.prisma.post.update({
      where: { id },
      data: updateData,
      select: { id: true, seoSlug: true },
    });
  }

  async softDelete(id: string, authorId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      select: { authorId: true },
    });

    if (!post || post.authorId !== authorId) throw new Error('Not authorized');

    return this.prisma.post.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'DELETED' },
      select: { id: true },
    });
  }

  // A reader says this question duplicates another. Queued for admin review; nothing merges automatically.
  async reportDuplicate(sourceId: string, targetSeoSlug: string, userId: string) {
    const [source, target] = await Promise.all([
      this.prisma.post.findFirst({ where: { id: sourceId, status: 'PUBLISHED', deletedAt: null }, select: { id: true } }),
      this.prisma.post.findFirst({ where: { seoSlug: targetSeoSlug, status: 'PUBLISHED', deletedAt: null }, select: { id: true } }),
    ]);
    if (!source) throw new NotFoundException('Question not found');
    if (!target) throw new NotFoundException('Original question not found. Check the link or slug.');
    if (source.id === target.id) throw new BadRequestException('A question cannot duplicate itself');

    await this.prisma.duplicateCandidate.upsert({
      where: { sourcePostId_targetPostId: { sourcePostId: source.id, targetPostId: target.id } },
      create: { sourcePostId: source.id, targetPostId: target.id, score: 1, status: 'PENDING', reportedBy: userId },
      update: {},
    });
    return { reported: true };
  }

  private async hiddenAuthorIds(viewerId?: string): Promise<string[]> {
    if (!viewerId) return [];
    const rows = await this.prisma.userBlock.findMany({
      where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
      select: { blockerId: true, blockedId: true },
    });
    return [...new Set(rows.map((r) => (r.blockerId === viewerId ? r.blockedId : r.blockerId)))];
  }

  // Records that a signed-in user opened a question (one row per user and question).
  async recordVisit(postId: string, userId: string) {
    const post = await this.prisma.post.findFirst({ where: { id: postId, status: 'PUBLISHED', deletedAt: null }, select: { id: true } });
    if (!post) throw new NotFoundException('Question not found');
    await this.prisma.questionVisit.upsert({
      where: { userId_postId: { userId, postId } },
      create: { userId, postId },
      update: { visitedAt: new Date() },
    });
    return { ok: true };
  }

  async myHistory(userId: string, limit = 50) {
    const rows = await this.prisma.questionVisit.findMany({
      where: { userId, post: { status: 'PUBLISHED', deletedAt: null } },
      orderBy: { visitedAt: 'desc' },
      take: limit,
      select: {
        visitedAt: true,
        post: { select: { id: true, seoSlug: true, title: true, answerCount: true, voteScore: true } },
      },
    });
    return { data: rows.map((r) => ({ visitedAt: r.visitedAt, ...r.post })) };
  }

  async getSimilarPosts(postId: string, limit = 5) {
    const candidates = await this.prisma.duplicateCandidate.findMany({
      where: { sourcePostId: postId, status: 'PENDING', reportedBy: null },
      orderBy: { score: 'desc' },
      take: limit,
      select: { targetPostId: true, score: true },
    });

    if (!candidates.length) return [];

    const posts = await this.prisma.post.findMany({
      where: { id: { in: candidates.map((c) => c.targetPostId) }, deletedAt: null },
      select: {
        id: true,
        seoSlug: true,
        title: true,
        body: true,
        language: true,
        voteScore: true,
        answerCount: true,
        viewCount: true,
        createdAt: true,
        isAnonymous: true,
        author: { select: { id: true, username: true, displayName: true } },
        community: { select: { id: true, slug: true, name: true } },
      },
    });

    return posts.map((p) => ({
      ...p,
      similarity: candidates.find((c) => c.targetPostId === p.id)?.score || 0,
    }));
  }

  // Related questions: shared tags first, then same community. Always returns something useful.
  async getRelated(postId: string, limit = 5) {
    limit = Math.min(Math.max(limit || 5, 1), 10);
    const post = await this.prisma.post.findUnique({ where: { id: postId }, select: { communityId: true, tags: { select: { tagId: true } } } });
    if (!post) return [];
    const select = {
      id: true, seoSlug: true, title: true, answerCount: true, voteScore: true, createdAt: true,
    } as const;
    const base = { id: { not: postId }, status: 'PUBLISHED' as const, deletedAt: null };
    const tagIds = post.tags.map((t) => t.tagId);
    const byTag = tagIds.length
      ? await this.prisma.post.findMany({ where: { ...base, tags: { some: { tagId: { in: tagIds } } } }, select, orderBy: [{ answerCount: 'desc' }, { createdAt: 'desc' }], take: limit })
      : [];
    if (byTag.length >= limit) return byTag;
    const byCommunity = await this.prisma.post.findMany({
      where: { ...base, communityId: post.communityId, id: { notIn: [postId, ...byTag.map((p) => p.id)] } },
      select,
      orderBy: { createdAt: 'desc' },
      take: limit - byTag.length,
    });
    return [...byTag, ...byCommunity];
  }

  async search(query: string, limit = 20, offset = 0, communityId?: string) {
    if (!query?.trim()) return { posts: [], total: 0 };

    // Trigram search with typo tolerance. Every value is bound as a parameter (Prisma.sql), and the
    // column names are quoted to match the camelCase columns Prisma creates.
    const term = query.trim();
    const searchQuery = `${term} ${transliterate(term)}`;
    const likeQuery = `%${term}%`;
    const communityFilter = communityId ? Prisma.sql`AND p."communityId" = ${communityId}` : Prisma.empty;
    const matchFilter = Prisma.sql`(
      p.title % ${searchQuery} OR p.title ILIKE ${likeQuery}
      OR p.body % ${searchQuery} OR p.body ILIKE ${likeQuery}
      OR a.body % ${searchQuery} OR a.body ILIKE ${likeQuery}
    )`;

    const countQuery = Prisma.sql`
      SELECT COUNT(DISTINCT p.id) AS total FROM "Post" p
      LEFT JOIN "Answer" a ON p.id = a."postId" AND a.status = 'PUBLISHED' AND a."deletedAt" IS NULL
      WHERE p.status = 'PUBLISHED' AND p."deletedAt" IS NULL AND ${matchFilter} ${communityFilter}
    `;

    const dataQuery = Prisma.sql`
      SELECT p.id, p.title, p.body, p."seoSlug", p."viewCount",
        (similarity(p.title, ${searchQuery}) + similarity(p.body, ${searchQuery})
          + COALESCE(MAX(similarity(a.body, ${searchQuery})), 0))::float AS relevance
      FROM "Post" p
      LEFT JOIN "Answer" a ON p.id = a."postId" AND a.status = 'PUBLISHED' AND a."deletedAt" IS NULL
      WHERE p.status = 'PUBLISHED' AND p."deletedAt" IS NULL AND ${matchFilter} ${communityFilter}
      GROUP BY p.id, p.title, p.body, p."seoSlug", p."viewCount"
      ORDER BY relevance DESC, p."viewCount" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [countResult, posts] = await Promise.all([
      this.prisma.$queryRaw<Array<{ total: bigint | number }>>(countQuery),
      this.prisma.$queryRaw<Array<{
        id: string; title: string; body: string; seoSlug: string; viewCount: number; relevance: number;
      }>>(dataQuery),
    ]);

    const total = Number(countResult[0]?.total ?? 0);

    // Fetch full post data with community
    const postIds = posts.map((p) => p.id);
    if (postIds.length === 0) return { posts: [], total };

    const fullPosts = await this.prisma.post.findMany({
      where: { id: { in: postIds } },
      select: {
        id: true,
        title: true,
        body: true,
        seoSlug: true,
        viewCount: true,
        community: { select: { id: true, slug: true, name: true } },
      },
    });

    // Preserve search relevance order
    const postMap = new Map(fullPosts.map((p) => [p.id, p]));
    const orderedPosts = posts.map((p) => postMap.get(p.id)).filter(Boolean);

    return {
      posts: orderedPosts,
      total,
    };
  }

  async getQuestionOfTheDay() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const candidates = await this.prisma.post.findMany({
      where: {
        status: 'PUBLISHED',
        deletedAt: null,
        createdAt: { gte: thirtyDaysAgo },
        answers: { some: {} },
      },
      select: {
        id: true,
        seoSlug: true,
        title: true,
        viewCount: true,
        _count: { select: { answers: true } },
      },
      orderBy: [{ viewCount: 'desc' }],
      take: 50,
    });

    if (candidates.length === 0) return null;

    // Filter: min 2 answers
    const filtered = candidates.filter((c) => c._count.answers >= 2);
    if (filtered.length === 0) return null;

    // Pick random from filtered
    const random = filtered[Math.floor(Math.random() * filtered.length)];
    return {
      id: random.id,
      seoSlug: random.seoSlug,
      title: random.title,
      answerCount: random._count.answers,
      viewCount: random.viewCount,
    };
  }

  // Falls back to all-time top questions when nothing was posted this week, so the panel is never empty.
  async getPopularThisWeek(limit = 5) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const select = {
      id: true,
      seoSlug: true,
      title: true,
      viewCount: true,
      language: true,
      _count: { select: { answers: true } },
    };
    const base = { status: 'PUBLISHED' as const, deletedAt: null };
    const week = await this.prisma.post.findMany({
      where: { ...base, createdAt: { gte: sevenDaysAgo } },
      select,
      orderBy: [{ answerCount: 'desc' }, { viewCount: 'desc' }],
      take: limit,
    });
    if (week.length > 0) return { window: 'week' as const, data: week };
    const all = await this.prisma.post.findMany({
      where: base,
      select,
      orderBy: [{ viewCount: 'desc' }, { answerCount: 'desc' }],
      take: limit,
    });
    return { window: 'all' as const, data: all };
  }

  async getRecentQuestions(limit = 20, offset = 0) {
    return this.prisma.post.findMany({
      where: {
        status: 'PUBLISHED',
        deletedAt: null,
      },
      select: {
        id: true,
        seoSlug: true,
        title: true,
        body: true,
        language: true,
        createdAt: true,
        _count: { select: { answers: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async getQuestionsByCategory(limit = 10) {
    const tags = await this.prisma.tag.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { posts: true } },
      },
      orderBy: { postCount: 'desc' },
      take: limit,
    });

    // Get top post per tag
    const result = await Promise.all(
      tags.map(async (tag) => {
        const topPost = await this.prisma.post.findFirst({
          where: { tags: { some: { tagId: tag.id } }, status: 'PUBLISHED', deletedAt: null },
          select: { id: true, seoSlug: true, title: true },
          orderBy: { viewCount: 'desc' },
        });
        return {
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          questionCount: tag._count.posts,
          featuredPost: topPost,
        };
      }),
    );

    return result;
  }

  async findMyDrafts(authorId: string) {
    const data = await this.prisma.post.findMany({
      where: { authorId, status: 'DRAFT', deletedAt: null },
      select: {
        id: true, seoSlug: true, title: true, body: true, createdAt: true, updatedAt: true,
        community: { select: { id: true, slug: true, name: true } },
        tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
    return { data };
  }

  // Same status policy as a new post (spam checks, trust level, pending review). Never publishes directly.
  async publishDraft(id: string, authorId: string) {
    const draft = await this.prisma.post.findFirst({
      where: { id, authorId, status: 'DRAFT', deletedAt: null },
      select: { id: true, title: true, body: true },
    });
    if (!draft) throw new Error('Draft not found');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (await this.resolvePostStatus({ title: draft.title, body: draft.body }, authorId)) as any;
    const claimed = await this.prisma.post.updateMany({
      where: { id, authorId, status: 'DRAFT', deletedAt: null },
      data: { status, scheduledAt: null },
    });
    if (claimed.count === 0) throw new Error('Draft not found');
    const post = await this.prisma.post.findUnique({ where: { id }, select: { id: true, seoSlug: true, status: true } });
    if (post?.status === 'PUBLISHED') void this.pingIndexNow(post.seoSlug).catch(() => undefined);
    return post;
  }

  private parseSchedule(value: unknown): Date | null {
    if (value === undefined || value === null || value === '') return null;
    const date = new Date(String(value));
    if (isNaN(date.getTime())) throw new BadRequestException('Invalid publish time');
    const now = Date.now();
    if (date.getTime() < now + 5 * 60_000) throw new BadRequestException('Scheduled time must be at least 5 minutes from now');
    if (date.getTime() > now + 30 * 86_400_000) throw new BadRequestException('Scheduled time can be at most 30 days ahead');
    return date;
  }

  /** Publishes scheduled questions whose time has come. Safe to run on several instances: each row is claimed by one conditional update. */
  async publishDueScheduled(limit = 50): Promise<number> {
    const due = await this.prisma.post.findMany({
      where: { status: 'DRAFT', scheduledAt: { lte: new Date() }, deletedAt: null },
      select: { id: true, authorId: true, title: true, body: true, seoSlug: true },
      take: limit,
    });
    let published = 0;
    for (const post of due) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const status = (await this.resolvePostStatus({ title: post.title, body: post.body }, post.authorId)) as any;
      const claimed = await this.prisma.post.updateMany({
        where: { id: post.id, status: 'DRAFT', scheduledAt: { not: null } },
        data: { status, scheduledAt: null },
      });
      if (claimed.count === 0) continue;
      published++;
      if (status === 'PUBLISHED') void this.pingIndexNow(post.seoSlug).catch(() => undefined);
      if (status === 'PENDING_REVIEW') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.prisma as any).adminNotification.create({ // eslint-disable-line
          data: {
            type: 'NEW_QUESTION',
            title: 'New question pending review',
            body: `"${post.title}" is awaiting approval`,
            link: `/admin/content?id=${post.id}`,
            relatedPostId: post.id,
          },
        }).catch(() => undefined);
      }
    }
    return published;
  }

  /** Determine post status: DRAFT → DRAFT; spam → PENDING_REVIEW; trusted user → PUBLISHED; else PENDING_REVIEW */
  // A post may go into a community only if it exists and is public, or the author is a member.
  private async assertCanPostIn(communityId: string | undefined, userId: string): Promise<void> {
    if (!communityId) return;
    const community = await this.prisma.community.findFirst({
      where: { id: communityId, deletedAt: null },
      select: { isPublic: true },
    });
    if (!community) throw new BadRequestException('Community not found');
    if (community.isPublic) return;
    const member = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
      select: { id: true },
    });
    if (!member) throw new ForbiddenException('You must join this community to post in it');
  }

  async resolvePostStatus(dto: Record<string, unknown>, authorId: string): Promise<string> {
    if ((dto.status as string) === 'DRAFT') return 'DRAFT';

    // Spam auto-flag: URLs, excessive repeated chars, or very short body → always pending review
    const body = String(dto.body ?? '');
    const title = String(dto.title ?? '');
    const hasUrl = /https?:\/\//i.test(body) || /https?:\/\//i.test(title);
    const hasRepeatedChars = /(.)\1{4,}/.test(body); // 5+ same char in a row
    const tooShort = body.replace(/\s/g, '').length < 15;
    if (hasUrl || hasRepeatedChars || tooShort) return 'PENDING_REVIEW';

    // Trust level: isApproved AND 3+ published posts → publish directly
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: authorId },
        select: { isApproved: true, _count: { select: { posts: { where: { status: 'PUBLISHED' as any } } } } },
      });
      if (user?.isApproved && (user._count?.posts ?? 0) >= 3) return 'PUBLISHED';
    } catch { /* fallback */ }

    return 'PENDING_REVIEW';
  }

  private async pingIndexNow(seoSlug: string): Promise<void> {
    const siteUrl = process.env.SITE_URL || process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_API_URL?.replace('/api', '');
    const key = process.env.INDEXNOW_KEY;
    if (!siteUrl || !key) return;

    const url = `${siteUrl}/q/${seoSlug}`;
    const host = new URL(siteUrl).host;

    // Ping both Bing and Yandex IndexNow endpoints
    const endpoints = [
      'https://www.bing.com/indexnow',
      'https://yandex.com/indexnow',
    ];

    for (const endpoint of endpoints) {
      await fetch(`${endpoint}?url=${encodeURIComponent(url)}&key=${encodeURIComponent(key)}`, {
        method: 'GET',
        headers: { host },
      }).catch(() => undefined);
    }
  }

  async getTrendingTopics(limit = 5) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const tags = await this.prisma.tag.findMany({
      where: {
        posts: {
          some: {
            post: {
              status: 'PUBLISHED',
              deletedAt: null,
              createdAt: { gte: thirtyDaysAgo },
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { posts: true } },
      },
      orderBy: { postCount: 'desc' },
      take: limit,
    });

    return tags;
  }
}
