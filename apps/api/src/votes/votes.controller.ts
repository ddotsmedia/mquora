import { Controller, Post, Delete, Get, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { VotesService } from './votes.service';

const uid = (req: Request) => (req.user as { id: string }).id;

@Controller('api/v1/votes')
@UseGuards(JwtAuthGuard)
export class VotesController {
  constructor(private votesService: VotesService) {}

  @Post()
  async vote(@Body() dto: Record<string, unknown>, @Req() req: Request) {
    return this.votesService.vote(uid(req), dto.targetId as string, dto.targetType as string, dto.voteType as 'UP' | 'DOWN');
  }

  // My votes on a list of items, so buttons can show what I already voted: ?ids=a,b,c
  @Get('mine')
  async mine(@Query('ids') ids: string | undefined, @Req() req: Request) {
    return this.votesService.mine(uid(req), (ids ?? '').split(',').filter(Boolean).slice(0, 100));
  }

  @Delete(':targetType/:targetId')
  async removeByPath(@Param('targetType') targetType: string, @Param('targetId') targetId: string, @Req() req: Request) {
    return this.votesService.removeVote(uid(req), targetId, targetType);
  }

  @Delete()
  async removeVote(@Body() dto: Record<string, unknown>, @Req() req: Request) {
    return this.votesService.removeVote(uid(req), dto.targetId as string, dto.targetType as string);
  }
}
