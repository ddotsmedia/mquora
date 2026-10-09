import { Injectable } from '@nestjs/common';
import { PrismaClient, UserRole, ReportStatus } from '@prisma/client';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import Redis from 'ioredis';

@Injectable()
export class AdminService {
  private prisma = new PrismaClient();
  private redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

  constructor(
    @InjectQueue('generate-embedding') private embeddingQueue: Queue,
    @InjectQueue('duplicate-detection') private duplicateQueue: Queue,
    @InjectQueue('answer-quality') private qualityQueue: Queue,
    @InjectQueue('compute-trending') private trendingQueue: Queue,
    @InjectQueue('build-feed') private feedQueue: Queue,
  ) {}

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalUsers, usersToday, bannedUsers, totalPosts, postsToday, removedPosts, pendingReports, underReviewReports, resolvedReports, topCommunities] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { createdAt: { gte: today } } }),
        this.prisma.user.count({ where: { bannedAt: { not: null } } }),
        this.prisma.post.count({ where: { status: 'PUBLISHED' } }),
        this.prisma.post.count({ where: { createdAt: { gte: today }, status: 'PUBLISHED' } }),
        this.prisma.post.count({ where: { status: 'DELETED' } }),
        this.prisma.report.count({ where: { status: 'PENDING' } }),
        this.prisma.report.count({ where: { status: 'UNDER_REVIEW' } }),
        this.prisma.report.count({ where: { status: 'RESOLVED' } }),
        this.prisma.community.findMany({
          select: { slug: true, name: true, memberCount: true, postCount: true },
          orderBy: { postCount: 'desc' },
          take: 5,
        }),
      ]);

    return {
      users: { total: totalUsers, today: usersToday, banned: bannedUsers },
      posts: { total: totalPosts, today: postsToday, removed: removedPosts },
      reports: { pending: pendingReports, underReview: underReviewReports, resolved: resolvedReports },
      topCommunities,
    };
  }

  async getUsers(cursor?: string, limit = 20) {
    const whereClause = cursor ? { id: { lt: cursor } } : {};

    const users = await this.prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        role: true,
        bannedAt: true,
        bannedUntil: true,
        reputationScore: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = users.length > limit;
    const data = users.slice(0, limit);
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null;

    return { data, nextCursor };
  }

  async banUser(userId: string, durationDays = 30) {
    const bannedUntil = new Date();
    bannedUntil.setDate(bannedUntil.getDate() + durationDays);

    return this.prisma.user.update({
      where: { id: userId },
      data: { bannedAt: new Date(), bannedUntil },
      select: { id: true, bannedAt: true, bannedUntil: true },
    });
  }

  async unbanUser(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { bannedAt: null, bannedUntil: null },
      select: { id: true, bannedAt: true },
    });
  }

  async changeUserRole(userId: string, role: UserRole) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, role: true },
    });
  }

  async getAuditLog(cursor?: string, limit = 20) {
    const whereClause = cursor ? { id: { lt: cursor } } : {};

    const logs = await this.prisma.auditLog.findMany({
      where: whereClause,
      select: {
        id: true,
        actorId: true,
        action: true,
        metadata: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = logs.length > limit;
    const data = logs.slice(0, limit);
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null;

    return { data, nextCursor };
  }

  async getQueueStats() {
    const queues = {
      'generate-embedding': await this.embeddingQueue.getJobCounts(),
      'duplicate-detection': await this.duplicateQueue.getJobCounts(),
      'answer-quality': await this.qualityQueue.getJobCounts(),
      'compute-trending': await this.trendingQueue.getJobCounts(),
      'build-feed': await this.feedQueue.getJobCounts(),
    };
    return queues;
  }

  async getFeatureFlags(): Promise<Record<string, boolean>> {
    const flags = await this.redis.hgetall('feature_flags');
    const result: Record<string, boolean> = {};
    Object.entries(flags).forEach(([key, val]) => {
      result[key] = val === 'true';
    });
    return result;
  }

  async setFeatureFlag(key: string, enabled: boolean): Promise<void> {
    await this.redis.hset('feature_flags', key, enabled ? 'true' : 'false');
  }

  async getAnalytics() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [mau, dau, totalAnswers, totalPosts, topCommunities, languageBreakdown] = await Promise.all([
      this.prisma.user.count({ where: { updatedAt: { gte: thirtyDaysAgo } } }),
      this.prisma.user.count({ where: { updatedAt: { gte: oneDayAgo } } }),
      this.prisma.answer.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.post.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.community.findMany({
        select: { name: true, memberCount: true, postCount: true },
        orderBy: { memberCount: 'desc' },
        take: 6,
      }),
      this.prisma.post.groupBy({
        by: ['language'],
        _count: { id: true },
      }),
    ]);

    const answerRate = totalPosts > 0 ? (totalAnswers / totalPosts).toFixed(2) : '0';

    return {
      mau,
      dau,
      answerRate: parseFloat(answerRate as string),
      topCommunities,
      languageBreakdown: languageBreakdown.map(item => ({
        name: item.language,
        count: item._count.id,
      })),
    };
  }

  async getContent(filter?: 'all' | 'flagged' | 'low-quality', cursor?: string, limit = 20) {
    const whereClause: any = { deletedAt: null };
    if (filter === 'flagged') {
      whereClause.reports = { some: { status: 'PENDING' } };
    }
    if (cursor) {
      whereClause.id = { lt: cursor };
    }

    const posts = await this.prisma.post.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        authorId: true,
        communityId: true,
        language: true,
        voteScore: true,
        status: true,
        createdAt: true,
        author: { select: { username: true } },
        community: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = posts.length > limit;
    const data = posts.slice(0, limit);
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null;

    return { data, nextCursor };
  }

  async removeContent(contentId: string) {
    return this.prisma.post.update({
      where: { id: contentId },
      data: { status: 'REMOVED' },
      select: { id: true, status: true },
    });
  }

  async getReports(status?: ReportStatus, limit = 20) {
    const whereClause = status ? { status } : { status: 'PENDING' as ReportStatus };

    return this.prisma.report.findMany({
      where: whereClause,
      select: {
        id: true,
        targetType: true,
        status: true,
        details: true,
        reporterId: true,
        createdAt: true,
        reporter: { select: { username: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async dismissReport(reportId: string) {
    return this.prisma.report.update({
      where: { id: reportId },
      data: { status: 'RESOLVED' },
      select: { id: true, status: true },
    });
  }

  async removeReportedContent(reportId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      select: { targetId: true, targetType: true },
    });

    if (!report?.targetId) throw new Error('Report has no associated content');

    if (report.targetType === 'POST') {
      await this.prisma.post.update({
        where: { id: report.targetId },
        data: { status: 'REMOVED' },
      });
    } else if (report.targetType === 'ANSWER') {
      await this.prisma.answer.update({
        where: { id: report.targetId },
        data: { status: 'REMOVED' },
      });
    }

    return this.prisma.report.update({
      where: { id: reportId },
      data: { status: 'RESOLVED' },
      select: { id: true, status: true },
    });
  }

  async warnReportUser(reportId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) throw new Error('Report not found');

    await this.prisma.moderationLog.create({
      data: {
        moderatorId: report.reporterId,
        action: 'WARN',
        reportId,
        notes: 'User warned for report',
      },
    });

    return this.prisma.report.update({
      where: { id: reportId },
      data: { status: 'RESOLVED' },
      select: { id: true, status: true },
    });
  }

  async getCommunities() {
    return this.prisma.community.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        memberCount: true,
        postCount: true,
        createdAt: true,
        _count: { select: { posts: true } },
      },
      orderBy: { memberCount: 'desc' },
    });
  }
}
