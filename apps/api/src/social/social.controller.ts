import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { SocialService } from './social.service';

class OnboardingDto {
  @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) communityIds!: string[];
  @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) tagIds!: string[];
}

class AnswerRequestDto {
  @IsString() requesteeId!: string;
  @IsOptional() @IsString() @MaxLength(500) message?: string;
}

const uid = (req: Request) => (req.user as { id: string }).id;

@Controller('api/v1')
@UseGuards(JwtAuthGuard)
export class SocialController {
  constructor(private social: SocialService) {}

  @Get('feed/following')
  following(@Req() req: Request, @Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    return this.social.followingFeed(uid(req), cursor, Math.min(Math.max(parseInt(limit ?? '20', 10) || 20, 1), 100));
  }

  @Get('feed/for-you')
  forYou(@Req() req: Request, @Query('limit') limit?: string) {
    return this.social.questionsForYou(uid(req), Math.min(Math.max(parseInt(limit ?? '20', 10) || 20, 1), 100));
  }

  @Get('questions/:postId/follow')
  questionStatus(@Req() req: Request, @Param('postId') postId: string) {
    return this.social.questionStatus(uid(req), postId);
  }

  @Post('questions/:postId/follow')
  followQuestion(@Req() req: Request, @Param('postId') postId: string) {
    return this.social.followQuestion(uid(req), postId);
  }

  @Delete('questions/:postId/follow')
  unfollowQuestion(@Req() req: Request, @Param('postId') postId: string) {
    return this.social.unfollowQuestion(uid(req), postId);
  }

  @Post('questions/:postId/pass')
  pass(@Req() req: Request, @Param('postId') postId: string) {
    return this.social.passQuestion(uid(req), postId);
  }

  @Get('topics/:slug/follow')
  tagStatus(@Req() req: Request, @Param('slug') slug: string) {
    return this.social.tagStatus(uid(req), slug);
  }

  @Post('topics/:slug/follow')
  followTag(@Req() req: Request, @Param('slug') slug: string) {
    return this.social.followTag(uid(req), slug, true);
  }

  @Delete('topics/:slug/follow')
  unfollowTag(@Req() req: Request, @Param('slug') slug: string) {
    return this.social.followTag(uid(req), slug, false);
  }

  @Get('me/interests')
  interests(@Req() req: Request) {
    return this.social.myInterests(uid(req));
  }

  @Post('me/onboarding')
  onboarding(@Req() req: Request, @Body() dto: OnboardingDto) {
    return this.social.completeOnboarding(uid(req), dto.communityIds, dto.tagIds);
  }

  @Post('me/onboarding/skip')
  skip(@Req() req: Request) {
    return this.social.skipOnboarding(uid(req));
  }

  // Answer requests
  @Post('questions/:postId/request-answer')
  requestAnswer(@Req() req: Request, @Param('postId') postId: string, @Body() dto: AnswerRequestDto) {
    return this.social.requestAnswer(uid(req), postId, dto.requesteeId, dto.message);
  }

  @Get('questions/:postId/answer-requests')
  answerRequests(@Req() req: Request, @Param('postId') postId: string) {
    return this.social.getAnswerRequests(uid(req), postId);
  }

  @Get('me/answer-requests')
  myAnswerRequests(@Req() req: Request) {
    return this.social.myAnswerRequests(uid(req));
  }
}
