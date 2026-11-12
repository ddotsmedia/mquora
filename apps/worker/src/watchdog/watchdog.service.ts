import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { PrismaClient } from '@prisma/client';
import { Queue } from 'bull';

// Runs inside the worker, so it keeps working when the API process is hung.
// Writes ALERT notifications that appear in the admin notifications page.
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const HEALTH_EVERY_MS = MINUTE;
const QUEUES_EVERY_MS = 10 * MINUTE;
const DOWN_AFTER_FAILURES = 3; // about 3 minutes of failed checks
const FAILED_JOBS_LIMIT = 10; // failures in the last hour that trigger an alert

async function probe(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

@Injectable()
export class WatchdogService implements OnModuleInit, OnModuleDestroy {
  private prisma = new PrismaClient();
  private timers: NodeJS.Timeout[] = [];
  private consecutiveFailures = 0;
  private isDown = false;

  constructor(
    @InjectQueue('generate-embedding') private embeddingQueue: Queue,
    @InjectQueue('duplicate-detection') private duplicateQueue: Queue,
    @InjectQueue('answer-quality') private qualityQueue: Queue,
    @InjectQueue('compute-trending') private trendingQueue: Queue,
    @InjectQueue('build-feed') private feedQueue: Queue,
  ) {}

  onModuleInit() {
    this.timers.push(setInterval(() => void this.checkApi(), HEALTH_EVERY_MS));
    this.timers.push(setInterval(() => void this.checkQueues(), QUEUES_EVERY_MS));
    this.timers.forEach((t) => t.unref?.());
  }

  onModuleDestroy() {
    this.timers.forEach((t) => clearInterval(t));
  }

  private async raise(title: string, body: string, link: string, windowMs: number) {
    const recent = await this.prisma.adminNotification.findFirst({
      where: { type: 'ALERT', title, createdAt: { gte: new Date(Date.now() - windowMs) } },
      select: { id: true },
    });
    if (recent) return;
    await this.prisma.adminNotification.create({ data: { type: 'ALERT', title, body, link } });
  }

  async checkApi() {
    const base = process.env.API_INTERNAL_URL || 'http://api:3100';
    const ok = await probe(`${base}/health`);

    if (ok) {
      this.consecutiveFailures = 0;
      if (this.isDown) {
        this.isDown = false;
        await this.raise('API recovered', 'The API health check is passing again.', '/admin/system', 30 * MINUTE);
      }
      return;
    }

    this.consecutiveFailures += 1;
    if (!this.isDown && this.consecutiveFailures >= DOWN_AFTER_FAILURES) {
      this.isDown = true;
      await this.raise(
        'API is down',
        `The API health check has failed ${this.consecutiveFailures} times in a row.`,
        '/admin/system',
        30 * MINUTE,
      );
    }
  }

  async checkQueues() {
    const since = Date.now() - HOUR;
    const queues: Array<[string, Queue]> = [
      ['Embedding', this.embeddingQueue],
      ['Duplicate detection', this.duplicateQueue],
      ['Answer quality', this.qualityQueue],
      ['Trending', this.trendingQueue],
      ['Feed', this.feedQueue],
    ];

    for (const [label, queue] of queues) {
      const failed = await queue.getFailed(0, 199);
      const recent = failed.filter((job) => (job.finishedOn ?? 0) >= since).length;
      if (recent >= FAILED_JOBS_LIMIT) {
        await this.raise(
          `${label} jobs failing`,
          `${recent} ${label.toLowerCase()} jobs failed in the last hour. Check the background queues.`,
          '/admin/ai',
          3 * HOUR,
        );
      }
    }
  }
}
