import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { SavedSearchesService } from './saved-searches.service';

@Controller('api/v1/saved-searches')
@UseGuards(JwtAuthGuard)
export class SavedSearchesController {
  constructor(private savedSearches: SavedSearchesService) {}

  private uid(req: Request) {
    return (req.user as Record<string, unknown>).id as string;
  }

  @Get()
  list(@Req() req: Request) {
    return this.savedSearches.list(this.uid(req));
  }

  @Post()
  create(@Body() body: { query?: string }, @Req() req: Request) {
    return this.savedSearches.create(this.uid(req), body?.query ?? '');
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.savedSearches.remove(this.uid(req), id);
  }
}
