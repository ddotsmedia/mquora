import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CommunitiesService } from './communities.service';
import { CreateCommunityDto } from './create-community.dto';

@Controller('api/v1/communities')
export class CommunitiesController {
  constructor(private communitiesService: CommunitiesService) {}

  @Get()
  async findAll(@Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    return this.communitiesService.findAll(cursor, limit ? parseInt(limit, 10) : 20);
  }

  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.communitiesService.findBySlug(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateCommunityDto, @Req() req: Request) {
    const userId = (req.user as Record<string, unknown>).id as string;
    return this.communitiesService.create(dto as unknown as Record<string, unknown>, userId);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  async join(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as Record<string, unknown>).id as string;
    return this.communitiesService.join(id, userId);
  }

  @Post(':id/leave')
  @UseGuards(JwtAuthGuard)
  async leave(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as Record<string, unknown>).id as string;
    return this.communitiesService.leave(id, userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() dto: CreateCommunityDto, @Req() req: Request) {
    const userId = (req.user as Record<string, unknown>).id as string;
    return this.communitiesService.update(id, dto as unknown as Record<string, unknown>, userId);
  }
}
