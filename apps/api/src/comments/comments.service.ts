import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { LanguageService } from '../shared/language.service';

@Injectable()
export class CommentsService {
  private prisma = new PrismaClient();

  constructor(private languageService: LanguageService) {}

  async create(dto: Record<string, unknown>, authorId: string) {
    const { body, postId, answerId, parentId } = dto;
    const contentProcessed = this.languageService.processContent(body as string);

    if (parentId) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: parentId as string },
        select: { parentId: true },
      });
      if (parent?.parentId) throw new BadRequestException('Max depth is 2');
    }

    const comment = await this.prisma.comment.create({
      data: {
        body: body as string,
        ...contentProcessed,
        postId: postId as string,
        answerId: answerId as string,
        parentId: parentId as string,
        authorId,
        status: 'PUBLISHED',
      },
      select: { id: true },
    });

    if (answerId) {
      await this.prisma.answer.update({
        where: { id: answerId as string },
        data: { commentCount: { increment: 1 } },
      });
    } else if (postId) {
      await this.prisma.post.update({
        where: { id: postId as string },
        data: { commentCount: { increment: 1 } },
      });
    }

    return comment;
  }

  async findByPost(postId: string, cursor?: string, limit = 20) {
    const whereClause = { postId, status: 'PUBLISHED' as const, deletedAt: null, parentId: null, ...(cursor && { createdAt: { lt: new Date(cursor) } }) };

    const comments = await this.prisma.comment.findMany({
      where: whereClause,
      select: { id: true, body: true, voteScore: true, createdAt: true, author: { select: { id: true, username: true } }, replies: { select: { id: true, body: true, author: { select: { username: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = comments.length > limit;
    const data = comments.slice(0, limit);
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].createdAt.toISOString() : null;

    return { data, nextCursor };
  }

  async findByAnswer(answerId: string, cursor?: string, limit = 20) {
    const whereClause = { answerId, status: 'PUBLISHED' as const, deletedAt: null, parentId: null, ...(cursor && { createdAt: { lt: new Date(cursor) } }) };

    const comments = await this.prisma.comment.findMany({
      where: whereClause,
      select: { id: true, body: true, voteScore: true, createdAt: true, author: { select: { username: true } }, replies: { select: { body: true, author: { select: { username: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = comments.length > limit;
    const data = comments.slice(0, limit);
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].createdAt.toISOString() : null;

    return { data, nextCursor };
  }

  async softDelete(id: string, authorId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      select: { authorId: true, postId: true, answerId: true },
    });

    if (!comment || comment.authorId !== authorId) throw new BadRequestException('Not authorized');

    await this.prisma.comment.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'DELETED' },
    });
  }
}
