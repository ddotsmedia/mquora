import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
// Routes: POST :id/invites (member creates link), GET invites/:token (public preview), POST invites/:token/accept
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

  @Get('memberships/me')
  @UseGuards(JwtAuthGuard)
  async myMemberships(@Req() req: Request) {
    return this.communitiesService.myMemberships((req.user as Record<string, unknown>).id as string);
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

  @Post(':id/invites')
  @UseGuards(JwtAuthGuard)
  async createInvite(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as Record<string, unknown>).id as string;
    return this.communitiesService.createInvite(id, userId);
  }

  @Get('invites/:token')
  async previewInvite(@Param('token') token: string) {
    return this.communitiesService.previewInvite(token);
  }

  @Get(':id/members')
  async listMembers(@Param('id') id: string) {
    return this.communitiesService.listMembers(id);
  }

  @Get(':id/members/me')
  @UseGuards(JwtAuthGuard)
  async myRole(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as Record<string, unknown>).id as string;
    return this.communitiesService.myRole(id, userId);
  }

  @Patch(':id/members/:userId')
  @UseGuards(JwtAuthGuard)
  async setMemberRole(@Param('id') id: string, @Param('userId') userId: string, @Body() body: { role: string }, @Req() req: Request) {
    const actorId = (req.user as Record<string, unknown>).id as string;
    return this.communitiesService.setMemberRole(id, userId, body?.role, actorId);
  }

  @Delete(':id/members/:userId')
  @UseGuards(JwtAuthGuard)
  async removeMember(@Param('id') id: string, @Param('userId') userId: string, @Req() req: Request) {
    const actorId = (req.user as Record<string, unknown>).id as string;
    return this.communitiesService.removeMember(id, userId, actorId);
  }

  @Post('invites/:token/accept')
  @UseGuards(JwtAuthGuard)
  async acceptInvite(@Param('token') token: string, @Req() req: Request) {
    const userId = (req.user as Record<string, unknown>).id as string;
    return this.communitiesService.acceptInvite(token, userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() dto: CreateCommunityDto, @Req() req: Request) {
    const userId = (req.user as Record<string, unknown>).id as string;
    return this.communitiesService.update(id, dto as unknown as Record<string, unknown>, userId);
  }
}
