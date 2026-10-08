import { Module } from '@nestjs/common';
import { ReputationService } from './reputation.service';
import { BadgesService } from './badges.service';
import { ReputationController } from './reputation.controller';

@Module({
  providers: [ReputationService, BadgesService],
  controllers: [ReputationController],
  exports: [ReputationService, BadgesService],
})
export class ReputationModule {}
