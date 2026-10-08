import { Injectable } from '@nestjs/common';
import { PrismaClient, ReputationEventType } from '@prisma/client';
import { BadgesService } from './badges.service';

@Injectable()
export class ReputationService {
  private prisma = new PrismaClient();

  constructor(private badgesService: BadgesService) {}

  async awardReputation(
    userId: string,
    event: ReputationEventType,
    sourceId: string,
    delta?: number,
  ) {
    const deltaMap: Record<ReputationEventType, number> = {
      POST_UPVOTED: 10,
      POST_DOWNVOTED: -2,
      ANSWER_UPVOTED: 15,
      ANSWER_DOWNVOTED: -3,
      ANSWER_ACCEPTED: 25,
      COMMENT_UPVOTED: 5,
    };

    const finalDelta = delta !== undefined ? delta : deltaMap[event] || 0;

    await this.prisma.reputationEvent.create({
      data: { userId, event, sourceId, delta: finalDelta },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { reputationScore: { increment: finalDelta } },
    });

    await this.badgesService.checkAndAwardBadges(userId);
  }

  async getLeaderboard(cursor?: string, limit = 20) {
    const whereClause = cursor ? { reputationScore: { lt: parseInt(cursor, 10) } } : {};

    const users = await this.prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        username: true,
        displayName: true,
        reputationScore: true,
        badges: { select: { badge: { select: { id: true, name: true } } } },
      },
      orderBy: { reputationScore: 'desc' },
      take: limit + 1,
    });

    const hasMore = users.length > limit;
    const data = users.slice(0, limit);
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].reputationScore.toString() : null;

    return { data, nextCursor };
  }

  async getUserReputation(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        reputationScore: true,
        badges: { select: { badge: { select: { id: true, name: true, description: true } } } },
      },
    });

    if (!user) return null;

    return {
      reputation: user.reputationScore,
      badges: user.badges.map((ub) => ub.badge),
    };
  }
}
