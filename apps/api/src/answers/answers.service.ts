import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaClient } from '@prisma/client';
import { LanguageService } from '../shared/language.service';
import { AiGatewayService } from '@askvyo/ai';

@Injectable()
export class AnswersService {
  private prisma = new PrismaClient();
  private aiGateway = new AiGatewayService();

  constructor(
    private languageService: LanguageService,
    @InjectQueue('generate-embedding') private embeddingQueue: Queue,
    @InjectQueue('answer-quality') private qualityQueue: Queue,
  ) {}

  async create(postId: string, dto: Record<string, unknown>, authorId: string) {
    const { body } = dto;
    if (typeof body !== 'string' || body.trim().length < 2) throw new BadRequestException('Answer is too short');
    const post = await this.prisma.post.findFirst({ where: { id: postId, status: 'PUBLISHED', deletedAt: null }, select: { title: true, seoSlug: true } });
    if (!post) throw new NotFoundException('Question not found');
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

    // Notify everyone following the question (the asker follows automatically), except the answerer.
    const [followers, author] = await Promise.all([
      this.prisma.questionFollow.findMany({ where: { postId, userId: { not: authorId } }, select: { userId: true }, take: 1000 }),
      this.prisma.user.findUnique({ where: { id: authorId }, select: { displayName: true } }),
    ]);
    if (followers.length) {
      await this.prisma.notification
        .createMany({
          data: followers.map((f) => ({
            userId: f.userId,
            type: 'ANSWER' as const,
            title: 'New answer to a question you follow',
            body: `${author?.displayName ?? 'Someone'} answered: ${post.title.slice(0, 120)}`,
            link: `/q/${post.seoSlug}#answer-${answer.id}`,
          })),
        })
        .catch(() => undefined);
    }

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

  // sort: 'suggested' (accepted, then most votes) or 'recent'.
  async findByPost(postId: string, cursor?: string, limit = 20, sort = 'suggested') {
    const recent = sort === 'recent';
    limit = Math.min(Math.max(limit || 20, 1), 50);
    const whereClause = { postId, status: 'PUBLISHED' as const, deletedAt: null, ...(cursor && !recent ? {} : cursor ? { createdAt: { lt: new Date(cursor) } } : {}) };

    const answers = await this.prisma.answer.findMany({
      where: whereClause,
      select: {
        id: true, body: true, language: true, voteScore: true, isAccepted: true, commentCount: true, createdAt: true, updatedAt: true,
        author: { select: { id: true, username: true, displayName: true, isVerified: true, profile: { select: { credential: true } } } },
      },
      orderBy: recent ? [{ createdAt: 'desc' }] : [{ isAccepted: 'desc' }, { voteScore: 'desc' }, { createdAt: 'asc' }],
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

  async getAnswerSummary(postId: string) {
    // Get all published answers for the post
    const answers = await this.prisma.answer.findMany({
      where: { postId, status: 'PUBLISHED', deletedAt: null },
      select: { body: true },
      orderBy: { voteScore: 'desc' },
      take: 10,
    });

    if (answers.length === 0) {
      return null;
    }

    // Combine answer bodies for summarization
    const answerText = answers.map((a) => a.body).join('\n\n');

    // Generate summary using AI gateway
    const summary = await this.aiGateway.chat([
      {
        role: 'system',
        content: 'You are a helpful assistant that summarizes Q&A discussions in 3 lines. Keep it concise and in Malayalam if the answers are in Malayalam.',
      },
      {
        role: 'user',
        content: `Summarize these answers in 3 lines:\n\n${answerText}`,
      },
    ]);

    return summary || null;
  }
}
