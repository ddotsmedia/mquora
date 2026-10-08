import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AdminGuard } from '../guards/admin.guard';
import { AdminService } from './admin.service';

interface ChangeRoleDto {
  role: UserRole;
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
}
