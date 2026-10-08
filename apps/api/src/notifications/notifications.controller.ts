import { Controller, Get, Post, Param, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('api/v1/notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getMyNotifications(@Req() req: Request, @Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    const userId = (req.user as Record<string, unknown>).id as string;
    return this.notificationsService.getMyNotifications(userId, cursor, limit ? parseInt(limit, 10) : 20);
  }

  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  async getUnreadCount(@Req() req: Request) {
    const userId = (req.user as Record<string, unknown>).id as string;
    return this.notificationsService.getUnreadCount(userId);
  }

  @Post(':id/read')
  @UseGuards(JwtAuthGuard)
  async markRead(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as Record<string, unknown>).id as string;
    return this.notificationsService.markRead(userId, id);
  }

  @Post('read-all')
  @UseGuards(JwtAuthGuard)
  async markAllRead(@Req() req: Request) {
    const userId = (req.user as Record<string, unknown>).id as string;
    return this.notificationsService.markAllRead(userId);
  }
}
