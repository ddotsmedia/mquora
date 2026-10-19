import { Controller, Get, Param, Query } from '@nestjs/common';
import { TrendingService } from './trending.service';

@Controller('api/v1/trending')
export class TrendingController {
  constructor(private readonly trending: TrendingService) {}

  @Get('tags')
  tags(@Query('limit') limit?: string) {
    return this.trending.tags(Number(limit));
  }

  @Get('posts')
  posts(@Query('limit') limit?: string) {
    return this.trending.posts(Number(limit));
  }

  @Get('unanswered')
  unanswered(@Query('limit') limit?: string) {
    return this.trending.unanswered(Number(limit));
  }

  @Get('communities')
  communities(@Query('limit') limit?: string) {
    return this.trending.communities(Number(limit));
  }
}

@Controller('api/v1/tags')
export class TagsController {
  constructor(private readonly trending: TrendingService) {}

  @Get()
  all(@Query('q') q?: string, @Query('limit') limit?: string) {
    return this.trending.allTags(q?.trim() || undefined, Number(limit));
  }

  @Get(':slug')
  one(@Param('slug') slug: string, @Query('limit') limit?: string) {
    return this.trending.tagBySlug(slug, Number(limit));
  }
}
