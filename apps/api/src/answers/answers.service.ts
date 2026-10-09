import { Injectable, BadRequestException } from '@nestjs/common';
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
      select: { id: true, body: true, language: true, voteScore: true, isAccepted: true, createdAt: true, author: { select: { id: true, username: true, displayName: true } } },
      orderBy: { createdAt: 'asc' },
      take: limit + 1,
    });

    const hasMore = answers.length > limit;
    const data = answers.slice(0, limit);
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].createdAt.toISOString() : null;

    return { data, nextCursor };
  }

  async accept(answerId: string, requesterId: string) {
    const answer = await this.prisma.answer.findUnique({
      where: { id: answerId },
      select: { postId: true, authorId: true },
    });

    const post = await this.prisma.post.findUnique({
      where: { id: answer!.postId },
      select: { authorId: true },
    });

    if (post?.authorId !== requesterId) throw new BadRequestException('Only post author can accept answer');

    await this.prisma.$transaction([
      this.prisma.answer.update({
        where: { id: answerId },
        data: { isAccepted: true },
      }),
      this.prisma.post.update({
        where: { id: answer!.postId },
        data: { acceptedAnswerId: answerId },
      }),
      this.prisma.reputationEvent.create({
        data: { userId: answer!.authorId, event: 'ANSWER_ACCEPTED', delta: 25, sourceId: answerId },
      }),
    ]);
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
