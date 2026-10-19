import { Controller, Post, Delete, Get, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { FollowsService } from './follows.service';

class FollowDto {
  @IsString() @MinLength(1) followingId!: string;
}

const uid = (req: Request) => (req.user as { id: string }).id;

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

  @Get('follows/status/:userId')
  @UseGuards(JwtAuthGuard)
  async status(@Param('userId') userId: string, @Req() req: Request) {
    return this.followsService.status(uid(req), userId);
  }

  @Post('follows')
  @UseGuards(JwtAuthGuard)
  async follow(@Body() dto: FollowDto, @Req() req: Request) {
    return this.followsService.follow(uid(req), dto.followingId);
  }

  @Delete('follows/:followingId')
  @UseGuards(JwtAuthGuard)
  async unfollow(@Param('followingId') followingId: string, @Req() req: Request) {
    return this.followsService.unfollow(uid(req), followingId);
  }
}
