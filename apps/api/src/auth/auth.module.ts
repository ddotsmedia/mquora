import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { EmailThrottleGuard } from '../guards/email-throttle.guard';
import { getJwtSecret } from '../shared/jwt-secret';

@Module({
  imports: [
    JwtModule.register({
      secret: getJwtSecret(),
      signOptions: { expiresIn: '15m' },
    }),
    PassportModule,
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 900000, limit: 10 }] }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, EmailThrottleGuard],
  exports: [AuthService],
})
export class AuthModule {}
