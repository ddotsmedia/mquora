import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { UserThrottleGuard } from '../guards/user-throttle.guard';
import { OptionalJwtGuard } from '../guards/optional-jwt.guard';
import { PostsService } from './posts.service';
import { CreatePostDto } from './create-post.dto';

@Controller('api/v1/posts')
export class PostsController {
  constructor(private postsService: PostsService) {}

  @Get()
  @UseGuards(OptionalJwtGuard)
  async findFeed(@Query('cursor') cursor?: string, @Query('communityId') communityId?: string, @Query('limit') limit?: string, @Query('language') language?: string, @Req() req?: Request) {
    const viewerId = (req?.user as Record<string, unknown> | undefined)?.id as string | undefined;
    return this.postsService.findFeed(cursor, communityId, Math.min(Math.max(parseInt(limit ?? '20', 10) || 20, 1), 100), language, viewerId);
  }

  @Get('question-of-day')
  async questionOfDay() {
    const data = await this.postsService.getQuestionOfTheDay();
    return { data };
  }

  @Get('popular-this-week')
  async popularThisWeek(@Query('limit') limit?: string) {
    const data = await this.postsService.getPopularThisWeek(Math.min(Math.max(parseInt(limit ?? '5', 10) || 5, 1), 50));
    return { data };
  }

  @Get('recent')
  async recentQuestions(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    const data = await this.postsService.getRecentQuestions(
      Math.min(Math.max(parseInt(limit ?? '20', 10) || 20, 1), 100),
      Math.max(parseInt(offset ?? '0', 10) || 0, 0),
    );
    return { data };
  }

  @Get('by-category')
  async questionsByCategory(@Query('limit') limit?: string) {
    const data = await this.postsService.getQuestionsByCategory(Math.min(Math.max(parseInt(limit ?? '10', 10) || 10, 1), 50));
    return { data };
  }

  @Get(':id/related')
  async findRelated(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.postsService.getRelated(id, Math.min(Math.max(parseInt(limit ?? '5', 10) || 5, 1), 20));
  }

  @Post(':id/duplicate-reports')
  @UseGuards(JwtAuthGuard)
  async reportDuplicate(@Param('id') id: string, @Body() body: { targetSeoSlug: string }, @Req() req: Request) {
    const userId = (req.user as Record<string, unknown>).id as string;
    return this.postsService.reportDuplicate(id, String(body?.targetSeoSlug ?? '').trim(), userId);
  }

  @Get(':id/similar')
  @UseGuards(OptionalJwtGuard)
  async findSimilar(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.postsService.getSimilarPosts(id, Math.min(Math.max(parseInt(limit ?? '5', 10) || 5, 1), 20));
  }

  @Get(':seoSlug')
  @UseGuards(OptionalJwtGuard)
  async findBySlug(@Param('seoSlug') seoSlug: string, @Query('view') view?: string) {
    // view=0: metadata/share-card fetches that must not count as a page view.
    return this.postsService.findBySlug(seoSlug, view !== '0');
  }

  @Get('me/history')
  @UseGuards(JwtAuthGuard)
  async myHistory(@Req() req: Request) {
    const userId = (req.user as Record<string, unknown>).id as string;
    return this.postsService.myHistory(userId);
  }

  @Post(':id/visit')
  @UseGuards(JwtAuthGuard)
  async recordVisit(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as Record<string, unknown>).id as string;
    return this.postsService.recordVisit(id, userId);
  }

  @Get('me/drafts')
  @UseGuards(JwtAuthGuard)
  async myDrafts(@Req() req: Request) {
    const authorId = (req.user as Record<string, unknown>).id as string;
    return this.postsService.findMyDrafts(authorId);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  async publishDraft(@Param('id') id: string, @Req() req: Request) {
    const authorId = (req.user as Record<string, unknown>).id as string;
    return this.postsService.publishDraft(id, authorId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, UserThrottleGuard)
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

  // Rate-limited: trigram scan is expensive; 20 req/min prevents DoS.
  @Post('search')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async search(
    @Body() body: { query: string; limit?: number; offset?: number; communityId?: string },
  ) {
    const { query, communityId } = body;
    const limit = Math.min(Math.max(Number(body.limit) || 20, 1), 100);
    const offset = Math.max(Number(body.offset) || 0, 0);
    return this.postsService.search(query, limit, offset, communityId);
  }
}
