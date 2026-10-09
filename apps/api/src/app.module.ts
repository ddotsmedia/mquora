import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule } from '@nestjs/throttler';
import cookieParser from 'cookie-parser';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CommunitiesModule } from './communities/communities.module';
import { PostsModule } from './posts/posts.module';
import { AnswersModule } from './answers/answers.module';
import { CommentsModule } from './comments/comments.module';
import { VotesModule } from './votes/votes.module';
import { BookmarksModule } from './bookmarks/bookmarks.module';
import { FollowsModule } from './follows/follows.module';
import { ReputationModule } from './reputation/reputation.module';
import { ModerationModule } from './moderation/moderation.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminModule } from './admin/admin.module';
import { SearchModule } from './search/search.module';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    BullModule.registerQueue(
      { name: 'generate-embedding' },
      { name: 'duplicate-detection' },
      { name: 'answer-quality' },
    ),
    AuthModule,
    CommunitiesModule,
    PostsModule,
    AnswersModule,
    CommentsModule,
    VotesModule,
    BookmarksModule,
    FollowsModule,
    ReputationModule,
    ModerationModule,
    NotificationsModule,
    AdminModule,
    SearchModule,
    HealthModule,
    MetricsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(cookieParser()).forRoutes('*');
  }
}
