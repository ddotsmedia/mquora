import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { UpdateMeDto, ChangePasswordDto } from './users.dto';
import { UsersService } from './users.service';

const uid = (req: Request) => (req.user as { id: string }).id;

@Controller('api/v1/users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('search')
  @UseGuards(JwtAuthGuard)
  search(@Query('q') q: string, @Query('limit') limit?: string) {
    return this.users.searchUsers(q, Number(limit) || 8);
  }

  // Declared before ':username' so "me" is not treated as a username.
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request) {
    return this.users.me(uid(req));
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(@Req() req: Request, @Body() dto: UpdateMeDto) {
    return this.users.updateMe(uid(req), dto);
  }

  @Patch('me/password')
  @UseGuards(JwtAuthGuard)
  changePassword(@Req() req: Request, @Body() dto: ChangePasswordDto) {
    return this.users.changePassword(uid(req), dto.currentPassword, dto.newPassword);
  }

  @Get('me/blocks')
  @UseGuards(JwtAuthGuard)
  myBlocks(@Req() req: Request) {
    return this.users.myBlocks((req.user as Record<string, unknown>).id as string);
  }

  @Get(':username/block-status')
  @UseGuards(JwtAuthGuard)
  blockStatus(@Param('username') username: string, @Req() req: Request) {
    return this.users.blockStatus((req.user as Record<string, unknown>).id as string, username);
  }

  @Post(':username/block')
  @UseGuards(JwtAuthGuard)
  block(@Param('username') username: string, @Req() req: Request) {
    return this.users.block((req.user as Record<string, unknown>).id as string, username);
  }

  @Delete(':username/block')
  @UseGuards(JwtAuthGuard)
  unblock(@Param('username') username: string, @Req() req: Request) {
    return this.users.unblock((req.user as Record<string, unknown>).id as string, username);
  }

  @Get(':username/answers')
  answers(@Param('username') username: string) {
    return this.users.answersOf(username);
  }

  @Get(':username')
  profile(@Param('username') username: string) {
    return this.users.publicProfile(username);
  }
}
