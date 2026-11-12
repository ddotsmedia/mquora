import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { WatchdogService } from './watchdog.service';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'generate-embedding' },
      { name: 'duplicate-detection' },
      { name: 'answer-quality' },
      { name: 'compute-trending' },
      { name: 'build-feed' },
    ),
  ],
  providers: [WatchdogService],
})
export class WatchdogModule {}
