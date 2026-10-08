import { Injectable } from '@nestjs/common';
import { PrismaClient, UserRole } from '@prisma/client';

@Injectable()
export class AdminService {
  private prisma = new PrismaClient();

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
}
