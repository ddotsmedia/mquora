import { Injectable, BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { isBanned } from '../shared/ban';

// Refresh tokens are 256-bit random values; a fast deterministic hash is enough to look them up.
const hashToken = (raw: string) => createHash('sha256').update(raw).digest('hex');

@Injectable()
export class AuthService {
  private prisma = new PrismaClient();

  constructor(private jwtService: JwtService) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });
    if (existing) throw new BadRequestException('Email or username already exists');

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        displayName: dto.displayName,
        username: dto.username,
        passwordHash,
        profile: { create: {} },
      },
      select: { id: true, email: true, username: true, role: true },
    });

    const tokens = await this.generateTokens(user.id);
    return { ...tokens, user };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');
    if (user.deletedAt) throw new UnauthorizedException('Account deleted');

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    if (isBanned(user)) {
      const until = user.bannedUntil ? ` until ${user.bannedUntil.toISOString().slice(0, 10)}` : ' permanently';
      throw new ForbiddenException(`Account is suspended${until}`);
    }

    const tokens = await this.generateTokens(user.id);
    return {
      ...tokens,
      user: { id: user.id, email: user.email, username: user.username, role: user.role },
    };
  }

  // Issues a new access token for a valid refresh token. The refresh token is not rotated, so
  // concurrent server renders that refresh at the same time all succeed.
  async refresh(rawToken: string) {
    const session = await this.prisma.session.findUnique({ where: { tokenHash: hashToken(rawToken) } });
    if (!session || new Date() > session.expiresAt) throw new UnauthorizedException('Invalid refresh token');
    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      select: { deletedAt: true, bannedAt: true, bannedUntil: true },
    });
    if (!user || user.deletedAt || isBanned(user)) throw new UnauthorizedException('Session no longer valid');
    return { accessToken: this.jwtService.sign({ sub: session.userId }, { expiresIn: '15m' }) };
  }

  async logout(rawToken: string) {
    await this.prisma.session.deleteMany({ where: { tokenHash: hashToken(rawToken) } });
  }

  async generateTokens(userId: string) {
    const accessToken = this.jwtService.sign({ sub: userId }, { expiresIn: '15m' });
    const refreshTokenRaw = randomBytes(32).toString('hex');
    const tokenHash = hashToken(refreshTokenRaw);

    const session = await this.prisma.session.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken: refreshTokenRaw, sessionId: session.id };
  }
}
