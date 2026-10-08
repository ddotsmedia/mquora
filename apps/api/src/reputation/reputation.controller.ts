import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ReputationService } from './reputation.service';

@Controller('api/v1/reputation')
export class ReputationController {
  constructor(private reputationService: ReputationService) {}

  @Get('leaderboard')
  async getLeaderboard(@Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    return this.reputationService.getLeaderboard(cursor, limit ? parseInt(limit, 10) : 20);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyReputation(@Req() req: Request) {
    const userId = (req.user as Record<string, unknown>).id as string;
    return this.reputationService.getUserReputation(userId);
  }
}
