import { Controller, Post, Delete, Get, Param, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { SubscriptionsService } from './subscriptions.service';

const uid = (req: Request) => (req.user as { id: string }).id;

@Controller('api/v1')
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Post('posts/:postId/subscribe')
  @UseGuards(JwtAuthGuard)
  async toggleSubscription(@Param('postId') postId: string, @Req() req: Request) {
    return this.subscriptionsService.toggleSubscription(uid(req), postId);
  }

  @Get('posts/:postId/subscription-status')
  @UseGuards(JwtAuthGuard)
  async getSubscriptionStatus(@Param('postId') postId: string, @Req() req: Request) {
    return this.subscriptionsService.getSubscriptionStatus(uid(req), postId);
  }

  @Post('posts/:postId/subscriptions')
  @UseGuards(JwtAuthGuard)
  async subscribe(@Param('postId') postId: string, @Req() req: Request) {
    return this.subscriptionsService.subscribe(uid(req), postId);
  }

  @Delete('posts/:postId/subscriptions')
  @UseGuards(JwtAuthGuard)
  async unsubscribe(@Param('postId') postId: string, @Req() req: Request) {
    return this.subscriptionsService.unsubscribe(uid(req), postId);
  }
}
