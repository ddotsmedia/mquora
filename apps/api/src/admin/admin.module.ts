import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

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
  providers: [AdminService],
  controllers: [AdminController],
  exports: [AdminService],
})
export class AdminModule {}
