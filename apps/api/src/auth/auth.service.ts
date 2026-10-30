import { Injectable, BadRequestException, ForbiddenException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { isBanned } from '../shared/ban';
import { decryptSecret, encryptSecret, matchTotp, newBackupCodes, newTotpSecret, normalizeBackupCode, otpauthUri } from './totp';
import { sendMail } from '../shared/mailer';

// Refresh tokens are 256-bit random values; a fast deterministic hash is enough to look them up.
const hashToken = (raw: string) => createHash('sha256').update(raw).digest('hex');

const ACCESS_TTL = '15m';
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ROTATION_GRACE_MS = 30 * 1000;
const RESET_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class AuthService {
  private prisma = new PrismaClient();

  constructor(private jwtService: JwtService) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });
    // Same response whether or not the account exists, so registration cannot be used to enumerate accounts.
    if (existing) {
      return { pending: true, message: 'Registration successful. Your account is awaiting admin approval before you can log in.' };
    }

    const passwordHash = await argon2.hash(dto.password);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await (this.prisma as any).user.create({
      data: {
        email: dto.email,
        displayName: dto.displayName,
        username: dto.username,
        passwordHash,
        isApproved: false,
        profile: { create: {} },
      },
      select: { id: true, email: true, username: true, role: true, displayName: true },
    }) as { id: string; email: string; username: string; role: string; displayName: string };

    // Notify admins about new registration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.prisma as any).adminNotification.create({
      data: {
        type: 'USER_REGISTRATION',
        title: 'New user registration',
        body: `${dto.displayName} (@${dto.username}) registered and is awaiting approval`,
        link: `/admin/users/${user.id}`,
        relatedUserId: user.id,
      },
    });

    return { pending: true, message: 'Registration successful. Your account is awaiting admin approval before you can log in.' };
  }

  async login(dto: LoginDto) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await (this.prisma as any).user.findUnique({ where: { email: dto.email } }) as any;
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');
    if (user.deletedAt) throw new UnauthorizedException('Account deleted');

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    if (!user.isApproved) throw new ForbiddenException('Your account is pending admin approval. You will be notified once approved.');
    if (isBanned(user)) {
      const until = user.bannedUntil ? ` until ${user.bannedUntil.toISOString().slice(0, 10)}` : ' permanently';
      throw new ForbiddenException(`Account is suspended${until}`);
    }

    if (user.totpEnabledAt) {
      const code = (dto.totp ?? '').trim();
      if (!code) throw new UnauthorizedException('TWO_FACTOR_REQUIRED');
      if (!(await this.consumeSecondFactor(user, code))) throw new UnauthorizedException('INVALID_TWO_FACTOR_CODE');
    }

    const tokens = await this.generateTokens(user.id);
    return {
      ...tokens,
      user: { id: user.id, email: user.email, username: user.username, displayName: user.displayName, role: user.role },
    };
  }

  /**
   * Accepts a current authenticator code (once per time step) or an unused backup code (once ever).
   * Each use is claimed with a conditional write, so two concurrent requests cannot both succeed.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async consumeSecondFactor(user: any, code: string): Promise<boolean> {
    if (/^\d{6}$/.test(code) && user.totpSecret) {
      let secret: string;
      try {
        secret = decryptSecret(user.totpSecret);
      } catch {
        return false;
      }
      const step = matchTotp(secret, code, user.totpLastStep ?? null);
      if (step === null) return false;
      const claimed = await this.prisma.user.updateMany({
        where: { id: user.id, OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }] },
        data: { totpLastStep: step },
      });
      return claimed.count === 1;
    }

    const hash = hashToken(normalizeBackupCode(code));
    if (!(user.totpBackupHashes ?? []).includes(hash)) return false;
    const removed = await this.prisma.$executeRaw`
      UPDATE "User" SET "totpBackupHashes" = array_remove("totpBackupHashes", ${hash})
      WHERE id = ${user.id} AND ${hash} = ANY("totpBackupHashes")`;
    return removed === 1;
  }

  async twoFactorStatus(userId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await (this.prisma as any).user.findUnique({ where: { id: userId }, select: { totpEnabledAt: true } });
    return { enabled: !!user?.totpEnabledAt };
  }

  async twoFactorSetup(userId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await (this.prisma as any).user.findUnique({ where: { id: userId }, select: { email: true, totpEnabledAt: true } });
    if (!user) throw new UnauthorizedException();
    if (user.totpEnabledAt) throw new BadRequestException('Two-factor sign-in is already on');
    const secret = newTotpSecret();
    try {
      await this.prisma.user.update({ where: { id: userId }, data: { totpSecret: encryptSecret(secret), totpLastStep: null } });
    } catch {
      throw new ServiceUnavailableException('Two-factor sign-in is not configured on this server yet');
    }
    return { secret, otpauthUrl: otpauthUri(secret, user.email) };
  }

  async twoFactorEnable(userId: string, code: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await (this.prisma as any).user.findUnique({ where: { id: userId } });
    if (!user?.totpSecret || user.totpEnabledAt) throw new BadRequestException('Start two-factor setup first');
    let secret: string;
    try {
      secret = decryptSecret(user.totpSecret);
    } catch {
      throw new ServiceUnavailableException('Two-factor sign-in is not configured on this server yet');
    }
    const step = matchTotp(secret, String(code ?? '').trim(), null);
    if (step === null) throw new BadRequestException('That code is not correct. Check the time on your phone and try again.');
    const backupCodes = newBackupCodes();
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totpEnabledAt: new Date(),
        totpLastStep: step,
        totpBackupHashes: backupCodes.map((c) => hashToken(normalizeBackupCode(c))),
      },
    });
    return { enabled: true, backupCodes };
  }

  async twoFactorDisable(userId: string, password: string, code: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await (this.prisma as any).user.findUnique({ where: { id: userId } });
    if (!user?.totpEnabledAt) throw new BadRequestException('Two-factor sign-in is not on');
    if (!user.passwordHash || !(await argon2.verify(user.passwordHash, password ?? ''))) {
      throw new UnauthorizedException('Password is incorrect');
    }
    if (!(await this.consumeSecondFactor(user, String(code ?? '').trim()))) {
      throw new UnauthorizedException('Authentication code is incorrect');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpSecret: null, totpEnabledAt: null, totpLastStep: null, totpBackupHashes: [] },
    });
    return { enabled: false };
  }

  // Issues a new access token for a valid refresh token. The refresh token is not rotated, so
  // concurrent server renders that refresh at the same time all succeed.
  // Rotates the refresh token: a new one is issued and the used one stays valid for a short grace
  // window so concurrent server renders that refresh at the same moment do not log the user out.
  async refresh(rawToken: string) {
    const session = await this.prisma.session.findUnique({ where: { tokenHash: hashToken(rawToken) } });
    if (!session || new Date() > session.expiresAt) throw new UnauthorizedException('Invalid refresh token');
    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      select: { deletedAt: true, bannedAt: true, bannedUntil: true },
    });
    if (!user || user.deletedAt || isBanned(user)) throw new UnauthorizedException('Session no longer valid');

    const newRaw = randomBytes(32).toString('hex');
    const newSession = await this.prisma.session.create({
      data: { userId: session.userId, tokenHash: hashToken(newRaw), expiresAt: new Date(Date.now() + REFRESH_TTL_MS) },
    });
    await this.prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: new Date(Date.now() + ROTATION_GRACE_MS) },
    });
    const accessToken = this.jwtService.sign({ sub: session.userId, sid: newSession.id }, { expiresIn: ACCESS_TTL });
    return { accessToken, refreshToken: newRaw };
  }

  async logout(rawToken: string) {
    await this.prisma.session.deleteMany({ where: { tokenHash: hashToken(rawToken) } });
  }

  // Emails a single-use reset link. Always returns normally so the response never reveals whether the account exists.
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null, isApproved: true, NOT: { passwordHash: null } },
      select: { id: true, email: true, displayName: true },
    });
    if (!user) return;

    const raw = randomBytes(32).toString('hex');
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
      this.prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + RESET_TTL_MS) },
      }),
    ]);

    const base = (process.env.NEXTAUTH_URL || process.env.SITE_URL || '').replace(/\/$/, '');
    const link = `${base}/reset-password?token=${raw}`;
    try {
      await sendMail(
        user.email,
        'Reset your askvyo password',
        `Hi ${user.displayName},\n\nUse this link to set a new password. It expires in 30 minutes and can be used once:\n\n${link}\n\nIf you did not ask for this, you can ignore this email. Your password stays the same.`,
      );
    } catch (error) {
      // Logged, not thrown: the caller's response must not depend on delivery.
      console.error('[auth] password reset email failed:', error);
    }
  }

  // Sets a new password from a valid reset token, then signs the user out everywhere.
  async confirmPasswordReset(rawToken: string, newPassword: string) {
    const row = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      select: { id: true, userId: true, expiresAt: true },
    });
    if (!row || row.expiresAt < new Date()) throw new BadRequestException('This reset link is invalid or has expired');

    // Claim the token atomically so two concurrent submissions cannot both succeed.
    const claimed = await this.prisma.passwordResetToken.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count === 0) throw new BadRequestException('This reset link is invalid or has expired');

    const passwordHash = await argon2.hash(newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: row.userId }, data: { passwordHash } }),
      this.prisma.session.deleteMany({ where: { userId: row.userId } }),
      this.prisma.passwordResetToken.deleteMany({ where: { userId: row.userId, usedAt: null } }),
    ]);
    return { ok: true };
  }

  // Revokes the session an access token was issued from, so the token stops working immediately.
  async revokeSession(sessionId: string) {
    await this.prisma.session.deleteMany({ where: { id: sessionId } });
  }

  /** Called by NextAuth after a Google (or other OAuth) sign-in.
   *  Creates the user on first visit; returns tokens like a normal login. */
  async oauthSignin(dto: { email: string; name: string; image?: string; provider: string }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let user = await (this.prisma as any).user.findUnique({
      where: { email: dto.email },
    }) as { id: string; email: string; username: string; displayName: string; role: string; deletedAt: Date | null; bannedAt: Date | null; bannedUntil: Date | null; isApproved: boolean } | null;

    if (!user) {
      // First Google sign-in — create account (auto-approved, no admin notification needed)
      const base = dto.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'user';
      const suffix = Math.random().toString(36).slice(2, 7);
      const username = `${base}${suffix}`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user = await (this.prisma as any).user.create({
        data: {
          email: dto.email,
          displayName: dto.name,
          username,
          isApproved: true,
          profile: { create: {} },
        },
        select: { id: true, email: true, username: true, displayName: true, role: true, deletedAt: true, bannedAt: true, bannedUntil: true, isApproved: true },
      }) as typeof user;
    } else {
      if (user.deletedAt) throw new UnauthorizedException('Account deleted');
      if (isBanned(user)) {
        const until = user.bannedUntil ? ` until ${user.bannedUntil.toISOString().slice(0, 10)}` : ' permanently';
        throw new ForbiddenException(`Account is suspended${until}`);
      }
      // Pending accounts must still be approved by an admin, whichever provider they sign in with.
      if (!user.isApproved) {
        throw new ForbiddenException('Your account is pending admin approval. You will be notified once approved.');
      }
    }

    const tokens = await this.generateTokens(user!.id);
    return {
      ...tokens,
      user: { id: user!.id, email: user!.email, username: user!.username, displayName: user!.displayName, role: user!.role },
    };
  }

  async googleOneTap(credential: string) {
    if (!credential) throw new BadRequestException('credential required');

    // Verify the Google-issued JWT via Google's tokeninfo endpoint (no extra package needed)
    let payload: { email?: string; email_verified?: string | boolean; name?: string; picture?: string; aud?: string };
    try {
      const res = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
        { cache: 'no-store' },
      );
      if (!res.ok) throw new UnauthorizedException('Invalid Google credential');
      payload = (await res.json()) as typeof payload;
    } catch {
      throw new UnauthorizedException('Failed to verify Google credential');
    }

    // The token must have been issued to this app. Fails closed when the client ID is not configured,
    // otherwise a Google token minted for any other site could be replayed here.
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) throw new UnauthorizedException('Google sign-in is not configured');
    if (payload.aud !== clientId) {
      throw new UnauthorizedException('Credential audience mismatch');
    }

    if (!payload.email) throw new UnauthorizedException('No email in credential');
    if (String(payload.email_verified) !== 'true') throw new UnauthorizedException('Google email is not verified');

    // Reuse the same OAuth sign-in flow
    return this.oauthSignin({
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      image: payload.picture,
      provider: 'google',
    });
  }

  async generateTokens(userId: string) {
    const refreshTokenRaw = randomBytes(32).toString('hex');
    const tokenHash = hashToken(refreshTokenRaw);

    const session = await this.prisma.session.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });

    const accessToken = this.jwtService.sign({ sub: userId, sid: session.id }, { expiresIn: ACCESS_TTL });
    return { accessToken, refreshToken: refreshTokenRaw, sessionId: session.id };
  }
}
