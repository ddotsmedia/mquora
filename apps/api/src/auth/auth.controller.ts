import { Controller, Post, Get, Body, Res, Req, Headers, UseGuards, HttpCode, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { assertInternalSecret } from '../shared/internal-secret';
import { Response, Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { EmailThrottleGuard } from '../guards/email-throttle.guard';
import { verifyTurnstile } from '../shared/turnstile';
import { AuthService } from './auth.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from '../dto/password-reset.dto';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @UseGuards(EmailThrottleGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async register(@Body() dto: RegisterDto & { 'cf-turnstile-response'?: string }) {
    const token = dto['cf-turnstile-response'];
    const ok = await verifyTurnstile(token);
    if (!ok) throw new BadRequestException('Bot verification failed. Please try again.');
    return this.authService.register(dto);
  }

  @Post('login')
  @UseGuards(EmailThrottleGuard)
  @Throttle({ default: { limit: 10, ttl: 900000 } })
  // Throttle is per-email (not per-IP) so the web server's internal calls don't exhaust a shared quota.
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    const { refreshToken } = result; // also returned in the body for the web server's session
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return result;
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Body() body: { refreshToken?: string }) {
    // Web server sends it in the body; browsers send the httpOnly cookie.
    const refreshToken = body?.refreshToken || req.cookies?.['refreshToken'];
    if (!refreshToken || typeof refreshToken !== 'string') throw new UnauthorizedException('No refresh token');
    return this.authService.refresh(refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.['refreshToken'] || (req.body as { refreshToken?: string } | undefined)?.refreshToken;
    if (refreshToken) {
      try {
        await this.authService.logout(refreshToken);
      } catch (e) {
        // ignore
      }
    }
    // Also revoke the session behind the caller's access token, so it stops working immediately.
    const sid = (req.user as { sid?: string } | undefined)?.sid;
    if (sid) await this.authService.revokeSession(sid);
    res.clearCookie('refreshToken');
    return { success: true };
  }

  // Called only by the web server after NextAuth verified the provider sign-in. Internal-only.
  @Post('oauth-signin')
  @HttpCode(200)
  async oauthSignin(
    @Headers('x-internal-secret') secret: string | undefined,
    @Body() body: { email: string; name: string; image?: string; provider: string },
  ) {
    assertInternalSecret(secret);
    return this.authService.oauthSignin(body);
  }

  @Post('google-one-tap')
  @HttpCode(200)
  async googleOneTap(@Body() body: { credential: string }) {
    return this.authService.googleOneTap(body.credential);
  }

  @Post('password-reset/request')
  @UseGuards(EmailThrottleGuard)
  // Per-email: 5 attempts per 15 min (EmailThrottleGuard above).
  // Per-IP: 10 attempts per hour prevents enumeration across many addresses from one IP.
  @Throttle({ default: { limit: 10, ttl: 3600000 } })
  @HttpCode(200)
  async requestPasswordReset(@Body() dto: ForgotPasswordDto) {
    await this.authService.requestPasswordReset(dto.email);
    return { message: 'If an account exists for that email, a reset link has been sent.' };
  }

  // No per-email throttle here: the web server calls this from one shared IP, and the 256-bit token
  // already makes guessing infeasible.
  @Post('password-reset/confirm')
  @HttpCode(200)
  async confirmPasswordReset(@Body() dto: ResetPasswordDto) {
    return this.authService.confirmPasswordReset(dto.token, dto.newPassword);
  }

  @Get('2fa/status')
  @UseGuards(JwtAuthGuard)
  async twoFactorStatus(@Req() req: Request) {
    return this.authService.twoFactorStatus((req.user as Record<string, unknown>).id as string);
  }

  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 900000 } })
  async twoFactorSetup(@Req() req: Request) {
    return this.authService.twoFactorSetup((req.user as Record<string, unknown>).id as string);
  }

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 900000 } })
  @HttpCode(200)
  async twoFactorEnable(@Body() body: { code?: string }, @Req() req: Request) {
    return this.authService.twoFactorEnable((req.user as Record<string, unknown>).id as string, body?.code ?? '');
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 900000 } })
  @HttpCode(200)
  async twoFactorDisable(@Body() body: { password?: string; code?: string }, @Req() req: Request) {
    return this.authService.twoFactorDisable((req.user as Record<string, unknown>).id as string, body?.password ?? '', body?.code ?? '');
  }

  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
