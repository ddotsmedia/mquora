import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { DigestController } from './digest.controller';
import { DigestService } from './digest.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'digest' })],
  controllers: [DigestController],
  providers: [DigestService],
})
export class DigestModule {}
