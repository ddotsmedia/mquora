import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../guards/optional-jwt.guard';
import { PostsService } from './posts.service';
import { CreatePostDto } from './create-post.dto';

@Controller('api/v1/posts')
export class PostsController {
  constructor(private postsService: PostsService) {}

  @Get()
  @UseGuards(OptionalJwtGuard)
  async findFeed(@Query('cursor') cursor?: string, @Query('communityId') communityId?: string, @Query('limit') limit?: string) {
    return this.postsService.findFeed(cursor, communityId, limit ? parseInt(limit, 10) : 20);
  }

  @Get(':id/similar')
  @UseGuards(OptionalJwtGuard)
  async findSimilar(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.postsService.getSimilarPosts(id, limit ? parseInt(limit, 10) : 5);
  }

  @Get(':seoSlug')
  @UseGuards(OptionalJwtGuard)
  async findBySlug(@Param('seoSlug') seoSlug: string) {
    return this.postsService.findBySlug(seoSlug);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreatePostDto, @Req() req: Request) {
    const authorId = (req.user as Record<string, unknown>).id as string;
    return this.postsService.create(dto as unknown as Record<string, unknown>, authorId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() dto: CreatePostDto, @Req() req: Request) {
    const authorId = (req.user as Record<string, unknown>).id as string;
    return this.postsService.update(id, dto as unknown as Record<string, unknown>, authorId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string, @Req() req: Request) {
    const authorId = (req.user as Record<string, unknown>).id as string;
    return this.postsService.softDelete(id, authorId);
  }
}
