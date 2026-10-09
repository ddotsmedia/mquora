import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private prisma = new PrismaClient();

  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'local_jwt_secret_dev_only',
    });
  }

  async validate(payload: Record<string, unknown>) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub as string },
      select: { id: true, email: true, username: true, role: true, deletedAt: true },
    });
    if (!user || user.deletedAt) return null;
    return user;
  }
}
