import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { UserThrottleGuard } from '../guards/user-throttle.guard';
import { NotificationsService } from './notifications.service';
import { SubscribePushDto, UnsubscribePushDto, SendTestNotificationDto } from './notifications.dto';

@Controller('api/v1/notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  // ── In-app notification endpoints ──────────────────────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(@Req() req: Request, @Query('limit') limit?: string) {
    const userId = (req.user as Record<string, unknown>).id as string;
    return this.notificationsService.list(userId, limit ? parseInt(limit, 10) : 50);
  }

  @Post('read-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async markAllRead(@Req() req: Request) {
    const userId = (req.user as Record<string, unknown>).id as string;
    return this.notificationsService.markAllRead(userId);
  }

  @Post(':id/read')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async markRead(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as Record<string, unknown>).id as string;
    return this.notificationsService.markRead(userId, id);
  }

  // ── Push notification endpoints ─────────────────────────────────────────

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async subscribe(@Body() dto: SubscribePushDto, @Req() req: Request) {
    const userId = (req.user as Record<string, unknown>).id as string;
    return this.notificationsService.subscribeToPush(userId, dto);
  }

  @Post('unsubscribe')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async unsubscribe(@Body() dto: UnsubscribePushDto, @Req() req: Request) {
    const userId = (req.user as Record<string, unknown>).id as string;
    return this.notificationsService.unsubscribeFromPush(userId, dto);
  }

  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  async unreadCount(@Req() req: Request) {
    const userId = (req.user as Record<string, unknown>).id as string;
    return { count: await this.notificationsService.unreadCount(userId) };
  }

  @Get('subscriptions')
  @UseGuards(JwtAuthGuard)
  async getSubscriptions(@Req() req: Request) {
    const userId = (req.user as Record<string, unknown>).id as string;
    return this.notificationsService.getUserSubscriptions(userId);
  }

  @Post('send-test')
  @UseGuards(JwtAuthGuard, UserThrottleGuard)
  @HttpCode(HttpStatus.OK)
  async sendTest(@Body() dto: SendTestNotificationDto, @Req() req: Request) {
    const requesterId = (req.user as Record<string, unknown>).id as string;
    const requesterRole = (req.user as Record<string, unknown>).role as string;

    // Only allow admins to send notifications to other users
    if (requesterId !== dto.userId && requesterRole !== 'ADMIN') {
      throw new ForbiddenException('You can only send notifications to yourself');
    }

    return this.notificationsService.sendTestNotification(dto);
  }
}
