import { Controller, Post, Delete, Body, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { VotesService } from './votes.service';

@Controller('api/v1/votes')
@UseGuards(JwtAuthGuard)
export class VotesController {
  constructor(private votesService: VotesService) {}

  @Post()
  async vote(@Body() dto: Record<string, unknown>, @Req() req: Request) {
    const authorId = (req.user as Record<string, unknown>).id as string;
    return this.votesService.vote(authorId, dto.targetId as string, dto.targetType as string, dto.voteType as 'UP' | 'DOWN');
  }

  @Delete()
  async removeVote(@Body() dto: Record<string, unknown>, @Req() req: Request) {
    const authorId = (req.user as Record<string, unknown>).id as string;
    return this.votesService.removeVote(authorId, dto.targetId as string, dto.targetType as string);
  }
}
