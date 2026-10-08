import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { OptionalJwtGuard } from '../guards/optional-jwt.guard';
import { AdminGuard } from '../guards/admin.guard';
import { ModerationService } from './moderation.service';

interface SubmitReportDto {
  targetType: 'POST' | 'ANSWER' | 'COMMENT' | 'USER';
  targetId: string;
  reason: string;
  details?: string;
}

interface ResolveReportDto {
  action: 'DISMISS' | 'WARN' | 'REMOVE' | 'BAN';
  notes?: string;
}

@Controller('api/v1/moderation')
export class ModerationController {
  constructor(private moderationService: ModerationService) {}

  @Post('report')
  @UseGuards(OptionalJwtGuard)
  async submitReport(@Body() dto: SubmitReportDto, @Req() req: Request) {
    const reporterId = (req.user as Record<string, unknown>)?.id as string | undefined || 'anonymous';
    return this.moderationService.submitReport(reporterId, dto.targetType, dto.targetId, dto.reason, dto.details);
  }

  @Get('reports')
  @UseGuards(AdminGuard)
  async getReports(
    @Query('status') status?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.moderationService.getReports(status, cursor, limit ? parseInt(limit, 10) : 20);
  }

  @Post('reports/:id/resolve')
  @UseGuards(AdminGuard)
  async resolveReport(@Param('id') id: string, @Body() dto: ResolveReportDto, @Req() req: Request) {
    const moderatorId = (req.user as Record<string, unknown>).id as string;
    const action = dto.action as unknown as 'DISMISS' | 'WARN' | 'REMOVE' | 'BAN';
    return this.moderationService.resolveReport(moderatorId, id, action, dto.notes);
  }
}
