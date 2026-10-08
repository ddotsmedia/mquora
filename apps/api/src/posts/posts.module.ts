import { Module } from '@nestjs/common';
import { LanguageService } from '../shared/language.service';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';

@Module({
  providers: [PostsService, LanguageService],
  controllers: [PostsController],
  exports: [PostsService],
})
export class PostsModule {}
