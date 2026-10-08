import { Module } from '@nestjs/common';
import { LanguageService } from '../shared/language.service';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';

@Module({
  providers: [CommentsService, LanguageService],
  controllers: [CommentsController],
})
export class CommentsModule {}
