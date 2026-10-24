import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { UserThrottleGuard } from '../guards/user-throttle.guard';
import { AdminGuard } from '../guards/admin.guard';
import { ModerationService } from './moderation.service';

class SubmitReportDto {
  @IsIn(['POST', 'ANSWER', 'COMMENT', 'USER']) targetType!: 'POST' | 'ANSWER' | 'COMMENT' | 'USER';
  @IsString() @MinLength(1) targetId!: string;
  @IsString() @MinLength(2) @MaxLength(100) reason!: string;
  @IsOptional() @IsString() @MaxLength(1000) details?: string;
}

interface ResolveReportDto {
  action: 'DISMISS' | 'WARN' | 'REMOVE' | 'BAN';
  notes?: string;
}

@Controller('api/v1/moderation')
export class ModerationController {
  constructor(private moderationService: ModerationService) {}

  @Post('report')
  @UseGuards(JwtAuthGuard, UserThrottleGuard) // reporter must be a real user (Report.reporterId is a foreign key)
  async submitReport(@Body() dto: SubmitReportDto, @Req() req: Request) {
    const reporterId = (req.user as { id: string }).id;
    return this.moderationService.submitReport(reporterId, dto.targetType, dto.targetId, dto.reason, dto.details);
  }

  @Get('reports')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getReports(
    @Query('status') status?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.moderationService.getReports(status, cursor, limit ? parseInt(limit, 10) : 20);
  }

  @Post('reports/:id/resolve')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async resolveReport(@Param('id') id: string, @Body() dto: ResolveReportDto, @Req() req: Request) {
    const moderatorId = (req.user as Record<string, unknown>).id as string;
    const action = dto.action as unknown as 'DISMISS' | 'WARN' | 'REMOVE' | 'BAN';
    return this.moderationService.resolveReport(moderatorId, id, action, dto.notes);
  }
}
