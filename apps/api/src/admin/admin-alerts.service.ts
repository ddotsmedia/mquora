import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { mailConfigured, sendMail } from '../shared/mailer';

// Admin alerts and the daily digest. Checks run in-process every 10 minutes; each alert is
// stored as an AdminNotification and deduplicated by title within a time window.
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const CHECK_EVERY_MS = 10 * 60 * 1000;
const DIGEST_HOUR_UTC = 4; // 08:00 Dubai

const PENDING_REPORTS_LIMIT = 10;
const UNANSWERED_LIMIT = 20;
const SPIKE_MULTIPLIER = 3;
const SPIKE_MIN_SIGNUPS = 10;
const SPIKE_MIN_REPORTS = 5;

@Injectable()
export class AdminAlertsService implements OnModuleInit, OnModuleDestroy {
  private prisma = new PrismaClient();
  private timer?: NodeJS.Timeout;
  private running = false;

  onModuleInit() {
    this.timer = setInterval(() => {
      if (this.running) return;
      this.running = true;
      this.runChecks()
        .catch((err) => console.error('[admin-alerts] check failed', err))
        .finally(() => { this.running = false; });
    }, CHECK_EVERY_MS);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async runChecks() {
    await this.checkThresholds();
    await this.checkSpikes();
    await this.sendDailyDigest();
  }

  // Creates the notification unless one with the same type and title was raised within windowMs.
  private async raise(
    type: 'ALERT' | 'DIGEST',
    title: string,
    body: string,
    link: string | null,
    windowMs: number,
  ): Promise<boolean> {
    const recent = await this.prisma.adminNotification.findFirst({
      where: { type, title, createdAt: { gte: new Date(Date.now() - windowMs) } },
      select: { id: true },
    });
    if (recent) return false;
    await this.prisma.adminNotification.create({ data: { type, title, body, link } });
    return true;
  }

  private async checkThresholds() {
    const pendingReports = await this.prisma.report.count({ where: { status: 'PENDING' } });
    if (pendingReports >= PENDING_REPORTS_LIMIT) {
      await this.raise(
        'ALERT',
        'Reports waiting for review',
        `${pendingReports} reports are still pending review.`,
        '/admin/moderation',
        6 * HOUR,
      );
    }

    // Questions from the last 30 days that are more than 48 hours old and still have no answer.
    const unanswered = await this.prisma.post.count({
      where: {
        status: 'PUBLISHED',
        deletedAt: null,
        answerCount: 0,
        createdAt: { gte: new Date(Date.now() - 30 * DAY), lte: new Date(Date.now() - 2 * DAY) },
      },
    });
    if (unanswered >= UNANSWERED_LIMIT) {
      await this.raise(
        'ALERT',
        'Questions without answers',
        `${unanswered} questions from the last 30 days are older than 48 hours with no answer.`,
        '/admin/content',
        24 * HOUR,
      );
    }
  }

  // Compares the last hour with the average hourly rate over the rest of the last day.
  private async checkSpikes() {
    const now = Date.now();
    const hourAgo = new Date(now - HOUR);
    const dayAgo = new Date(now - DAY);
    const [signupsHour, signupsDay, reportsHour, reportsDay] = await Promise.all([
      this.prisma.user.count({ where: { createdAt: { gte: hourAgo } } }),
      this.prisma.user.count({ where: { createdAt: { gte: dayAgo } } }),
      this.prisma.report.count({ where: { createdAt: { gte: hourAgo } } }),
      this.prisma.report.count({ where: { createdAt: { gte: dayAgo } } }),
    ]);
    const signupBaseline = (signupsDay - signupsHour) / 23;
    const reportBaseline = (reportsDay - reportsHour) / 23;

    if (signupsHour >= SPIKE_MIN_SIGNUPS && signupsHour >= SPIKE_MULTIPLIER * signupBaseline) {
      await this.raise(
        'ALERT',
        'Signup spike',
        `${signupsHour} new users in the last hour. The usual rate is about ${signupBaseline.toFixed(1)} per hour.`,
        '/admin/analytics',
        3 * HOUR,
      );
    }
    if (reportsHour >= SPIKE_MIN_REPORTS && reportsHour >= SPIKE_MULTIPLIER * reportBaseline) {
      await this.raise(
        'ALERT',
        'Report spike',
        `${reportsHour} reports in the last hour. The usual rate is about ${reportBaseline.toFixed(1)} per hour.`,
        '/admin/moderation',
        3 * HOUR,
      );
    }
  }

  // Once a day, store a summary and email it to admins when SMTP is configured.
  private async sendDailyDigest() {
    const now = new Date();
    if (now.getUTCHours() !== DIGEST_HOUR_UTC) return;

    const dateKey = now.toISOString().slice(0, 10);
    const title = `Daily digest — ${dateKey}`;
    const dayAgo = new Date(now.getTime() - DAY);
    const [users, questions, reports, pendingReports] = await Promise.all([
      this.prisma.user.count({ where: { createdAt: { gte: dayAgo } } }),
      this.prisma.post.count({ where: { createdAt: { gte: dayAgo }, status: 'PUBLISHED', deletedAt: null } }),
      this.prisma.report.count({ where: { createdAt: { gte: dayAgo } } }),
      this.prisma.report.count({ where: { status: 'PENDING' } }),
    ]);
    const body = `Last 24 hours: ${users} new users, ${questions} new questions, ${reports} reports. ${pendingReports} reports pending.`;

    const created = await this.raise('DIGEST', title, body, '/admin/analytics', 20 * HOUR);
    if (!created || !mailConfigured()) return;

    const admins = await this.prisma.user.findMany({ where: { role: 'ADMIN' }, select: { email: true } });
    for (const admin of admins) {
      await sendMail(admin.email, title, `${body}\n\nOpen the admin dashboard to review.`).catch((err) =>
        console.error('[admin-alerts] digest email failed', err),
      );
    }
  }
}
