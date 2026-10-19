import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CommentsService } from './comments.service';

class CreateCommentDto {
  @IsString() @MinLength(1) @MaxLength(1000) body!: string;
  @IsOptional() @IsString() postId?: string;
  @IsOptional() @IsString() answerId?: string;
  @IsOptional() @IsString() parentId?: string;
}

const actor = (req: Request) => req.user as { id: string; role?: string };

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
  @Throttle({ default: { limit: 10, ttl: 60_000 } }) // anti-spam: 10 comments a minute
  async create(@Body() dto: CreateCommentDto, @Req() req: Request) {
    return this.commentsService.create(dto, actor(req).id);
  }

  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string, @Req() req: Request) {
    return this.commentsService.softDelete(id, actor(req).id, actor(req).role);
  }
}
