import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { EmbeddingProcessor } from './embedding.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'generate-embedding' })],
  providers: [EmbeddingProcessor],
})
export class EmbeddingModule {}
