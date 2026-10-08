import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

interface BadgeRule {
  id: string;
  name: string;
  description: string;
  threshold?: number;
  type: 'REPUTATION' | 'CONTENT' | 'COMMUNITY';
  check: (userId: string, prisma: PrismaClient) => Promise<boolean>;
}

@Injectable()
export class BadgesService {
  private prisma = new PrismaClient();

  private BADGE_RULES: BadgeRule[] = [
    {
      id: 'NEWCOMER',
      name: 'Newcomer',
      description: 'Posted your first question or answer',
      type: 'CONTENT',
      check: async (userId, prisma) => {
        const count = await prisma.post.count({ where: { authorId: userId } });
        const answerCount = await prisma.answer.count({ where: { authorId: userId } });
        return count + answerCount >= 1;
      },
    },
    {
      id: 'CONTRIBUTOR',
      name: 'Contributor',
      description: 'Posted 10 questions or answers',
      type: 'CONTENT',
      check: async (userId, prisma) => {
        const count = await prisma.post.count({ where: { authorId: userId } });
        const answerCount = await prisma.answer.count({ where: { authorId: userId } });
        return count + answerCount >= 10;
      },
    },
    {
      id: 'EXPERT',
      name: 'Expert',
      description: 'Reached 500 reputation points',
      type: 'REPUTATION',
      threshold: 500,
      check: async (userId, prisma) => {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { reputationScore: true } });
        return (user?.reputationScore || 0) >= 500;
      },
    },
    {
      id: 'TRUSTED',
      name: 'Trusted',
      description: 'Reached 1000 reputation points',
      type: 'REPUTATION',
      threshold: 1000,
      check: async (userId, prisma) => {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { reputationScore: true } });
        return (user?.reputationScore || 0) >= 1000;
      },
    },
    {
      id: 'MODERATOR_HELPER',
      name: 'Moderator Helper',
      description: 'Helped review 50 reports',
      type: 'COMMUNITY',
      check: async (userId, prisma) => {
        const count = await prisma.moderationLog.count({ where: { moderatorId: userId } });
        return count >= 50;
      },
    },
    {
      id: 'MALAYALI_VOICE',
      name: 'Malayali Voice',
      description: 'Posted 25 Malayalam content',
      type: 'CONTENT',
      check: async (userId, prisma) => {
        const count = await prisma.post.count({
          where: { authorId: userId, language: 'MALAYALAM' },
        });
        return count >= 25;
      },
    },
  ];

  async checkAndAwardBadges(userId: string) {
    for (const rule of this.BADGE_RULES) {
      const exists = await this.prisma.userBadge.findUnique({
        where: { userId_badgeId: { userId, badgeId: rule.id } },
      });

      if (!exists) {
        const qualifies = await rule.check(userId, this.prisma);
        if (qualifies) {
          const badge = await this.prisma.badge.upsert({
            where: { name: rule.name },
            create: {
              name: rule.name,
              description: rule.description,
              type: rule.type,
            },
            update: {},
            select: { id: true },
          });

          await this.prisma.userBadge.create({
            data: { userId, badgeId: badge.id },
          });
        }
      }
    }
  }
}
