import { BadRequestException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

const MAX_SAVED = 10;
const CHECK_EVERY_MS = 15 * 60_000;

@Injectable()
export class SavedSearchesService implements OnModuleInit, OnModuleDestroy {
  private prisma = new PrismaClient();
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private notifications: NotificationsService) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      if (this.running) return;
      this.running = true;
      this.notifyNewMatches()
        .catch((err) => console.error('Saved search alerts failed', err))
        .finally(() => { this.running = false; });
    }, CHECK_EVERY_MS);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async list(userId: string) {
    const data = await this.prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, query: true, createdAt: true },
    });
    return { data };
  }

  async create(userId: string, raw: string) {
    const query = (raw ?? '').trim().replace(/\s+/g, ' ');
    if (query.length < 2 || query.length > 100) throw new BadRequestException('Search must be 2 to 100 characters');
    const existing = await this.prisma.savedSearch.findUnique({ where: { userId_query: { userId, query } }, select: { id: true, query: true } });
    if (existing) return existing;
    const count = await this.prisma.savedSearch.count({ where: { userId } });
    if (count >= MAX_SAVED) throw new BadRequestException(`You can save up to ${MAX_SAVED} searches`);
    return this.prisma.savedSearch.create({ data: { userId, query }, select: { id: true, query: true, createdAt: true } });
  }

  async remove(userId: string, id: string) {
    const res = await this.prisma.savedSearch.deleteMany({ where: { id, userId } });
    if (res.count === 0) throw new NotFoundException('Saved search not found');
    return { deleted: true };
  }

  // For each saved search, look at posts published since its last check. One alert per search per run.
  async notifyNewMatches() {
    const runAt = new Date();
    const due = await this.prisma.savedSearch.findMany({
      where: { lastCheckedAt: { lt: runAt } },
      select: { id: true, userId: true, query: true, lastCheckedAt: true },
      take: 500,
    });
    for (const s of due) {
      const where = {
        status: 'PUBLISHED' as const,
        deletedAt: null,
        createdAt: { gt: s.lastCheckedAt },
        OR: [
          { title: { contains: s.query, mode: 'insensitive' as const } },
          { body: { contains: s.query, mode: 'insensitive' as const } },
        ],
      };
      const count = await this.prisma.post.count({ where });
      if (count > 0) {
        const top = await this.prisma.post.findFirst({ where, orderBy: { createdAt: 'desc' }, select: { title: true, seoSlug: true } });
        const link = count === 1 && top ? `/q/${top.seoSlug}` : `/search?q=${encodeURIComponent(s.query)}`;
        await this.notifications.create(
          s.userId,
          'SEARCH',
          `${count} new ${count === 1 ? 'match' : 'matches'} for "${s.query}"`,
          top?.title ?? 'Open the search to see them',
          link,
        );
      }
      await this.prisma.savedSearch.update({ where: { id: s.id }, data: { lastCheckedAt: runAt } });
    }
  }
}
