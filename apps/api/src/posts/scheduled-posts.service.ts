import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PostsService } from './posts.service';

@Injectable()
export class ScheduledPostsService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private postsService: PostsService) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      if (this.running) return;
      this.running = true;
      this.postsService
        .publishDueScheduled()
        .catch((err) => console.error('Scheduled publish failed', err))
        .finally(() => { this.running = false; });
    }, 60_000);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
