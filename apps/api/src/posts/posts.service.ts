import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { LanguageService } from '../shared/language.service';
import slug from 'slug';
import { customAlphabet } from 'nanoid';

@Injectable()
export class PostsService {
  private prisma = new PrismaClient();
  private nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10);

  constructor(private languageService: LanguageService) {}

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
      for (const tagName of tags.slice(0, 5)) {
        const tag = await this.prisma.tag.upsert({
          where: { name: tagName as string },
          create: { name: tagName as string, slug: slug(tagName as string, { lower: true }) },
          update: {},
          select: { id: true },
        });
        await this.prisma.postTag.create({ data: { postId: post.id, tagId: tag.id } });
      }
    }

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

  async findBySlug(seoSlug: string) {
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
        createdAt: true,
        deletedAt: true,
        author: { select: { id: true, username: true, displayName: true } },
        community: { select: { id: true, slug: true, name: true } },
        tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
        _count: { select: { answers: true, comments: true } },
      },
    });

    if (!post || post.deletedAt) throw new NotFoundException('Post not found');
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
}
