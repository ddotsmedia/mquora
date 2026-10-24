import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('api/v1/search')
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Get()
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
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  // POST alias so future callers can pass body too
  @Post()
  async searchPost(@Body() body: { query?: string; q?: string; limit?: number; offset?: number; language?: string }) {
    const q = body.query || body.q || '';
    return this.searchService.search(q, {
      limit: body.limit || 20,
      cursor: body.offset ? String(body.offset) : undefined,
      language: body.language,
    });
  }

  @Get('suggest')
  async suggest(@Query('q') q: string) {
    return this.searchService.suggest(q);
  }
}
