import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaClient, NotifType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  private prisma = new PrismaClient();

  async create(userId: string, type: NotifType, title: string, body: string, link?: string) {
    return this.prisma.notification.create({
      data: { userId, type, title, body, link },
      select: { id: true, createdAt: true },
    });
  }

  async getMyNotifications(userId: string, cursor?: string, limit = 20) {
    const whereClause = cursor ? { id: { lt: cursor } } : {};

    const notifications = await this.prisma.notification.findMany({
      where: { userId, ...whereClause },
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        link: true,
        readAt: true,
        createdAt: true,
      },
      orderBy: [{ readAt: 'asc' }, { createdAt: 'desc' }],
      take: limit + 1,
    });

    const hasMore = notifications.length > limit;
    const data = notifications.slice(0, limit);
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null;

    return { data, nextCursor };
  }

  async markRead(userId: string, notificationId: string) {
    const notif = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      select: { userId: true },
    });

    if (!notif) throw new NotFoundException('Notification not found');
    if (notif.userId !== userId) throw new ForbiddenException('Cannot mark other users notifications');

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });
    return { count };
  }
}
