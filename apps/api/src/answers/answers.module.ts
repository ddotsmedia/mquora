import { Module } from '@nestjs/common';
import { LanguageService } from '../shared/language.service';
import { AnswersService } from './answers.service';
import { AnswersController } from './answers.controller';

@Module({
  providers: [AnswersService, LanguageService],
  controllers: [AnswersController],
})
export class AnswersModule {}
