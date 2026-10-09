import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DuplicateModule } from './duplicate/duplicate.module';
import { EmbeddingModule } from './embedding/embedding.module';
import { QualityModule } from './quality/quality.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    DuplicateModule,
    EmbeddingModule,
    QualityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
