import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaClient } from '@prisma/client';
import { LanguageService } from '../shared/language.service';
import axios from 'axios';

@Injectable()
export class AnswersService {
  private prisma = new PrismaClient();

  constructor(
    private languageService: LanguageService,
    @InjectQueue('generate-embedding') private embeddingQueue: Queue,
    @InjectQueue('answer-quality') private qualityQueue: Queue,
  ) {}

  async create(postId: string, dto: CreateAnswerDto, authorId: string) {
    const { body } = dto;
    if (body.trim().length < 2) throw new BadRequestException('Answer is too short');
    const post = await this.prisma.post.findFirst({ where: { id: postId, status: 'PUBLISHED', deletedAt: null }, select: { title: true, seoSlug: true } });
    if (!post) throw new NotFoundException('Question not found');
    const contentProcessed = this.languageService.processContent(body);

    const [answer] = await this.prisma.$transaction([
      this.prisma.answer.create({
        data: { postId, authorId, body, ...contentProcessed, status: 'PUBLISHED' },
        select: { id: true, postId: true },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: { answerCount: { increment: 1 } },
      }),
    ]);

    // Notify everyone following the question (the asker follows automatically), except the answerer.
    const [followers, subscribers, author] = await Promise.all([
      this.prisma.questionFollow.findMany({ where: { postId, userId: { not: authorId } }, select: { userId: true }, take: 1000 }),
      this.prisma.questionSubscription.findMany({ where: { postId, userId: { not: authorId } }, select: { userId: true }, take: 1000 }),
      this.prisma.user.findUnique({ where: { id: authorId }, select: { displayName: true } }),
    ]);

    const followerIds = followers.map((f) => f.userId);
    const subscriberIds = subscribers.map((s) => s.userId);
    const uniqueUserIds = Array.from(new Set([...followerIds, ...subscriberIds]));

    if (uniqueUserIds.length) {
      await this.prisma.notification
        .createMany({
          data: uniqueUserIds.map((userId) => ({
            userId,
            type: 'ANSWER' as const,
            title: 'New answer to a question you follow',
            body: `${author?.displayName ?? 'Someone'} answered: ${post.title.slice(0, 120)}`,
            link: `/q/${post.seoSlug}#answer-${answer.id}`,
          })),
        })
        .catch(() => undefined);
    }

    // Send web push notifications to subscribers
    if (subscriberIds.length) {
      const subscriptions = await this.prisma.notificationSubscription.findMany({
        where: { userId: { in: subscriberIds }, isActive: true },
        select: { endpoint: true, p256dh: true, auth: true },
        take: 1000,
      });

      if (subscriptions.length) {
        // Queue push notifications asynchronously without blocking answer creation
        // This would normally use a job queue like Bull; for now we fire-and-forget
        this.sendWebPushNotifications(subscriptions, post.title.slice(0, 100), author?.displayName ?? 'Someone', post.seoSlug, answer.id).catch(() => undefined);
      }
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
        id: true, body: true, language: true, voteScore: true, qualityScore: true, viewCount: true, isAccepted: true, commentCount: true, createdAt: true, updatedAt: true, editedAt: true, isPinned: true,
        author: { select: { id: true, username: true, displayName: true, isVerified: true, reputationScore: true, profile: { select: { credential: true } } } },
      },
      orderBy: recent ? [{ isPinned: 'desc' }, { createdAt: 'desc' }] : [{ isPinned: 'desc' }, { isAccepted: 'desc' }, { voteScore: 'desc' }, { createdAt: 'asc' }],
      take: limit + 1,
    });

    const hasMore = answers.length > limit;
    const data = answers.slice(0, limit);
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].createdAt.toISOString() : null;

    // Count one view per answer shown; fire-and-forget so the page never waits on it.
    if (data.length) {
      void this.prisma.answer
        .updateMany({ where: { id: { in: data.map((a) => a.id) } }, data: { viewCount: { increment: 1 } } })
        .catch(() => undefined);
    }

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

  // The question's author (or a site admin) pins one answer to the top; pinning replaces any other pin.
  async setPinned(answerId: string, pinned: boolean, userId: string) {
    const answer = await this.prisma.answer.findFirst({
      where: { id: answerId, deletedAt: null, status: 'PUBLISHED' },
      select: { id: true, postId: true, post: { select: { authorId: true } } },
    });
    if (!answer) throw new NotFoundException('Answer not found');
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (answer.post.authorId !== userId && user?.role !== 'ADMIN') throw new ForbiddenException('Only the question author can pin answers');

    await this.prisma.$transaction([
      ...(pinned ? [this.prisma.answer.updateMany({ where: { postId: answer.postId, isPinned: true }, data: { isPinned: false } })] : []),
      this.prisma.answer.update({ where: { id: answerId }, data: { isPinned: pinned } }),
    ]);
    return { id: answerId, isPinned: pinned };
  }

  // Author edits their answer; the previous body is kept as a revision.
  async updateAnswer(id: string, body: string, userId: string) {
    const trimmed = (body ?? '').trim();
    if (trimmed.length < 2) throw new BadRequestException('Answer is too short');
    const existing = await this.prisma.answer.findFirst({
      where: { id, deletedAt: null, status: 'PUBLISHED' },
      select: { id: true, authorId: true, body: true },
    });
    if (!existing) throw new NotFoundException('Answer not found');
    if (existing.authorId !== userId) throw new ForbiddenException('Only the author can edit this answer');
    if (existing.body.trim() === trimmed) return { id, unchanged: true };

    const contentProcessed = this.languageService.processContent(trimmed);
    await this.prisma.$transaction([
      this.prisma.answerRevision.create({ data: { answerId: id, body: existing.body } }),
      this.prisma.answer.update({ where: { id }, data: { body: trimmed, ...contentProcessed, editedAt: new Date() } }),
    ]);
    return { id, unchanged: false };
  }

  // Public edit history, newest first.
  async listRevisions(id: string) {
    const answer = await this.prisma.answer.findFirst({ where: { id, deletedAt: null }, select: { id: true, body: true, editedAt: true } });
    if (!answer) throw new NotFoundException('Answer not found');
    const revisions = await this.prisma.answerRevision.findMany({
      where: { answerId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, body: true, createdAt: true },
    });
    return { current: { body: answer.body, editedAt: answer.editedAt }, data: revisions };
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

  private async sendWebPushNotifications(
    subscriptions: Array<{ endpoint: string; p256dh: string; auth: string }>,
    title: string,
    author: string,
    seoSlug: string,
    answerId: string,
  ) {
    try {
      const webpush = (await import('web-push')).default;
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

      if (!vapidPublicKey || !vapidPrivateKey) return;

      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:support@askvyo.com',
        vapidPublicKey,
        vapidPrivateKey,
      );

      const payload = JSON.stringify({
        title: 'New answer to your subscription',
        body: `${author} answered: ${title}`,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `question-${seoSlug}`,
        data: {
          url: `/q/${seoSlug}#answer-${answerId}`,
        },
      });

      await Promise.allSettled(
        subscriptions.map((sub) =>
          webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            payload,
          ),
        ),
      );
    } catch (error) {
      console.error('Error sending web push notifications:', error);
    }
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
    const summary = await this.summarize(answerText);

    return summary || null;
  }
  async voteAnswer(answerId: string, userId: string, voteType: 'UP' | 'DOWN') {
    const answer = await this.prisma.answer.findFirst({
      where: { id: answerId, status: 'PUBLISHED', deletedAt: null },
      select: { authorId: true, voteScore: true, voteCount: true },
    });
    if (!answer) throw new NotFoundException('Answer not found');
    if (answer.authorId === userId) throw new BadRequestException('You cannot vote on your own answer');

    const existing = await this.prisma.answerVote.findUnique({
      where: { answerId_userId: { answerId, userId } },
      select: { type: true },
    });

    if (existing?.type === voteType) {
      return { voteCount: answer.voteCount, userVote: voteType };
    }

    const delta = (voteType === 'UP' ? 1 : -1) - (existing ? (existing.type === 'UP' ? 1 : -1) : 0);
    await this.prisma.$transaction([
      this.prisma.answerVote.upsert({
        where: { answerId_userId: { answerId, userId } },
        create: { answerId, userId, type: voteType },
        update: { type: voteType },
      }),
      this.prisma.answer.update({
        where: { id: answerId },
        data: { voteCount: { increment: delta }, voteScore: { increment: delta } },
      }),
    ]);

    return { voteCount: answer.voteCount + delta, userVote: voteType };
  }

  async removeAnswerVote(answerId: string, userId: string) {
    const vote = await this.prisma.answerVote.findUnique({
      where: { answerId_userId: { answerId, userId } },
    });
    if (!vote) return;

    const delta = vote.type === 'UP' ? -1 : 1;
    await this.prisma.$transaction([
      this.prisma.answerVote.delete({
        where: { answerId_userId: { answerId, userId } },
      }),
      this.prisma.answer.update({
        where: { id: answerId },
        data: { voteCount: { increment: delta }, voteScore: { increment: delta } },
      }),
    ]);
  }

  async getAnswerVoteStatus(answerId: string, userId?: string) {
    const answer = await this.prisma.answer.findUnique({
      where: { id: answerId },
      select: { voteCount: true },
    });
    if (!answer) throw new NotFoundException('Answer not found');

    let userVote = null;
    if (userId) {
      const vote = await this.prisma.answerVote.findUnique({
        where: { answerId_userId: { answerId, userId } },
        select: { type: true },
      });
      userVote = vote?.type ?? null;
    }

    return { voteCount: answer.voteCount, userVote };
  }

  private async summarize(answerText: string): Promise<string> {
    const gatewayUrl = process.env.AI_GATEWAY_URL;
    if (!gatewayUrl) return '';
    try {
      const res = await axios.post(
        `${gatewayUrl}/chat`,
        {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful assistant that summarizes Q&A discussions in 3 lines. Keep it concise and in Malayalam if the answers are in Malayalam.',
            },
            { role: 'user', content: `Summarize these answers in 3 lines:\n\n${answerText}` },
          ],
        },
        { timeout: 30000 },
      );
      return res.data?.choices?.[0]?.message?.content ?? '';
    } catch {
      return '';
    }
  }
}
