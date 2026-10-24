import { Global, Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';

// Global so any module can use ThrottlerGuard-based decorators (@Throttle, UserThrottleGuard).
@Global()
@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])],
  exports: [ThrottlerModule],
})
export class SharedThrottleModule {}
