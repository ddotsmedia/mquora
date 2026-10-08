import { Controller, Post, Delete, Get, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { FollowsService } from './follows.service';

@Controller('api/v1')
export class FollowsController {
  constructor(private followsService: FollowsService) {}

  @Get('users/:userId/followers')
  async findFollowers(@Param('userId') userId: string, @Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    return this.followsService.findFollowers(userId, cursor, limit ? parseInt(limit, 10) : 20);
  }

  @Get('users/:userId/following')
  async findFollowing(@Param('userId') userId: string, @Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    return this.followsService.findFollowing(userId, cursor, limit ? parseInt(limit, 10) : 20);
  }

  @Post('follows')
  @UseGuards(JwtAuthGuard)
  async follow(@Body() dto: Record<string, unknown>, @Req() req: Request) {
    const followerId = (req.user as Record<string, unknown>).id as string;
    return this.followsService.follow(followerId, dto.followingId as string);
  }

  @Delete('follows/:followingId')
  @UseGuards(JwtAuthGuard)
  async unfollow(@Param('followingId') followingId: string, @Req() req: Request) {
    const followerId = (req.user as Record<string, unknown>).id as string;
    return this.followsService.unfollow(followerId, followingId);
  }
}
