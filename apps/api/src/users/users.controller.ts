import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { UpdateMeDto } from './users.dto';
import { UsersService } from './users.service';

const uid = (req: Request) => (req.user as { id: string }).id;

@Controller('api/v1/users')
export class UsersController {
  constructor(private users: UsersService) {}

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

  @Get(':username')
  profile(@Param('username') username: string) {
    return this.users.publicProfile(username);
  }
}
