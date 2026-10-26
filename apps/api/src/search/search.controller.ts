import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { UserThrottleGuard } from '../guards/user-throttle.guard';

@Controller('api/v1/search')
export class SearchController {
  constructor(private searchService: SearchService) {}

  // Public but rate-limited: trigram scan is CPU-heavy; 20 req/min per IP prevents DoS.
  @Get()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async search(
    @Query('q') q: string,
    @Query('type') type?: string,
    @Query('language') language?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.searchService.search(q || '', {
      type,
      language,
      cursor,
      limit: Math.min(Math.max(parseInt(limit ?? '20', 10) || 20, 1), 100),
    });
  }

  // POST alias so future callers can pass body too
  @Post()
  @UseGuards(JwtAuthGuard, UserThrottleGuard)
  async searchPost(@Body() body: { query?: string; q?: string; limit?: number; offset?: number; language?: string }) {
    const q = body.query || body.q || '';
    return this.searchService.search(q, {
      limit: body.limit || 20,
      cursor: body.offset ? String(body.offset) : undefined,
      language: body.language,
    });
  }

  // Public but rate-limited: 30 req/min per IP.
  @Get('suggest')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async suggest(@Query('q') q: string) {
    return this.searchService.suggest(q);
  }
}
