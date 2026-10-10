import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { AdminService, Actor } from './admin.service';
import {
  AuditQueryDto,
  BanDto,
  ContentQueryDto,
  DaysQueryDto,
  FlagDto,
  PageQueryDto,
  ReportsQueryDto,
  ResolveDto,
  RoleDto,
  UsersQueryDto,
} from './admin.dto';

@Controller('api/v1/admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  private actor(req: { user: Actor }): Actor {
    return { id: req.user.id, role: req.user.role };
  }

  @Get('stats')
  getStats() {
    return this.admin.getStats();
  }

  @Get('timeseries')
  getTimeseries(@Query() q: DaysQueryDto) {
    return this.admin.getTimeseries(q.days);
  }

  @Get('users')
  getUsers(@Query() q: UsersQueryDto) {
    return this.admin.getUsers({ q: q.q, role: q.role, page: q.page, limit: q.limit });
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.admin.getUserDetail(id);
  }

  @Post('users/:id/ban')
  banUser(@Req() req: { user: Actor }, @Param('id') id: string, @Body() dto: BanDto) {
    return this.admin.banUser(this.actor(req), id, dto.days);
  }

  @Post('users/:id/unban')
  unbanUser(@Req() req: { user: Actor }, @Param('id') id: string) {
    return this.admin.unbanUser(this.actor(req), id);
  }

  @Post('users/:id/role')
  changeUserRole(@Req() req: { user: Actor }, @Param('id') id: string, @Body() dto: RoleDto) {
    return this.admin.changeUserRole(this.actor(req), id, dto.role as UserRole);
  }

  @Get('content')
  getContent(@Query() q: ContentQueryDto) {
    return this.admin.getContent({ filter: q.filter, status: q.status, q: q.q, page: q.page, limit: q.limit });
  }

  @Post('content/:id/remove')
  removeContent(@Req() req: { user: Actor }, @Param('id') id: string) {
    return this.admin.setPostStatus(this.actor(req), id, 'REMOVED');
  }

  @Post('content/:id/restore')
  restoreContent(@Req() req: { user: Actor }, @Param('id') id: string) {
    return this.admin.setPostStatus(this.actor(req), id, 'PUBLISHED');
  }

  @Delete('content/:id')
  deleteContent(@Req() req: { user: Actor }, @Param('id') id: string) {
    return this.admin.setPostStatus(this.actor(req), id, 'REMOVED');
  }

  @Get('reports')
  getReports(@Query() q: ReportsQueryDto) {
    return this.admin.getReports({ status: q.status, page: q.page, limit: q.limit });
  }

  @Post('reports/:id/resolve')
  resolveReport(@Req() req: { user: Actor }, @Param('id') id: string, @Body() dto: ResolveDto) {
    return this.admin.resolveReport(this.actor(req), id, dto.action);
  }

  @Get('communities')
  getCommunities(@Query() q: PageQueryDto) {
    return this.admin.getCommunities({ page: q.page, limit: q.limit });
  }

  @Get('audit-log')
  getAuditLog(@Query() q: AuditQueryDto) {
    return this.admin.getAuditLog({ action: q.action, page: q.page, limit: q.limit });
  }

  @Get('queues')
  getQueues() {
    return this.admin.getQueueStats();
  }

  @Get('flags')
  getFlags() {
    return this.admin.getFeatureFlags();
  }

  @Patch('flags')
  async setFlag(@Req() req: { user: Actor }, @Body() dto: FlagDto) {
    await this.admin.setFeatureFlag(this.actor(req), dto.key, dto.enabled);
    return { success: true };
  }

  @Get('analytics')
  getAnalytics() {
    return this.admin.getAnalytics();
  }
}
