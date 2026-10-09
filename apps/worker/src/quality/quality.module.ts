import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QualityProcessor } from './quality.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'answer-quality' })],
  providers: [QualityProcessor],
})
export class QualityModule {}
