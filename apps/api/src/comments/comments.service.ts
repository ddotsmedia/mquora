import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const AUTHOR = { select: { id: true, username: true, displayName: true } } as const;
const LIVE = { status: 'PUBLISHED' as const, deletedAt: null };
const COMMENT = {
  id: true, body: true, voteScore: true, createdAt: true, author: AUTHOR,
  replies: { where: LIVE, select: { id: true, body: true, createdAt: true, author: AUTHOR }, orderBy: { createdAt: 'asc' as const } },
} as const;

export interface CreateCommentInput { body: string; postId?: string; answerId?: string; parentId?: string }

@Injectable()
export class CommentsService {
  private prisma = new PrismaClient();

  async create(dto: CreateCommentInput, authorId: string) {
    const body = dto.body.trim();
    if (!body) throw new BadRequestException('Comment cannot be empty');
    let { postId, answerId } = dto;
    let parentAuthorId: string | null = null;

    // A reply inherits its target from the parent; only one level of replies.
    if (dto.parentId) {
      const parent = await this.prisma.comment.findFirst({
        where: { id: dto.parentId, ...LIVE },
        select: { parentId: true, postId: true, answerId: true, authorId: true },
      });
      if (!parent) throw new NotFoundException('Comment not found');
      if (parent.parentId) throw new BadRequestException('Replies can only be one level deep');
      postId = parent.postId ?? undefined;
      answerId = parent.answerId ?? undefined;
      parentAuthorId = parent.authorId;
    }
    if (!!postId === !!answerId) throw new BadRequestException('Comment on either a question or an answer');

    // Find where the comment lives (for counters and notifications).
    let ownerId: string;
    let link: string;
    if (answerId) {
      const a = await this.prisma.answer.findFirst({ where: { id: answerId, ...LIVE }, select: { authorId: true, post: { select: { seoSlug: true } } } });
      if (!a) throw new NotFoundException('Answer not found');
      ownerId = a.authorId;
      link = `/q/${a.post.seoSlug}`;
    } else {
      const p = await this.prisma.post.findFirst({ where: { id: postId, ...LIVE }, select: { authorId: true, seoSlug: true } });
      if (!p) throw new NotFoundException('Question not found');
      ownerId = p.authorId;
      link = `/q/${p.seoSlug}`;
    }

    const comment = await this.prisma.$transaction(async (tx) => {
      const c = await tx.comment.create({
        data: { body, postId: postId ?? null, answerId: answerId ?? null, parentId: dto.parentId ?? null, authorId, status: 'PUBLISHED' },
        select: { id: true, body: true, createdAt: true, author: AUTHOR },
      });
      if (answerId) await tx.answer.update({ where: { id: answerId }, data: { commentCount: { increment: 1 } } });
      else await tx.post.update({ where: { id: postId! }, data: { commentCount: { increment: 1 } } });
      return c;
    });

    // Notify the reply's parent author, or else the content owner (never yourself).
    const notifyId = parentAuthorId ?? ownerId;
    if (notifyId !== authorId) {
      await this.prisma.notification
        .create({
          data: {
            userId: notifyId,
            type: 'COMMENT',
            title: parentAuthorId ? 'New reply to your comment' : `New comment on your ${answerId ? 'answer' : 'question'}`,
            body: `${comment.author.displayName}: ${body.slice(0, 140)}`,
            link,
          },
        })
        .catch(() => undefined);
    }
    return comment;
  }

  private async list(where: { postId?: string; answerId?: string }, cursor?: string, limit = 20) {
    limit = Math.min(Math.max(limit || 20, 1), 50);
    const comments = await this.prisma.comment.findMany({
      where: { ...where, ...LIVE, parentId: null, ...(cursor && { createdAt: { gt: new Date(cursor) } }) },
      select: COMMENT,
      orderBy: { createdAt: 'asc' },
      take: limit + 1,
    });
    const hasMore = comments.length > limit;
    const data = comments.slice(0, limit);
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].createdAt.toISOString() : null;
    return { data, nextCursor };
  }

  findByPost(postId: string, cursor?: string, limit = 20) {
    return this.list({ postId }, cursor, limit);
  }

  findByAnswer(answerId: string, cursor?: string, limit = 20) {
    return this.list({ answerId }, cursor, limit);
  }

  // Authors delete their own comments; moderators and admins can delete any.
  async softDelete(id: string, userId: string, role?: string) {
    const comment = await this.prisma.comment.findFirst({ where: { id, ...LIVE }, select: { authorId: true, postId: true, answerId: true } });
    if (!comment) throw new NotFoundException('Comment not found');
    const staff = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'COMMUNITY_MODERATOR';
    if (comment.authorId !== userId && !staff) throw new ForbiddenException('Not allowed');

    await this.prisma.$transaction(async (tx) => {
      await tx.comment.update({ where: { id }, data: { deletedAt: new Date(), status: 'DELETED' } });
      if (comment.answerId) await tx.answer.updateMany({ where: { id: comment.answerId, commentCount: { gt: 0 } }, data: { commentCount: { decrement: 1 } } });
      else if (comment.postId) await tx.post.updateMany({ where: { id: comment.postId, commentCount: { gt: 0 } }, data: { commentCount: { decrement: 1 } } });
    });
    return { deleted: true };
  }
}
