import { BadRequestException, Body, Controller, Get, Header, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { DigestService } from './digest.service';

@Controller('api/v1/digest')
export class DigestController {
  constructor(private readonly digest: DigestService) {}

  @Get('preference')
  @UseGuards(JwtAuthGuard)
  getPreference(@Req() req: Request) {
    return this.digest.preference((req.user as { id: string }).id);
  }

  @Post('preference')
  @UseGuards(JwtAuthGuard)
  setPreference(@Req() req: Request, @Body() body: { optIn?: boolean }) {
    if (typeof body?.optIn !== 'boolean') throw new BadRequestException('optIn must be true or false');
    return this.digest.setPreference((req.user as { id: string }).id, body.optIn);
  }

  // One-click unsubscribe from the email footer; no login needed, protected by the signed token.
  @Get('unsubscribe')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async unsubscribe(@Query('u') userId?: string, @Query('t') token?: string) {
    const ok = userId && token ? await this.digest.unsubscribe(userId, token) : false;
    const msg = ok ? 'You have been unsubscribed from the askvyo weekly digest.' : 'This link is invalid or has expired.';
    return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:sans-serif;padding:24px"><p>${msg}</p></body>`;
  }
}
