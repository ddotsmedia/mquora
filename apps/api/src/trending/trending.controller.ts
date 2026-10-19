import { Controller, Get, Query } from '@nestjs/common';
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
