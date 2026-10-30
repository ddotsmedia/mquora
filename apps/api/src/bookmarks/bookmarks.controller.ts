import { Controller, Post, Patch, Delete, Get, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { BookmarksService } from './bookmarks.service';

@Controller('api/v1/bookmarks')
@UseGuards(JwtAuthGuard)
export class BookmarksController {
  constructor(private bookmarksService: BookmarksService) {}

  @Get()
  async findByUser(@Req() req: Request, @Query('cursor') cursor?: string, @Query('limit') limit?: string, @Query('collection') collection?: string) {
    const userId = (req.user as Record<string, unknown>).id as string;
    return this.bookmarksService.findByUser(userId, cursor, limit ? parseInt(limit, 10) : 20, collection);
  }

  @Get('collections')
  async listCollections(@Req() req: Request) {
    return this.bookmarksService.listCollections((req.user as Record<string, unknown>).id as string);
  }

  @Post('collections')
  async createCollection(@Body() body: { name: string }, @Req() req: Request) {
    return this.bookmarksService.createCollection((req.user as Record<string, unknown>).id as string, body?.name);
  }

  @Delete('collections/:id')
  async deleteCollection(@Param('id') id: string, @Req() req: Request) {
    return this.bookmarksService.deleteCollection((req.user as Record<string, unknown>).id as string, id);
  }

  @Patch(':postId/collection')
  async setCollection(@Param('postId') postId: string, @Body() body: { collectionId: string | null }, @Req() req: Request) {
    return this.bookmarksService.setCollection((req.user as Record<string, unknown>).id as string, postId, body?.collectionId ?? null);
  }

  @Get('status/:postId')
  async status(@Param('postId') postId: string, @Req() req: Request) {
    return this.bookmarksService.status((req.user as Record<string, unknown>).id as string, postId);
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
