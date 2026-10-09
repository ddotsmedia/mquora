import { Controller, Get, Query } from '@nestjs/common';
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
    return this.searchService.search(q, {
      type,
      language,
      cursor,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  @Get('suggest')
  async suggest(@Query('q') q: string) {
    return this.searchService.suggest(q);
  }
}
