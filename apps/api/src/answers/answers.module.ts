import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { LanguageService } from '../shared/language.service';
import { AnswersService } from './answers.service';
import { AnswersController } from './answers.controller';

@Module({
  imports: [BullModule.registerQueue({ name: 'generate-embedding' }, { name: 'answer-quality' })],
  providers: [AnswersService, LanguageService],
  controllers: [AnswersController],
})
export class AnswersModule {}
