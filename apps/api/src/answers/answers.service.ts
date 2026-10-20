import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaClient } from '@prisma/client';
import { LanguageService } from '../shared/language.service';

@Injectable()
export class AnswersService {
  private prisma = new PrismaClient();

  constructor(
    private languageService: LanguageService,
    @InjectQueue('generate-embedding') private embeddingQueue: Queue,
    @InjectQueue('answer-quality') private qualityQueue: Queue,
  ) {}

  async create(postId: string, dto: Record<string, unknown>, authorId: string) {
    const { body } = dto;
    const contentProcessed = this.languageService.processContent(body as string);

    const [answer] = await this.prisma.$transaction([
      this.prisma.answer.create({
        data: { postId, authorId, body: body as string, ...contentProcessed, status: 'PUBLISHED' },
        select: { id: true, postId: true },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: { answerCount: { increment: 1 } },
      }),
    ]);

    await this.embeddingQueue.add(
      { type: 'ANSWER', id: answer.id, text: body as string },
      { removeOnComplete: true, removeOnFail: false },
    );
    await this.qualityQueue.add(
      { answerId: answer.id },
      { removeOnComplete: true, removeOnFail: false, delay: 2000 },
    );

    return answer;
  }

  async findByPost(postId: string, cursor?: string, limit = 20) {
    const whereClause = { postId, status: 'PUBLISHED' as const, deletedAt: null, ...(cursor && { createdAt: { gt: new Date(cursor) } }) };

    const answers = await this.prisma.answer.findMany({
      where: whereClause,
      select: { id: true, body: true, language: true, voteScore: true, isAccepted: true, commentCount: true, createdAt: true, author: { select: { id: true, username: true, displayName: true, isVerified: true } } },
      orderBy: { createdAt: 'asc' },
      take: limit + 1,
    });

    const hasMore = answers.length > limit;
    const data = answers.slice(0, limit);
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].createdAt.toISOString() : null;

    return { data, nextCursor };
  }

  // Question author marks one answer as accepted (calling again on the same answer un-accepts it).
  async accept(answerId: string, requesterId: string) {
    const answer = await this.prisma.answer.findFirst({
      where: { id: answerId, deletedAt: null },
      select: { postId: true, authorId: true, isAccepted: true, post: { select: { authorId: true, seoSlug: true, title: true, acceptedAnswerId: true } } },
    });
    if (!answer) throw new NotFoundException('Answer not found');
    if (answer.post.authorId !== requesterId) throw new ForbiddenException('Only the question author can accept an answer');

    if (answer.isAccepted) {
      await this.prisma.$transaction([
        this.prisma.answer.update({ where: { id: answerId }, data: { isAccepted: false } }),
        this.prisma.post.update({ where: { id: answer.postId }, data: { acceptedAnswerId: null } }),
      ]);
      return { accepted: false };
    }

    const selfAccept = answer.authorId === requesterId;
    await this.prisma.$transaction([
      this.prisma.answer.updateMany({ where: { postId: answer.postId, isAccepted: true }, data: { isAccepted: false } }),
      this.prisma.answer.update({ where: { id: answerId }, data: { isAccepted: true } }),
      this.prisma.post.update({ where: { id: answer.postId }, data: { acceptedAnswerId: answerId } }),
      ...(selfAccept
        ? []
        : [
            this.prisma.reputationEvent.create({ data: { userId: answer.authorId, event: 'ANSWER_ACCEPTED', delta: 25, sourceId: answerId } }),
            this.prisma.user.update({ where: { id: answer.authorId }, data: { reputationScore: { increment: 25 } } }),
            this.prisma.notification.create({
              data: { userId: answer.authorId, type: 'ANSWER', title: 'Your answer was accepted ✓', body: answer.post.title.slice(0, 140), link: `/q/${answer.post.seoSlug}` },
            }),
          ]),
    ]);
    return { accepted: true };
  }

  async softDelete(id: string, authorId: string) {
    const answer = await this.prisma.answer.findUnique({
      where: { id },
      select: { authorId: true, postId: true },
    });

    if (!answer || answer.authorId !== authorId) throw new BadRequestException('Not authorized');

    await this.prisma.$transaction([
      this.prisma.answer.update({
        where: { id },
        data: { deletedAt: new Date(), status: 'DELETED' },
      }),
      this.prisma.post.update({
        where: { id: answer.postId },
        data: { answerCount: { decrement: 1 } },
      }),
    ]);
  }
}
