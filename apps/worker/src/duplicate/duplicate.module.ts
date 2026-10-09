import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { DuplicateService } from './duplicate.service';
import { DuplicateProcessor } from './duplicate.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'duplicate-detection' })],
  providers: [DuplicateService, DuplicateProcessor],
  exports: [DuplicateService],
})
export class DuplicateModule {}
