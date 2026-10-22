import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaClient } from '@prisma/client';
import { LanguageService } from '../shared/language.service';
import { transliterate } from '../lib/transliterate';
import slug from 'slug';
import { customAlphabet } from 'nanoid';

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
        status: 'PUBLISHED',
      },
      select: { id: true, seoSlug: true, title: true, authorId: true },
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

    await this.embeddingQueue.add(
      { type: 'POST', id: post.id, text: `${title} ${body}` },
      { removeOnComplete: true, removeOnFail: false },
    );
    await this.duplicateQueue.add(
      { postId: post.id },
      { removeOnComplete: true, removeOnFail: false, delay: 5000 },
    );

    return post;
  }

  async findFeed(cursor?: string, communityId?: string, limit = 20) {
    const whereClause = {
      status: 'PUBLISHED' as const,
      deletedAt: null,
      ...(communityId && { communityId }),
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

  async findBySlug(seoSlug: string, countView = true) {
    const post = await this.prisma.post.findUnique({
      where: { seoSlug },
      select: {
        id: true,
        seoSlug: true,
        title: true,
        body: true,
        language: true,
        isManglish: true,
        voteScore: true,
        answerCount: true,
        commentCount: true,
        viewCount: true,
        followerCount: true,
        createdAt: true,
        deletedAt: true,
        author: { select: { id: true, username: true, displayName: true, isVerified: true } },
        community: { select: { id: true, slug: true, name: true } },
        tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
        _count: { select: { answers: true, comments: true } },
      },
    });

    if (!post || post.deletedAt) throw new NotFoundException('Post not found');
    // Count the view without slowing the response.
    if (countView) void this.prisma.post.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } }).catch(() => undefined);
    return post;
  }

  async update(id: string, dto: Record<string, unknown>, authorId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      select: { authorId: true },
    });

    if (!post || post.authorId !== authorId) throw new Error('Not authorized');

    const updateData: Record<string, unknown> = {};
    if (dto.title || dto.body) {
      const contentProcessed = this.languageService.processContent(`${dto.title || ''} ${dto.body || ''}`);
      Object.assign(updateData, contentProcessed);
    }
    if (dto.type) updateData.type = dto.type;

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

  async getSimilarPosts(postId: string, limit = 5) {
    const candidates = await this.prisma.duplicateCandidate.findMany({
      where: { sourcePostId: postId, status: 'PENDING' },
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

    // Apply Manglish → Malayalam transliteration
    const transliteratedQuery = transliterate(query.trim());
    const searchQuery = `${query.trim()} ${transliteratedQuery}`;

    // Use raw SQL for trigram-based full-text search with typo tolerance
    const whereClause = [
      'p.status = \'PUBLISHED\'',
      'p.deletedAt IS NULL',
      `(p.title % $1 OR p.title ILIKE $2 OR p.body % $1 OR p.body ILIKE $2 OR a.body % $1 OR a.body ILIKE $2)`,
      ...(communityId ? ['p.communityId = $3'] : [])
    ].join(' AND ');

    const offset_idx = communityId ? 4 : 3;
    const limit_idx = communityId ? 5 : 4;

    const countQuery = `
      SELECT COUNT(DISTINCT p.id) as total FROM "Post" p
      LEFT JOIN "Answer" a ON p.id = a.postId AND a.status = 'PUBLISHED' AND a.deletedAt IS NULL
      WHERE ${whereClause}
    `;

    const dataQuery = `
      SELECT DISTINCT
        p.id, p.title, p.body, p.seoSlug, p.viewCount,
        (p.title % $1)::float +
        (p.body % $1)::float +
        (COALESCE(MAX(a.body % $1), 0))::float as relevance
      FROM "Post" p
      LEFT JOIN "Answer" a ON p.id = a.postId AND a.status = 'PUBLISHED' AND a.deletedAt IS NULL
      WHERE ${whereClause}
      GROUP BY p.id, p.title, p.body, p.seoSlug, p.viewCount
      ORDER BY relevance DESC, p.viewCount DESC
      LIMIT $${limit_idx} OFFSET $${offset_idx}
    `;

    const params = [
      searchQuery,
      `%${query.trim()}%`,
      ...(communityId ? [communityId] : []),
      limit,
      offset
    ];

    const [countResult, posts] = await Promise.all([
      this.prisma.$queryRawUnsafe(countQuery, ...params.slice(0, communityId ? 3 : 2)),
      this.prisma.$queryRawUnsafe(dataQuery, ...params) as Promise<Array<{
        id: string; title: string; body: string; seoSlug: string; viewCount: number; relevance: number;
      }>>
    ]);

    const total = (countResult as Array<{ total: number }>)[0]?.total || 0;

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
}
