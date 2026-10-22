import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { SubscribePushDto, UnsubscribePushDto, SendTestNotificationDto } from './notifications.dto';

@Controller('api/v1/notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

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

  @Get('subscriptions')
  @UseGuards(JwtAuthGuard)
  async getSubscriptions(@Req() req: Request) {
    const userId = (req.user as Record<string, unknown>).id as string;
    return this.notificationsService.getUserSubscriptions(userId);
  }

  @Post('send-test')
  @UseGuards(JwtAuthGuard)
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
