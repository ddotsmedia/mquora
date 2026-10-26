import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AnswersService } from './answers.service';
import { CreateAnswerDto, VoteAnswerDto } from './dto/create-answer.dto';

@Controller('api/v1')
export class AnswersController {
  constructor(private answersService: AnswersService) {}

  @Get('posts/:postId/answers')
  async findByPost(@Param('postId') postId: string, @Query('cursor') cursor?: string, @Query('limit') limit?: string, @Query('sort') sort?: string) {
    return this.answersService.findByPost(postId, cursor, limit ? parseInt(limit, 10) : 20, sort);
  }

  @Get('posts/:postId/answer-summary')
  async getAnswerSummary(@Param('postId') postId: string) {
    const summary = await this.answersService.getAnswerSummary(postId);
    return { summary };
  }

  @Post('posts/:postId/answers')
  @UseGuards(JwtAuthGuard)
  async create(@Param('postId') postId: string, @Body() dto: CreateAnswerDto, @Req() req: Request) {
    const authorId = (req.user as Record<string, unknown>).id as string;
    return this.answersService.create(postId, dto, authorId);
  }

  @Post('answers/:id/accept')
  @UseGuards(JwtAuthGuard)
  async accept(@Param('id') id: string, @Req() req: Request) {
    const requesterId = (req.user as Record<string, unknown>).id as string;
    return this.answersService.accept(id, requesterId);
  }

  @Delete('answers/:id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string, @Req() req: Request) {
    const authorId = (req.user as Record<string, unknown>).id as string;
    return this.answersService.softDelete(id, authorId);
  }

  @Post('answers/:id/vote')
  @UseGuards(JwtAuthGuard)
  async vote(@Param('id') id: string, @Body() dto: VoteAnswerDto, @Req() req: Request) {
    const userId = (req.user as Record<string, unknown>).id as string;
    return this.answersService.voteAnswer(id, userId, dto.type);
  }

  @Delete('answers/:id/vote')
  @UseGuards(JwtAuthGuard)
  async removeVote(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as Record<string, unknown>).id as string;
    await this.answersService.removeAnswerVote(id, userId);
    return { removed: true };
  }

  @Get('answers/:id/vote-status')
  async getVoteStatus(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.answersService.getAnswerVoteStatus(id, userId);
  }
}
