import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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

  async listCollections(userId: string) {
    const rows = await this.prisma.bookmarkCollection.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, _count: { select: { bookmarks: true } } },
    });
    return { data: rows.map((r) => ({ id: r.id, name: r.name, count: r._count.bookmarks })) };
  }

  async createCollection(userId: string, name: string) {
    const trimmed = (name ?? '').trim();
    if (trimmed.length < 1 || trimmed.length > 40) throw new BadRequestException('Name must be 1–40 characters');
    try {
      const c = await this.prisma.bookmarkCollection.create({ data: { userId, name: trimmed }, select: { id: true, name: true } });
      return { ...c, count: 0 };
    } catch {
      throw new BadRequestException('You already have a collection with that name');
    }
  }

  // Deleting a collection keeps its bookmarks (they become unsorted).
  async deleteCollection(userId: string, collectionId: string) {
    const { count } = await this.prisma.bookmarkCollection.deleteMany({ where: { id: collectionId, userId } });
    if (!count) throw new NotFoundException('Collection not found');
    return { deleted: true };
  }

  async setCollection(userId: string, postId: string, collectionId: string | null) {
    if (collectionId) {
      const owned = await this.prisma.bookmarkCollection.findFirst({ where: { id: collectionId, userId }, select: { id: true } });
      if (!owned) throw new ForbiddenException('Collection not found');
    }
    const { count } = await this.prisma.bookmark.updateMany({ where: { userId, postId }, data: { collectionId } });
    if (!count) throw new NotFoundException('Save the question first');
    return { postId, collectionId };
  }

  async findByUser(userId: string, cursor?: string, limit = 20, collection?: string) {
    const collectionFilter = collection === 'none' ? { collectionId: null } : collection ? { collectionId: collection } : {};
    const whereClause = { userId, ...collectionFilter, ...(cursor && { createdAt: { lt: new Date(cursor) } }) };

    const bookmarks = await this.prisma.bookmark.findMany({
      where: whereClause,
      select: {
        createdAt: true,
        collectionId: true,
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
