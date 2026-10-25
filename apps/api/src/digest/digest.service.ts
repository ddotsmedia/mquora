import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Queue } from 'bull';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { mailConfigured, sendMail } from '../shared/mailer';
import { getJwtSecret } from '../shared/jwt-secret';

const SITE = process.env.PUBLIC_SITE_URL || 'https://askvyo.com';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Signed unsubscribe token so the link cannot be forged for another user.
export function digestToken(userId: string): string {
  return createHmac('sha256', getJwtSecret()).update(`digest:${userId}`).digest('hex');
}

export function verifyDigestToken(userId: string, token: string): boolean {
  const expected = Buffer.from(digestToken(userId));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

@Processor('digest')
@Injectable()
export class DigestService implements OnModuleInit {
  private prisma = new PrismaClient();

  constructor(@InjectQueue('digest') private queue: Queue) {}

  // Runs every Sunday 04:00 UTC (08:00 Dubai). jobId keeps a single repeating schedule.
  async onModuleInit() {
    await this.queue.add('weekly', {}, { repeat: { cron: '0 4 * * 0' }, jobId: 'weekly-digest', removeOnComplete: true });
  }

  preference(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId }, select: { digestOptIn: true } }).then((u) => ({ optIn: u?.digestOptIn ?? false }));
  }

  async setPreference(userId: string, optIn: boolean) {
    await this.prisma.user.update({ where: { id: userId }, data: { digestOptIn: optIn } });
    return { optIn };
  }

  async unsubscribe(userId: string, token: string): Promise<boolean> {
    if (!verifyDigestToken(userId, token)) return false;
    await this.prisma.user.updateMany({ where: { id: userId }, data: { digestOptIn: false } });
    return true;
  }

  @Process('weekly')
  async sendWeekly() {
    if (!mailConfigured()) {
      console.log('[digest] SMTP not configured; skipping weekly digest');
      return;
    }

    const since = new Date(Date.now() - WEEK_MS);
    const top = await this.prisma.post.findMany({
      where: { status: 'PUBLISHED', deletedAt: null, createdAt: { gte: since } },
      orderBy: [{ voteScore: 'desc' }, { answerCount: 'desc' }],
      take: 5,
      select: { title: true, seoSlug: true },
    });
    if (top.length === 0) return;

    const recipients = await this.prisma.user.findMany({
      where: { digestOptIn: true, deletedAt: null, bannedAt: null, isApproved: true },
      select: { id: true, email: true, displayName: true },
    });

    const list = top.map((p) => `- ${p.title}\n  ${SITE}/q/${p.seoSlug}`).join('\n\n');
    for (const u of recipients) {
      const unsubscribe = `${SITE}/api/v1/digest/unsubscribe?u=${u.id}&t=${digestToken(u.id)}`;
      const body = `Hi ${u.displayName},\n\nTop questions on askvyo this week:\n\n${list}\n\n---\nTo stop these emails: ${unsubscribe}`;
      await sendMail(u.email, 'askvyo: top questions this week', body).catch((e) => console.error('[digest] send failed', e));
    }
  }
}
