import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { AdminService, Actor } from './admin.service';
import {
  AnnouncementDto,
  AuditQueryDto,
  BulkActionDto,
  CommunityCreateDto,
  CommunityUpdateDto,
  SearchPageQueryDto,
  TagCreateDto,
  TagUpdateDto,
  BanDto,
  ContentQueryDto,
  DaysQueryDto,
  FlagDto,
  ReportsQueryDto,
  ResolveDto,
  RoleDto, VerifyDto,
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

  // Declared before users/:id so "export" is not treated as an id.
  @Get('users/export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="mquora-users.csv"')
  exportUsers(@Req() req: { user: Actor }) {
    return this.admin.exportUsersCsv(this.actor(req));
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

  @Post('users/:id/verify')
  setVerified(@Req() req: { user: Actor }, @Param('id') id: string, @Body() dto: VerifyDto) {
    return this.admin.setVerified(this.actor(req), id, dto.verified);
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

  @Post('reports/bulk-action')
  bulkActionReports(@Req() req: { user: Actor }, @Body() dto: BulkActionDto) {
    return this.admin.bulkResolveReports(this.actor(req), dto.ids, dto.action);
  }

  @Get('communities')
  getCommunities(@Query() q: SearchPageQueryDto) {
    return this.admin.getCommunities({ q: q.q, page: q.page, limit: q.limit });
  }

  // Declared before communities/:id routes.
  @Post('communities/starter')
  createStarterCommunities(@Req() req: { user: Actor }) {
    return this.admin.createStarterCommunities(this.actor(req));
  }

  @Post('communities')
  createCommunity(@Req() req: { user: Actor }, @Body() dto: CommunityCreateDto) {
    return this.admin.createCommunity(this.actor(req), dto);
  }

  @Patch('communities/:id')
  updateCommunity(@Req() req: { user: Actor }, @Param('id') id: string, @Body() dto: CommunityUpdateDto) {
    return this.admin.updateCommunity(this.actor(req), id, dto);
  }

  @Delete('communities/:id')
  deleteCommunity(@Req() req: { user: Actor }, @Param('id') id: string) {
    return this.admin.deleteCommunity(this.actor(req), id);
  }

  @Get('tags')
  getTags(@Query() q: SearchPageQueryDto) {
    return this.admin.getTags({ q: q.q, page: q.page, limit: q.limit });
  }

  @Post('tags')
  createTag(@Req() req: { user: Actor }, @Body() dto: TagCreateDto) {
    return this.admin.createTag(this.actor(req), dto);
  }

  @Patch('tags/:id')
  renameTag(@Req() req: { user: Actor }, @Param('id') id: string, @Body() dto: TagUpdateDto) {
    return this.admin.renameTag(this.actor(req), id, dto.name);
  }

  @Delete('tags/:id')
  deleteTag(@Req() req: { user: Actor }, @Param('id') id: string) {
    return this.admin.deleteTag(this.actor(req), id);
  }

  @Get('announcements')
  getAnnouncements() {
    return this.admin.getAnnouncements();
  }

  @Post('announcements')
  sendAnnouncement(@Req() req: { user: Actor }, @Body() dto: AnnouncementDto) {
    return this.admin.sendAnnouncement(this.actor(req), dto);
  }

  @Get('system')
  getSystem() {
    return this.admin.getSystemHealth();
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

  @Get('features')
  getFeatures() {
    return this.admin.getAdminFeatures();
  }

  @Post('create-admin')
  createAdmin(@Req() req: { user: Actor }, @Body() dto: CreateAdminDto) {
    return this.admin.createAdmin(this.actor(req), dto.email, dto.password, dto.displayName, dto.featureKeys);
  }

  @Get('admins')
  listAdmins(@Query() q: { page?: string; limit?: string }) {
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(q.limit) || 20));
    return this.admin.listAdmins(page, limit);
  }

  @Post('admins/:id/permissions')
  updateAdminPermissions(@Req() req: { user: Actor }, @Param('id') id: string, @Body() dto: UpdateAdminPermissionsDto) {
    return this.admin.updateAdminPermissions(this.actor(req), id, dto.featureKeys);
  }

  @Delete('admins/:id')
  deleteAdmin(@Req() req: { user: Actor }, @Param('id') id: string) {
    return this.admin.deleteAdmin(this.actor(req), id);
  }
}
