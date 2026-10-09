import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { LanguageService } from '../shared/language.service';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';

@Module({
  imports: [BullModule.registerQueue({ name: 'generate-embedding' }, { name: 'duplicate-detection' })],
  providers: [PostsService, LanguageService],
  controllers: [PostsController],
  exports: [PostsService],
})
export class PostsModule {}
