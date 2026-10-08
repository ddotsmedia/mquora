import { Controller, Post, Delete, Get, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { BookmarksService } from './bookmarks.service';

@Controller('api/v1/bookmarks')
@UseGuards(JwtAuthGuard)
export class BookmarksController {
  constructor(private bookmarksService: BookmarksService) {}

  @Get()
  async findByUser(@Req() req: Request, @Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    const userId = (req.user as Record<string, unknown>).id as string;
    return this.bookmarksService.findByUser(userId, cursor, limit ? parseInt(limit, 10) : 20);
  }

  @Post()
  async upsert(@Body() dto: Record<string, unknown>, @Req() req: Request) {
    const userId = (req.user as Record<string, unknown>).id as string;
    return this.bookmarksService.upsert(userId, dto.postId as string);
  }

  @Delete(':postId')
  async remove(@Param('postId') postId: string, @Req() req: Request) {
    const userId = (req.user as Record<string, unknown>).id as string;
    return this.bookmarksService.remove(userId, postId);
  }
}
