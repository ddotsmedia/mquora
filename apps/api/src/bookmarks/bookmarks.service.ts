import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class BookmarksService {
  private prisma = new PrismaClient();

  async upsert(userId: string, postId: string) {
    return this.prisma.bookmark.upsert({
      where: { userId_postId: { userId, postId } },
      create: { userId, postId },
      update: {},
      select: { id: true },
    });
  }

  async remove(userId: string, postId: string) {
    await this.prisma.bookmark.delete({
      where: { userId_postId: { userId, postId } },
    });
  }

  async findByUser(userId: string, cursor?: string, limit = 20) {
    const whereClause = { userId, ...(cursor && { createdAt: { lt: new Date(cursor) } }) };

    const bookmarks = await this.prisma.bookmark.findMany({
      where: whereClause,
      select: { post: { select: { id: true, seoSlug: true, title: true, body: true } }, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = bookmarks.length > limit;
    const data = bookmarks.slice(0, limit);
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].createdAt.toISOString() : null;

    return { data, nextCursor };
  }
}
