import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient, ModerationAction, ReportStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ModerationService {
  private prisma = new PrismaClient();

  constructor(private notificationsService: NotificationsService) {}

  async submitReport(
    reporterId: string,
    targetType: 'POST' | 'ANSWER' | 'COMMENT' | 'USER',
    targetId: string,
    reason: string,
    details?: string,
  ) {
    const report = await this.prisma.report.create({
      data: {
        reporterId,
        targetType,
        targetId,
        reason,
        details,
        status: 'PENDING' as ReportStatus,
      },
      select: { id: true, status: true },
    });

    const reportCount = await this.prisma.report.count({
      where: { targetId, targetType, status: { in: ['PENDING', 'UNDER_REVIEW'] } },
    });

    if (reportCount >= 3) {
      await this.prisma.report.updateMany({
        where: { targetId, targetType },
        data: { status: 'UNDER_REVIEW' as ReportStatus },
      });
    }

    return report;
  }

  async getReports(status?: string, cursor?: string, limit = 20) {
    const whereClause = {
      ...(status && { status: status as ReportStatus }),
      ...(cursor && { id: { lt: cursor } }),
    };

    const reports = await this.prisma.report.findMany({
      where: whereClause,
      select: {
        id: true,
        reporterId: true,
        targetType: true,
        targetId: true,
        reason: true,
        details: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = reports.length > limit;
    const data = reports.slice(0, limit);
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null;

    return { data, nextCursor };
  }

  async resolveReport(
    moderatorId: string,
    reportId: string,
    action: ModerationAction,
    notes?: string,
  ) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      select: { targetId: true, targetType: true, status: true },
    });

    if (!report) throw new NotFoundException('Report not found');

    await this.prisma.report.update({
      where: { id: reportId },
      data: { status: 'RESOLVED' as ReportStatus },
    });

    await this.prisma.moderationLog.create({
      data: {
        moderatorId,
        reportId,
        action,
        notes,
      },
    });

    if (action === 'REMOVE') {
      if (report.targetType === 'POST') {
        await this.prisma.post.update({
          where: { id: report.targetId },
          data: { deletedAt: new Date(), status: 'DELETED' },
        });
      } else if (report.targetType === 'ANSWER') {
        await this.prisma.answer.update({
          where: { id: report.targetId },
          data: { deletedAt: new Date() },
        });
      } else if (report.targetType === 'COMMENT') {
        await this.prisma.comment.update({
          where: { id: report.targetId },
          data: { deletedAt: new Date() },
        });
      }
    }

    if (action === 'BAN') {
      const bannedUntil = new Date();
      bannedUntil.setDate(bannedUntil.getDate() + 30);
      await this.prisma.user.update({
        where: { id: report.targetId },
        data: { bannedAt: new Date(), bannedUntil },
      });
    }

    if (action === 'WARN') {
      await this.notificationsService.create(
        report.targetId,
        'MODERATION',
        'Content Warning',
        `Your ${report.targetType.toLowerCase()} was reviewed and flagged. ${notes || ''}`,
      );
    }
  }
}
