import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class BookmarksService {
  private prisma = new PrismaClient();

  async upsert(userId: string, postId: string) {
    const result = await this.prisma.bookmark.upsert({
      where: { userId_postId: { userId, postId } },
      create: { userId, postId },
      update: {},
      select: { id: true },
    });
    return { bookmarked: true, id: result.id };
  }

  async remove(userId: string, postId: string) {
    await this.prisma.bookmark.deleteMany({ where: { userId, postId } });
    return { bookmarked: false };
  }

  async status(userId: string, postId: string) {
    const b = await this.prisma.bookmark.findUnique({ where: { userId_postId: { userId, postId } }, select: { id: true } });
    return { bookmarked: !!b };
  }

  async findByUser(userId: string, cursor?: string, limit = 20) {
    const whereClause = { userId, ...(cursor && { createdAt: { lt: new Date(cursor) } }) };

    const bookmarks = await this.prisma.bookmark.findMany({
      where: whereClause,
      select: {
        createdAt: true,
        post: {
          select: {
            id: true, seoSlug: true, title: true, body: true, language: true, voteScore: true, answerCount: true,
            viewCount: true, createdAt: true, status: true, deletedAt: true,
            author: { select: { id: true, username: true, displayName: true } },
            community: { select: { id: true, slug: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = bookmarks.length > limit;
    const data = bookmarks.slice(0, limit);
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].createdAt.toISOString() : null;

    return { data, nextCursor };
  }
}
