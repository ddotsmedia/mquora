import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class SubscriptionsService {
  private prisma = new PrismaClient();

  async subscribe(userId: string, postId: string) {
    if (!postId) throw new BadRequestException('postId is required');
    const post = await this.prisma.post.findFirst({
      where: { id: postId, status: 'PUBLISHED', deletedAt: null },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('Question not found');

    const existing = await this.prisma.questionSubscription.findUnique({
      where: { userId_postId: { userId, postId } },
      select: { id: true },
    });
    if (existing) return { isSubscribed: true };

    await this.prisma.questionSubscription.create({ data: { userId, postId } });
    return { isSubscribed: true };
  }

  async unsubscribe(userId: string, postId: string) {
    await this.prisma.questionSubscription.deleteMany({ where: { userId, postId } });
    return { isSubscribed: false };
  }

  async toggleSubscription(userId: string, postId: string) {
    const existing = await this.prisma.questionSubscription.findUnique({
      where: { userId_postId: { userId, postId } },
      select: { id: true },
    });

    if (existing) {
      await this.prisma.questionSubscription.delete({
        where: { id: existing.id },
      });
      return { isSubscribed: false };
    }

    const post = await this.prisma.post.findFirst({
      where: { id: postId, status: 'PUBLISHED', deletedAt: null },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('Question not found');

    await this.prisma.questionSubscription.create({ data: { userId, postId } });
    return { isSubscribed: true };
  }

  async getSubscriptionStatus(userId: string, postId: string) {
    const row = await this.prisma.questionSubscription.findUnique({
      where: { userId_postId: { userId, postId } },
      select: { id: true },
    });
    return { isSubscribed: !!row };
  }
}
