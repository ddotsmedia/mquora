import { Module } from '@nestjs/common';
import { TagsController, TrendingController } from './trending.controller';
import { TrendingService } from './trending.service';

@Module({ controllers: [TrendingController, TagsController], providers: [TrendingService] })
export class TrendingModule {}
