import { Controller, Get, Post, Body, Param, Query, UseGuards, Delete } from '@nestjs/common';
import { UserRole, ReportStatus } from '@prisma/client';
import { AdminGuard } from '../guards/admin.guard';
import { AdminService } from './admin.service';

interface ChangeRoleDto {
  role: UserRole;
}

interface SetFlagDto {
  key: string;
  enabled: boolean;
}

@Controller('api/v1/admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('stats')
  async getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  async getUsers(@Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    return this.adminService.getUsers(cursor, limit ? parseInt(limit, 10) : 20);
  }

  @Post('users/:id/ban')
  async banUser(@Param('id') id: string) {
    return this.adminService.banUser(id);
  }

  @Post('users/:id/unban')
  async unbanUser(@Param('id') id: string) {
    return this.adminService.unbanUser(id);
  }

  @Post('users/:id/role')
  async changeUserRole(@Param('id') id: string, @Body() dto: ChangeRoleDto) {
    return this.adminService.changeUserRole(id, dto.role);
  }

  @Get('audit-log')
  async getAuditLog(@Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    return this.adminService.getAuditLog(cursor, limit ? parseInt(limit, 10) : 20);
  }

  @Get('queues')
  async getQueues() {
    return this.adminService.getQueueStats();
  }

  @Get('flags')
  async getFlags() {
    return this.adminService.getFeatureFlags();
  }

  @Post('flags')
  async setFlag(@Body() dto: SetFlagDto) {
    await this.adminService.setFeatureFlag(dto.key, dto.enabled);
    return { success: true };
  }

  @Get('analytics')
  async getAnalytics() {
    return this.adminService.getAnalytics();
  }

  @Get('content')
  async getContent(
    @Query('filter') filter?: 'all' | 'flagged' | 'low-quality',
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getContent(filter, cursor, limit ? parseInt(limit, 10) : 20);
  }

  @Delete('content/:id')
  async removeContent(@Param('id') id: string) {
    return this.adminService.removeContent(id);
  }

  @Get('reports')
  async getReports(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getReports(status as ReportStatus | undefined, limit ? parseInt(limit, 10) : 20);
  }

  @Post('reports/:id/dismiss')
  async dismissReport(@Param('id') id: string) {
    return this.adminService.dismissReport(id);
  }

  @Post('reports/:id/remove-content')
  async removeReportedContent(@Param('id') id: string) {
    return this.adminService.removeReportedContent(id);
  }

  @Post('reports/:id/warn-user')
  async warnReportUser(@Param('id') id: string) {
    return this.adminService.warnReportUser(id);
  }

  @Get('communities')
  async getCommunities() {
    return this.adminService.getCommunities();
  }
}
