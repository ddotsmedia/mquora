import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { SharedThrottleModule } from './shared/throttle.module';
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
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { ReputationModule } from './reputation/reputation.module';
import { ModerationModule } from './moderation/moderation.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminModule } from './admin/admin.module';
import { SearchModule } from './search/search.module';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';
import { TrendingModule } from './trending/trending.module';
import { UsersModule } from './users/users.module';
import { SocialModule } from './social/social.module';
import { DigestModule } from './digest/digest.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    SharedThrottleModule,
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
    SubscriptionsModule,
    ReputationModule,
    ModerationModule,
    NotificationsModule,
    AdminModule,
    SearchModule,
    HealthModule,
    MetricsModule,
    TrendingModule,
    UsersModule,
    SocialModule,
    DigestModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(cookieParser()).forRoutes('*');
  }
}
