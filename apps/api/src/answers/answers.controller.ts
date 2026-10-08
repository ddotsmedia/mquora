import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AnswersService } from './answers.service';

@Controller('api/v1')
export class AnswersController {
  constructor(private answersService: AnswersService) {}

  @Get('posts/:postId/answers')
  async findByPost(@Param('postId') postId: string, @Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    return this.answersService.findByPost(postId, cursor, limit ? parseInt(limit, 10) : 20);
  }

  @Post('posts/:postId/answers')
  @UseGuards(JwtAuthGuard)
  async create(@Param('postId') postId: string, @Body() dto: Record<string, unknown>, @Req() req: Request) {
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
}
