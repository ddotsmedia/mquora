import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CommentsService } from './comments.service';

@Controller('api/v1')
export class CommentsController {
  constructor(private commentsService: CommentsService) {}

  @Get('posts/:postId/comments')
  async findByPost(@Param('postId') postId: string, @Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    return this.commentsService.findByPost(postId, cursor, limit ? parseInt(limit, 10) : 20);
  }

  @Get('answers/:answerId/comments')
  async findByAnswer(@Param('answerId') answerId: string, @Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    return this.commentsService.findByAnswer(answerId, cursor, limit ? parseInt(limit, 10) : 20);
  }

  @Post('comments')
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: Record<string, unknown>, @Req() req: Request) {
    const authorId = (req.user as Record<string, unknown>).id as string;
    return this.commentsService.create(dto, authorId);
  }

  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string, @Req() req: Request) {
    const authorId = (req.user as Record<string, unknown>).id as string;
    return this.commentsService.softDelete(id, authorId);
  }
}
