import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ContentStatus, ModerationAction, Prisma, PrismaClient, ReportStatus, UserRole } from '@prisma/client';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import Redis from 'ioredis';
import { isBanned } from '../shared/ban';
import { STAFF_ROLES } from '../guards/admin.guard';

export interface Actor {
  id: string;
  role: UserRole | string;
}

const DAY = 86_400_000;

@Injectable()
export class AdminService {
  private prisma = new PrismaClient();
  private redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

  constructor(
    @InjectQueue('generate-embedding') private embeddingQueue: Queue,
    @InjectQueue('duplicate-detection') private duplicateQueue: Queue,
    @InjectQueue('answer-quality') private qualityQueue: Queue,
    @InjectQueue('compute-trending') private trendingQueue: Queue,
    @InjectQueue('build-feed') private feedQueue: Queue,
  ) {}

  // ---------- helpers ----------

  private async audit(actorId: string, action: string, targetType: string, targetId: string, metadata: Record<string, unknown> = {}) {
    await this.prisma.auditLog.create({
      data: { actorId, action, targetType, targetId, metadata: metadata as Prisma.InputJsonValue },
    });
  }

  private requireAdmin(actor: Actor) {
    if (actor.role !== 'ADMIN') throw new ForbiddenException('Only admins can do this');
  }

  private async loadUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, deletedAt: true, bannedAt: true, bannedUntil: true },
    });
    if (!user || user.deletedAt) throw new NotFoundException('User not found');
    return user;
  }

  // Moderators may act on regular users only; admins may act on anyone except themselves.
  private assertCanModerate(actor: Actor, target: { id: string; role: UserRole }) {
    if (actor.id === target.id) throw new BadRequestException('You cannot do this to your own account');
    if (actor.role !== 'ADMIN' && (STAFF_ROLES as readonly string[]).includes(target.role)) {
      throw new ForbiddenException('Only admins can act on staff accounts');
    }
  }

  private userStatus(u: { bannedAt: Date | null; bannedUntil: Date | null }) {
    if (!u.bannedAt) return 'ACTIVE';
    return isBanned(u) ? (u.bannedUntil ? 'TEMP_BAN' : 'PERMANENT_BAN') : 'ACTIVE';
  }

  private paging(page = 1, limit = 20) {
    return { skip: (page - 1) * limit, take: limit };
  }

  // ---------- dashboard ----------

  async getStats() {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const [totalUsers, usersToday, bannedUsers, totalPosts, postsToday, removedPosts, pendingReports, underReviewReports, resolvedReports, topCommunities] =
      await Promise.all([
        this.prisma.user.count({ where: { deletedAt: null } }),
        this.prisma.user.count({ where: { createdAt: { gte: today } } }),
        this.prisma.user.count({ where: { bannedAt: { not: null }, OR: [{ bannedUntil: null }, { bannedUntil: { gt: new Date() } }] } }),
        this.prisma.post.count({ where: { status: 'PUBLISHED', deletedAt: null } }),
        this.prisma.post.count({ where: { createdAt: { gte: today }, status: 'PUBLISHED' } }),
        this.prisma.post.count({ where: { status: 'REMOVED' } }),
        this.prisma.report.count({ where: { status: 'PENDING' } }),
        this.prisma.report.count({ where: { status: 'UNDER_REVIEW' } }),
        this.prisma.report.count({ where: { status: 'RESOLVED' } }),
        this.prisma.community.findMany({
          where: { deletedAt: null },
          select: { slug: true, name: true, memberCount: true, postCount: true },
          orderBy: { postCount: 'desc' },
          take: 5,
        }),
      ]);

    return {
      users: { total: totalUsers, today: usersToday, banned: bannedUsers },
      posts: { total: totalPosts, today: postsToday, removed: removedPosts },
      reports: { pending: pendingReports, underReview: underReviewReports, resolved: resolvedReports },
      topCommunities,
    };
  }

  // Daily counts for the last N days (UTC). Used by the dashboard and analytics charts.
  async getTimeseries(days = 30) {
    const n = Math.min(Math.max(days, 7), 90);
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - (n - 1));

    const [users, posts, answers, sessions] = await Promise.all([
      this.prisma.user.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } }),
      this.prisma.post.findMany({ where: { createdAt: { gte: start }, status: { not: 'DELETED' } }, select: { createdAt: true } }),
      this.prisma.answer.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } }),
      this.prisma.session.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } }),
    ]);

    type Point = { date: string; users: number; posts: number; answers: number; logins: number };
    const buckets = new Map<string, Point>();
    for (let i = 0; i < n; i++) {
      const d = new Date(start.getTime() + i * DAY);
      const key = d.toISOString().slice(0, 10);
      buckets.set(key, { date: key, users: 0, posts: 0, answers: 0, logins: 0 });
    }
    const tally = (rows: { createdAt: Date }[], field: Exclude<keyof Point, 'date'>) => {
      for (const r of rows) {
        const b = buckets.get(r.createdAt.toISOString().slice(0, 10));
        if (b) b[field]++;
      }
    };
    tally(users, 'users');
    tally(posts, 'posts');
    tally(answers, 'answers');
    tally(sessions, 'logins');

    return { days: [...buckets.values()] };
  }

  // ---------- users ----------

  async getUsers(opts: { q?: string; role?: UserRole; page?: number; limit?: number }) {
    const where: Prisma.UserWhereInput = { deletedAt: null };
    const q = opts.q?.trim();
    if (q) {
      where.OR = [
        { username: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { displayName: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (opts.role) where.role = opts.role;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: {
          id: true, username: true, displayName: true, email: true, role: true,
          bannedAt: true, bannedUntil: true, reputationScore: true, createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        ...this.paging(opts.page, opts.limit),
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: rows.map(({ bannedAt, bannedUntil, ...u }) => ({ ...u, status: this.userStatus({ bannedAt, bannedUntil }), bannedUntil })),
      total,
      page: opts.page ?? 1,
      limit: opts.limit ?? 20,
    };
  }

  async getUserDetail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, username: true, displayName: true, email: true, role: true, isVerified: true,
        reputationScore: true, bannedAt: true, bannedUntil: true, createdAt: true, deletedAt: true,
        _count: { select: { posts: true, answers: true, comments: true, reports: true } },
      },
    });
    if (!user || user.deletedAt) throw new NotFoundException('User not found');

    const history = await this.prisma.auditLog.findMany({
      where: { targetType: 'USER', targetId: id },
      select: { id: true, action: true, metadata: true, createdAt: true, actor: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const { bannedAt, bannedUntil, deletedAt: _d, ...rest } = user;
    return { ...rest, bannedUntil, status: this.userStatus({ bannedAt, bannedUntil }), history };
  }

  async banUser(actor: Actor, userId: string, days: number) {
    const target = await this.loadUser(userId);
    this.assertCanModerate(actor, target);
    const bannedUntil = days > 0 ? new Date(Date.now() + days * DAY) : null;
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { bannedAt: new Date(), bannedUntil },
      select: { id: true, bannedAt: true, bannedUntil: true },
    });
    await this.audit(actor.id, 'USER_BAN', 'USER', userId, { days });
    return updated;
  }

  async unbanUser(actor: Actor, userId: string) {
    const target = await this.loadUser(userId);
    this.assertCanModerate(actor, target);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { bannedAt: null, bannedUntil: null },
      select: { id: true, bannedAt: true },
    });
    await this.audit(actor.id, 'USER_UNBAN', 'USER', userId);
    return updated;
  }

  async changeUserRole(actor: Actor, userId: string, role: UserRole) {
    this.requireAdmin(actor);
    if (actor.id === userId) throw new BadRequestException('You cannot change your own role');
    const target = await this.loadUser(userId);
    const previous = target.role;
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, role: true },
    });
    await this.audit(actor.id, 'USER_ROLE_CHANGE', 'USER', userId, { from: previous, to: role });
    return updated;
  }

  // ---------- content ----------

  async getContent(opts: { filter?: 'all' | 'flagged'; status?: ContentStatus; q?: string; page?: number; limit?: number }) {
    const where: Prisma.PostWhereInput = { deletedAt: null };
    if (opts.status) where.status = opts.status;
    if (opts.filter === 'flagged') where.reports = { some: { status: 'PENDING' } };
    const q = opts.q?.trim();
    if (q) where.title = { contains: q, mode: 'insensitive' };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where,
        select: {
          id: true, title: true, language: true, voteScore: true, answerCount: true, status: true, createdAt: true,
          author: { select: { username: true } },
          community: { select: { name: true } },
          _count: { select: { reports: { where: { status: 'PENDING' } } } },
        },
        orderBy: { createdAt: 'desc' },
        ...this.paging(opts.page, opts.limit),
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      data: rows.map(({ _count, ...p }) => ({ ...p, pendingReports: _count.reports })),
      total,
      page: opts.page ?? 1,
      limit: opts.limit ?? 20,
    };
  }

  async setPostStatus(actor: Actor, postId: string, status: 'REMOVED' | 'PUBLISHED') {
    const post = await this.prisma.post.findFirst({ where: { id: postId, deletedAt: null }, select: { id: true, status: true } });
    if (!post) throw new NotFoundException('Post not found');
    const updated = await this.prisma.post.update({ where: { id: postId }, data: { status }, select: { id: true, status: true } });
    await this.audit(actor.id, status === 'REMOVED' ? 'CONTENT_REMOVE' : 'CONTENT_RESTORE', 'POST', postId, { from: post.status });
    return updated;
  }

  // ---------- reports & moderation ----------

  async getReports(opts: { status?: string; page?: number; limit?: number }) {
    const where: Prisma.ReportWhereInput = {};
    if (opts.status && opts.status !== 'ALL') where.status = opts.status as ReportStatus;
    else if (!opts.status) where.status = 'PENDING';

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.report.findMany({
        where,
        select: {
          id: true, targetType: true, targetId: true, reason: true, details: true, status: true, createdAt: true,
          reporter: { select: { username: true } },
        },
        orderBy: { createdAt: 'desc' },
        ...this.paging(opts.page, opts.limit),
      }),
      this.prisma.report.count({ where }),
    ]);

    const postIds = rows.filter((r) => r.targetType === 'POST').map((r) => r.targetId);
    const answerIds = rows.filter((r) => r.targetType === 'ANSWER').map((r) => r.targetId);
    const [posts, answers] = await Promise.all([
      postIds.length
        ? this.prisma.post.findMany({ where: { id: { in: postIds } }, select: { id: true, title: true, body: true, status: true } })
        : Promise.resolve([]),
      answerIds.length
        ? this.prisma.answer.findMany({ where: { id: { in: answerIds } }, select: { id: true, body: true, status: true } })
        : Promise.resolve([]),
    ]);
    const postMap = new Map(posts.map((p) => [p.id, p]));
    const answerMap = new Map(answers.map((a) => [a.id, a]));

    const data = rows.map((r) => {
      const snippet = (s?: string) => (s ? s.slice(0, 240) : undefined);
      let target: { title?: string; snippet?: string; status?: string } | null = null;
      if (r.targetType === 'POST') {
        const p = postMap.get(r.targetId);
        target = p ? { title: p.title, snippet: snippet(p.body), status: p.status } : null;
      } else if (r.targetType === 'ANSWER') {
        const a = answerMap.get(r.targetId);
        target = a ? { snippet: snippet(a.body), status: a.status } : null;
      }
      return { ...r, target };
    });

    return { data, total, page: opts.page ?? 1, limit: opts.limit ?? 20 };
  }

  async resolveReport(actor: Actor, reportId: string, action: 'DISMISS' | 'REMOVE' | 'WARN') {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Report not found');
    if (report.status === 'RESOLVED') throw new BadRequestException('Report is already resolved');

    await this.prisma.$transaction(async (tx) => {
      if (action === 'REMOVE') {
        if (report.targetType === 'POST') {
          await tx.post.update({ where: { id: report.targetId }, data: { status: 'REMOVED' } });
        } else if (report.targetType === 'ANSWER') {
          await tx.answer.update({ where: { id: report.targetId }, data: { status: 'REMOVED' } });
        }
      }
      await tx.moderationLog.create({
        data: {
          moderatorId: actor.id,
          reportId,
          action: action as ModerationAction,
          notes: `${action} by ${actor.role}`,
        },
      });
      await tx.report.update({ where: { id: reportId }, data: { status: 'RESOLVED' } });
    });

    await this.audit(actor.id, `REPORT_${action}`, 'REPORT', reportId, {
      targetType: report.targetType,
      targetId: report.targetId,
    });
    return { id: reportId, status: 'RESOLVED' as const };
  }

  // ---------- communities ----------

  async getCommunities(opts: { page?: number; limit?: number }) {
    const where: Prisma.CommunityWhereInput = { deletedAt: null };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.community.findMany({
        where,
        select: {
          id: true, name: true, slug: true, isPublic: true, memberCount: true, postCount: true, createdAt: true,
        },
        orderBy: { memberCount: 'desc' },
        ...this.paging(opts.page, opts.limit),
      }),
      this.prisma.community.count({ where }),
    ]);
    return { data: rows, total, page: opts.page ?? 1, limit: opts.limit ?? 20 };
  }

  // ---------- audit log ----------

  async getAuditLog(opts: { action?: string; page?: number; limit?: number }) {
    const where: Prisma.AuditLogWhereInput = opts.action ? { action: opts.action } : {};
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        select: {
          id: true, action: true, targetType: true, targetId: true, metadata: true, createdAt: true,
          actor: { select: { username: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        ...this.paging(opts.page, opts.limit),
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { data: rows, total, page: opts.page ?? 1, limit: opts.limit ?? 20 };
  }

  // ---------- system ----------

  async getQueueStats() {
    return {
      'generate-embedding': await this.embeddingQueue.getJobCounts(),
      'duplicate-detection': await this.duplicateQueue.getJobCounts(),
      'answer-quality': await this.qualityQueue.getJobCounts(),
      'compute-trending': await this.trendingQueue.getJobCounts(),
      'build-feed': await this.feedQueue.getJobCounts(),
    };
  }

  async getFeatureFlags(): Promise<Record<string, boolean>> {
    const flags = await this.redis.hgetall('feature_flags');
    const result: Record<string, boolean> = {};
    Object.entries(flags).forEach(([key, val]) => {
      result[key] = val === 'true';
    });
    return result;
  }

  async setFeatureFlag(actor: Actor, key: string, enabled: boolean): Promise<void> {
    this.requireAdmin(actor);
    const previous = (await this.redis.hget('feature_flags', key)) ?? null;
    await this.redis.hset('feature_flags', key, enabled ? 'true' : 'false');
    await this.audit(actor.id, 'FLAG_SET', 'FLAG', key, { from: previous, to: enabled });
  }

  async getAnalytics() {
    const now = Date.now();
    const d1 = new Date(now - DAY);
    const d7 = new Date(now - 7 * DAY);
    const d30 = new Date(now - 30 * DAY);

    const [sessions1d, sessions30d, answers7d, posts7d, totalUsers, topCommunities, languageBreakdown] = await Promise.all([
      this.prisma.session.count({ where: { createdAt: { gte: d1 } } }),
      this.prisma.session.count({ where: { createdAt: { gte: d30 } } }),
      this.prisma.answer.count({ where: { createdAt: { gte: d7 } } }),
      this.prisma.post.count({ where: { createdAt: { gte: d7 } } }),
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.community.findMany({
        where: { deletedAt: null },
        select: { name: true, memberCount: true, postCount: true },
        orderBy: { memberCount: 'desc' },
        take: 6,
      }),
      this.prisma.post.groupBy({ by: ['language'], _count: { id: true } }),
    ]);

    return {
      sessions1d,
      sessions30d,
      answers7d,
      posts7d,
      totalUsers,
      answerRate: posts7d > 0 ? Number((answers7d / posts7d).toFixed(2)) : 0,
      topCommunities,
      languageBreakdown: languageBreakdown.map((item) => ({ name: item.language, count: item._count.id })),
    };
  }
}
