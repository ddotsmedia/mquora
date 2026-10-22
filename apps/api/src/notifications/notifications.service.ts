import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { SubscribePushDto, UnsubscribePushDto, SendTestNotificationDto, PushNotificationPayload } from './notifications.dto';

// web-push library would be installed: npm install web-push
// import * as webpush from 'web-push';

@Injectable()
export class NotificationsService {
  private prisma = new PrismaClient();

  constructor() {
    // Configure web-push with VAPID keys
    // webpush.setVapidDetails(
    //   process.env.VAPID_SUBJECT || 'mailto:support@askvyo.com',
    //   process.env.VAPID_PUBLIC_KEY || '',
    //   process.env.VAPID_PRIVATE_KEY || '',
    // );
  }

  async subscribeToPush(userId: string, dto: SubscribePushDto) {
    if (!dto.endpoint || !dto.p256dh || !dto.auth) {
      throw new BadRequestException('Invalid subscription details');
    }

    try {
      const subscription = await this.prisma.notificationSubscription.upsert({
        where: { endpoint: dto.endpoint },
        update: {
          isActive: true,
          updatedAt: new Date(),
        },
        create: {
          userId,
          endpoint: dto.endpoint,
          p256dh: dto.p256dh,
          auth: dto.auth,
          isActive: true,
        },
      });

      return {
        id: subscription.id,
        userId: subscription.userId,
        endpoint: subscription.endpoint,
        isActive: subscription.isActive,
        createdAt: subscription.createdAt,
      };
    } catch (error) {
      console.error('Failed to subscribe to push:', error);
      throw new InternalServerErrorException('Failed to save subscription');
    }
  }

  async unsubscribeFromPush(userId: string, dto: UnsubscribePushDto) {
    try {
      const subscription = await this.prisma.notificationSubscription.findUnique({
        where: { endpoint: dto.endpoint },
      });

      if (!subscription || subscription.userId !== userId) {
        throw new BadRequestException('Subscription not found');
      }

      await this.prisma.notificationSubscription.update({
        where: { id: subscription.id },
        data: { isActive: false },
      });

      return { success: true, message: 'Unsubscribed from push notifications' };
    } catch (error) {
      console.error('Failed to unsubscribe from push:', error);
      throw new InternalServerErrorException('Failed to unsubscribe');
    }
  }

  async sendPushNotification(userId: string, payload: PushNotificationPayload) {
    try {
      const subscriptions = await this.prisma.notificationSubscription.findMany({
        where: {
          userId,
          isActive: true,
        },
      });

      if (subscriptions.length === 0) {
        return { success: true, sent: 0, message: 'No active subscriptions found' };
      }

      const results = await Promise.allSettled(
        subscriptions.map((sub: any) => this.sendToSubscription(sub, payload)),
      );

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      // Clean up invalid subscriptions
      if (failed > 0) {
        const failedIndices = results
          .map((r, i) => (r.status === 'rejected' ? i : null))
          .filter((i) => i !== null);

        for (const idx of failedIndices) {
          await this.prisma.notificationSubscription.update({
            where: { id: subscriptions[idx as number].id },
            data: { isActive: false },
          }).catch(() => null);
        }
      }

      return {
        success: true,
        sent: successful,
        failed,
        total: subscriptions.length,
      };
    } catch (error) {
      console.error('Failed to send push notifications:', error);
      throw new InternalServerErrorException('Failed to send notifications');
    }
  }

  private async sendToSubscription(
    subscription: { endpoint: string; p256dh: string; auth: string },
    payload: PushNotificationPayload,
  ) {
    // This would use the web-push library:
    // const pushSubscription = {
    //   endpoint: subscription.endpoint,
    //   keys: {
    //     p256dh: subscription.p256dh,
    //     auth: subscription.auth,
    //   },
    // };
    //
    // await webpush.sendNotification(pushSubscription, JSON.stringify(payload));

    // For now, just log it (web-push would be added via npm)
    console.log('Would send notification to:', subscription.endpoint, payload);
    return Promise.resolve();
  }

  async sendTestNotification(dto: SendTestNotificationDto) {
    return this.sendPushNotification(dto.userId, {
      title: dto.title,
      body: dto.body,
      icon: dto.icon,
      badge: dto.badge,
      tag: dto.tag,
      data: dto.data,
    });
  }

  async getUserSubscriptions(userId: string) {
    return this.prisma.notificationSubscription.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        endpoint: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async notifyFollowersOfNewAnswer(postId: string, answerId: string, answerPreview: string) {
    try {
      // Get all followers of the post
      const followers = await this.prisma.questionFollow.findMany({
        where: { postId },
        include: { user: true, post: { select: { title: true, seoSlug: true } } },
      });

      if (followers.length === 0) {
        return { notified: 0 };
      }

      const notificationTasks = followers.map((follower: any) =>
        this.sendPushNotification(follower.userId, {
          title: 'New Answer to Your Question',
          body: `${answerPreview.substring(0, 100)}...`,
          tag: `question-${postId}`,
          data: {
            postId,
            answerId,
            seoSlug: follower.post?.seoSlug || '',
          },
        }).catch(() => null),
      );

      await Promise.allSettled(notificationTasks);

      return { notified: followers.length };
    } catch (error) {
      console.error('Failed to notify followers of new answer:', error);
      return { notified: 0, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async create(userId: string, type: string, title: string, body: string, link?: string) {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          userId,
          type: type as any,
          title,
          body,
          link,
        },
      });
      return notification;
    } catch (error) {
      console.error('Failed to create notification:', error);
      throw new InternalServerErrorException('Failed to create notification');
    }
  }
}
