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

  @Get('question-of-day')
  async questionOfDay() {
    const data = await this.postsService.getQuestionOfTheDay();
    return { data };
  }

  @Get('popular-this-week')
  async popularThisWeek(@Query('limit') limit?: string) {
    const data = await this.postsService.getPopularThisWeek(limit ? parseInt(limit, 10) : 5);
    return { data };
  }

  @Get('recent')
  async recentQuestions(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    const data = await this.postsService.getRecentQuestions(
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0
    );
    return { data };
  }

  @Get('by-category')
  async questionsByCategory(@Query('limit') limit?: string) {
    const data = await this.postsService.getQuestionsByCategory(limit ? parseInt(limit, 10) : 10);
    return { data };
  }

  @Get(':id/related')
  async findRelated(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.postsService.getRelated(id, limit ? parseInt(limit, 10) : 5);
  }

  @Get(':id/similar')
  @UseGuards(OptionalJwtGuard)
  async findSimilar(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.postsService.getSimilarPosts(id, limit ? parseInt(limit, 10) : 5);
  }

  @Get(':seoSlug')
  @UseGuards(OptionalJwtGuard)
  async findBySlug(@Param('seoSlug') seoSlug: string, @Query('view') view?: string) {
    // view=0: metadata/share-card fetches that must not count as a page view.
    return this.postsService.findBySlug(seoSlug, view !== '0');
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

  @Post('search')
  async search(
    @Body() body: { query: string; limit?: number; offset?: number; communityId?: string },
  ) {
    const { query, limit = 20, offset = 0, communityId } = body;
    return this.postsService.search(query, limit, offset, communityId);
  }
}
