import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ContentStatus, ModerationAction, Prisma, PrismaClient, ReportStatus, UserRole } from '@prisma/client';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import Redis from 'ioredis';
import { isBanned } from '../shared/ban';
const STAFF_ROLES = ['ADMIN', 'COMMUNITY_MODERATOR'] as const;

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

  async getUsers(opts: { q?: string; role?: UserRole; page?: number; limit?: number; pending?: boolean }) {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (opts.pending) (where as any).isApproved = false;

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

  // Verified expert badge (plan: expert verification).
  async setVerified(actor: Actor, userId: string, verified: boolean) {
    this.requireAdmin(actor);
    await this.loadUser(userId);
    const updated = await this.prisma.user.update({ where: { id: userId }, data: { isVerified: verified }, select: { id: true, isVerified: true } });
    await this.audit(actor.id, verified ? 'USER_VERIFY' : 'USER_UNVERIFY', 'USER', userId);
    if (verified) {
      await this.prisma.notification
        .create({ data: { userId, type: 'SYSTEM', title: 'You are now verified ✔', body: 'Your profile now shows the verified badge.', link: '/me' } })
        .catch(() => undefined);
    }
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
          id: true, targetType: true, targetId: true, reason: true, details: true, status: true, createdAt: true, resolvedAt: true,
          reporter: { select: { username: true } },
          resolver: { select: { username: true } },
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
        } else if (report.targetType === 'COMMENT') {
          await tx.comment.update({ where: { id: report.targetId }, data: { status: 'REMOVED' } });
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
      await tx.report.update({ where: { id: reportId }, data: { status: 'RESOLVED', resolvedBy: actor.id, resolvedAt: new Date() } });
    });

    await this.audit(actor.id, `REPORT_${action}`, 'REPORT', reportId, {
      targetType: report.targetType,
      targetId: report.targetId,
    });
    return { id: reportId, status: 'RESOLVED' as const };
  }

  async bulkResolveReports(actor: Actor, reportIds: string[], action: 'DISMISS' | 'REMOVE' | 'WARN') {
    if (!reportIds.length) throw new BadRequestException('No reports selected');

    const reports = await this.prisma.report.findMany({
      where: { id: { in: reportIds } },
    });

    const unresolved = reports.filter((r) => r.status !== 'RESOLVED');
    if (!unresolved.length) throw new BadRequestException('All selected reports are already resolved');

    await this.prisma.$transaction(async (tx) => {
      // Remove content if action is REMOVE
      if (action === 'REMOVE') {
        const postIds = unresolved.filter((r) => r.targetType === 'POST').map((r) => r.targetId);
        const answerIds = unresolved.filter((r) => r.targetType === 'ANSWER').map((r) => r.targetId);
        const commentIds = unresolved.filter((r) => r.targetType === 'COMMENT').map((r) => r.targetId);

        if (postIds.length) await tx.post.updateMany({ where: { id: { in: postIds } }, data: { status: 'REMOVED' } });
        if (answerIds.length) await tx.answer.updateMany({ where: { id: { in: answerIds } }, data: { status: 'REMOVED' } });
        if (commentIds.length) await tx.comment.updateMany({ where: { id: { in: commentIds } }, data: { status: 'REMOVED' } });
      }

      // Create moderation logs
      await tx.moderationLog.createMany({
        data: unresolved.map((r) => ({
          moderatorId: actor.id,
          reportId: r.id,
          action: action as ModerationAction,
          notes: `Bulk ${action} by ${actor.role}`,
        })),
      });

      // Mark reports as resolved
      await tx.report.updateMany({
        where: { id: { in: unresolved.map((r) => r.id) } },
        data: { status: 'RESOLVED', resolvedBy: actor.id, resolvedAt: new Date() },
      });
    });

    // Audit bulk action
    await this.audit(actor.id, `REPORTS_BULK_${action}`, 'REPORT', reportIds.join(','), {
      count: unresolved.length,
    });

    return { processed: unresolved.length };
  }

  // ---------- communities ----------

  async getCommunities(opts: { q?: string; page?: number; limit?: number }) {
    const where: Prisma.CommunityWhereInput = { deletedAt: null };
    const q = opts.q?.trim();
    if (q) where.OR = [{ name: { contains: q, mode: 'insensitive' } }, { slug: { contains: q } }];
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.community.findMany({
        where,
        select: {
          id: true, name: true, slug: true, description: true, isPublic: true, memberCount: true, postCount: true, createdAt: true,
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

  async getTopViews(limit = 20) {
    const [questions, answers] = await Promise.all([
      this.prisma.post.findMany({
        where: { deletedAt: null, status: 'PUBLISHED' },
        orderBy: { viewCount: 'desc' },
        take: limit,
        select: { title: true, seoSlug: true, viewCount: true },
      }),
      this.prisma.answer.findMany({
        where: { deletedAt: null },
        orderBy: { viewCount: 'desc' },
        take: limit,
        select: { id: true, viewCount: true, post: { select: { seoSlug: true, title: true } } },
      }),
    ]);
    return { questions, answers };
  }

  // Searches that returned nothing, most frequent first (kept in Redis by SearchService).
  async getZeroResultSearches(limit = 20) {
    const rows = await this.redis.zrevrange('search:zero', 0, limit - 1, 'WITHSCORES');
    const items: { query: string; count: number }[] = [];
    for (let i = 0; i < rows.length; i += 2) items.push({ query: rows[i], count: Number(rows[i + 1]) });
    return { items };
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

  // ---------- communities (manage) ----------

  private dupGuard(e: unknown, what: string): never {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new BadRequestException(`A ${what} with that slug or name already exists`);
    }
    throw e;
  }

  async createCommunity(actor: Actor, dto: { name: string; slug: string; description?: string; isPublic?: boolean }) {
    this.requireAdmin(actor);
    try {
      const c = await this.prisma.community.create({
        data: { name: dto.name.trim(), slug: dto.slug, description: dto.description?.trim() || null, isPublic: dto.isPublic ?? true, createdBy: actor.id },
        select: { id: true, slug: true, name: true },
      });
      await this.audit(actor.id, 'COMMUNITY_CREATE', 'COMMUNITY', c.id, { slug: c.slug });
      return c;
    } catch (e) {
      this.dupGuard(e, 'community');
    }
  }

  // Creates a starter set of communities, skipping any slug that already exists.
  async createStarterCommunities(actor: Actor) {
    this.requireAdmin(actor);
    const starters = [
      ['kerala', 'Kerala', 'കേരളം — places, culture, news and everyday life in Kerala.'],
      ['gulf-life', 'Gulf Life', 'ഗൾഫ് ജീവിതം — living and working in the UAE and GCC.'],
      ['jobs-careers', 'Jobs & Careers', 'ജോലി — job search, interviews, visas and career advice.'],
      ['health-ayurveda', 'Health & Ayurveda', 'ആരോഗ്യം — health, Ayurveda and wellbeing.'],
      ['technology', 'Technology', 'സാങ്കേതികം — phones, computers, apps and the internet.'],
      ['education', 'Education', 'വിദ്യാഭ്യാസം — schools, colleges, exams and studying abroad.'],
      ['money-business', 'Money & Business', 'പണം — savings, banking, NRI finance and small business.'],
      ['food-recipes', 'Food & Recipes', 'ഭക്ഷണം — Kerala recipes and cooking tips.'],
      ['travel', 'Travel', 'യാത്ര — trips, tickets, places to visit.'],
      ['malayalam-language', 'Malayalam Language', 'മലയാളം — words, grammar, literature and translation.'],
      ['movies-entertainment', 'Movies & Entertainment', 'സിനിമ — Malayalam cinema, music and shows.'],
      ['law-documents', 'Law & Documents', 'നിയമം — passports, Emirates ID, attestations and legal questions.'],
    ] as const;
    const existing = new Set(
      (await this.prisma.community.findMany({ where: { slug: { in: starters.map((s) => s[0]) } }, select: { slug: true } })).map((c) => c.slug),
    );
    const toCreate = starters.filter(([slug]) => !existing.has(slug));
    if (toCreate.length) {
      await this.prisma.community.createMany({
        data: toCreate.map(([slug, name, description]) => ({ slug, name, description, isPublic: true, createdBy: actor.id })),
        skipDuplicates: true,
      });
      await this.audit(actor.id, 'COMMUNITY_CREATE_STARTERS', 'COMMUNITY', 'starter', { slugs: toCreate.map((s) => s[0]) });
    }
    return { created: toCreate.length, skipped: starters.length - toCreate.length };
  }

  async updateCommunity(actor: Actor, id: string, dto: { name?: string; description?: string; isPublic?: boolean }) {
    this.requireAdmin(actor);
    const found = await this.prisma.community.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!found) throw new NotFoundException('Community not found');
    const data: Prisma.CommunityUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description.trim() || null;
    if (dto.isPublic !== undefined) data.isPublic = dto.isPublic;
    const c = await this.prisma.community.update({ where: { id }, data, select: { id: true, name: true, isPublic: true } });
    await this.audit(actor.id, 'COMMUNITY_UPDATE', 'COMMUNITY', id, { ...dto });
    return c;
  }

  async deleteCommunity(actor: Actor, id: string) {
    this.requireAdmin(actor);
    const found = await this.prisma.community.findFirst({ where: { id, deletedAt: null }, select: { id: true, slug: true } });
    if (!found) throw new NotFoundException('Community not found');
    await this.prisma.community.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit(actor.id, 'COMMUNITY_DELETE', 'COMMUNITY', id, { slug: found.slug });
    return { id, deleted: true };
  }

  // ---------- tags ----------

  async getTags(opts: { q?: string; page?: number; limit?: number }) {
    const q = opts.q?.trim();
    const where: Prisma.TagWhereInput = q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { slug: { contains: q } }] } : {};
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.tag.findMany({
        where,
        select: { id: true, name: true, slug: true, postCount: true, createdAt: true },
        orderBy: [{ postCount: 'desc' }, { name: 'asc' }],
        ...this.paging(opts.page, opts.limit),
      }),
      this.prisma.tag.count({ where }),
    ]);
    return { data: rows, total, page: opts.page ?? 1, limit: opts.limit ?? 20 };
  }

  async createTag(actor: Actor, dto: { name: string; slug: string }) {
    this.requireAdmin(actor);
    try {
      const t = await this.prisma.tag.create({ data: { name: dto.name.trim(), slug: dto.slug }, select: { id: true, name: true, slug: true } });
      await this.audit(actor.id, 'TAG_CREATE', 'TAG', t.id, { slug: t.slug });
      return t;
    } catch (e) {
      this.dupGuard(e, 'tag');
    }
  }

  async renameTag(actor: Actor, id: string, name: string) {
    this.requireAdmin(actor);
    const found = await this.prisma.tag.findUnique({ where: { id }, select: { name: true } });
    if (!found) throw new NotFoundException('Tag not found');
    try {
      const t = await this.prisma.tag.update({ where: { id }, data: { name: name.trim() }, select: { id: true, name: true } });
      await this.audit(actor.id, 'TAG_RENAME', 'TAG', id, { from: found.name, to: t.name });
      return t;
    } catch (e) {
      this.dupGuard(e, 'tag');
    }
  }

  async deleteTag(actor: Actor, id: string) {
    this.requireAdmin(actor);
    const found = await this.prisma.tag.findUnique({ where: { id }, select: { slug: true, postCount: true } });
    if (!found) throw new NotFoundException('Tag not found');
    await this.prisma.tag.delete({ where: { id } }); // PostTag rows cascade
    await this.audit(actor.id, 'TAG_DELETE', 'TAG', id, { slug: found.slug, postCount: found.postCount });
    return { id, deleted: true };
  }

  // ---------- announcements ----------

  async sendAnnouncement(actor: Actor, dto: { title: string; body: string; link?: string; audience: 'ALL' | 'STAFF' }) {
    this.requireAdmin(actor);
    const where: Prisma.UserWhereInput = { deletedAt: null };
    if (dto.audience === 'STAFF') where.role = { in: [...STAFF_ROLES] as UserRole[] };
    const users = await this.prisma.user.findMany({ where, select: { id: true } });
    const title = dto.title.trim();
    const body = dto.body.trim();
    for (let i = 0; i < users.length; i += 1000) {
      await this.prisma.notification.createMany({
        data: users.slice(i, i + 1000).map((u) => ({ userId: u.id, type: 'SYSTEM' as const, title, body, link: dto.link || null })),
      });
    }
    const id = `ann_${Date.now()}`;
    await this.audit(actor.id, 'ANNOUNCEMENT_SEND', 'ANNOUNCEMENT', id, { title, body, link: dto.link ?? null, audience: dto.audience, recipients: users.length });
    return { id, recipients: users.length };
  }

  async getAnnouncements() {
    const rows = await this.prisma.auditLog.findMany({
      where: { action: 'ANNOUNCEMENT_SEND' },
      select: { id: true, metadata: true, createdAt: true, actor: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });
    return { data: rows };
  }

  // ---------- system health & export ----------

  private async timed<T>(fn: () => Promise<T>, ms = 2000): Promise<{ ok: boolean; latencyMs: number; value?: T; error?: string }> {
    const t0 = Date.now();
    try {
      const value = await Promise.race([fn(), new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
      return { ok: true, latencyMs: Date.now() - t0, value };
    } catch (e) {
      return { ok: false, latencyMs: Date.now() - t0, error: e instanceof Error ? e.message : 'error' };
    }
  }

  async getSystemHealth() {
    const [db, dbSize, redis, redisMem, queues, counts] = await Promise.all([
      this.timed(() => this.prisma.$queryRaw`SELECT 1`),
      this.timed(() => this.prisma.$queryRaw<{ size: bigint }[]>`SELECT pg_database_size(current_database()) AS size`),
      this.timed(() => this.redis.ping()),
      this.timed(() => this.redis.info('memory')),
      this.timed(() => this.getQueueStats(), 3000),
      Promise.all([
        this.prisma.user.count({ where: { deletedAt: null } }),
        this.prisma.post.count({ where: { deletedAt: null } }),
        this.prisma.answer.count(),
        this.prisma.comment.count(),
        this.prisma.community.count({ where: { deletedAt: null } }),
        this.prisma.tag.count(),
        this.prisma.notification.count(),
      ]),
    ]);
    const mem = process.memoryUsage();
    const usedMem = /used_memory:(\d+)/.exec(redisMem.value ?? '')?.[1];
    const [users, posts, answers, comments, communities, tags, notifications] = counts;
    return {
      checkedAt: new Date().toISOString(),
      database: { ok: db.ok, latencyMs: db.latencyMs, error: db.error, sizeBytes: dbSize.value ? Number(dbSize.value[0]?.size ?? 0) : null },
      redis: { ok: redis.ok, latencyMs: redis.latencyMs, error: redis.error, usedMemoryBytes: usedMem ? Number(usedMem) : null },
      queues: { ok: queues.ok, error: queues.error, stats: queues.value ?? {} },
      api: { uptimeSec: Math.round(process.uptime()), rssBytes: mem.rss, heapUsedBytes: mem.heapUsed, node: process.version, env: process.env.NODE_ENV ?? 'development' },
      counts: { users, posts, answers, comments, communities, tags, notifications },
    };
  }

  async exportUsersCsv(actor: Actor): Promise<string> {
    this.requireAdmin(actor);
    const rows = await this.prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, username: true, displayName: true, email: true, role: true, reputationScore: true, bannedAt: true, bannedUntil: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 50_000,
    });
    // Quote every cell; neutralise spreadsheet formula injection.
    const cell = (v: unknown) => {
      let s = v === null || v === undefined ? '' : v instanceof Date ? v.toISOString() : String(v);
      if (/^[=+\-@]/.test(s)) s = `'${s}`;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const head = ['id', 'username', 'displayName', 'email', 'role', 'status', 'reputation', 'createdAt'];
    const lines = rows.map((u) =>
      [u.id, u.username, u.displayName, u.email, u.role, this.userStatus(u), u.reputationScore, u.createdAt].map(cell).join(','),
    );
    await this.audit(actor.id, 'USERS_EXPORT', 'USER', 'all', { rows: rows.length });
    return [head.join(','), ...lines].join('\n');
  }

  // ── Admin notifications ──────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get an(): any { return (this.prisma as any).adminNotification; }

  async getAdminNotifications(unreadOnly = false) {
    const where = unreadOnly ? { isRead: false } : {};
    const [items, unreadCount] = await Promise.all([
      this.an.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 }),
      this.an.count({ where: { isRead: false } }),
    ]);
    return { items, unreadCount };
  }

  async markAdminNotificationRead(id: string) {
    await this.an.update({ where: { id }, data: { isRead: true } });
    return { success: true };
  }

  async markAllAdminNotificationsRead() {
    await this.an.updateMany({ where: { isRead: false }, data: { isRead: true } });
    return { success: true };
  }

  // ── Approval ─────────────────────────────────────────────────────────────

  async approveUser(actor: Actor, userId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await (this.prisma as any).user.update({
      where: { id: userId },
      data: { isApproved: true },
      select: { id: true, username: true, displayName: true },
    }) as { id: string; username: string; displayName: string };
    await this.an.updateMany({
      where: { type: 'USER_REGISTRATION', relatedUserId: userId, isRead: false },
      data: { isRead: true },
    });
    await this.audit(actor.id, 'USER_APPROVED', 'USER', userId, { username: user.username });
    return { success: true, user };
  }

  async rejectUser(actor: Actor, userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { deletedAt: new Date() } });
    await this.an.updateMany({
      where: { type: 'USER_REGISTRATION', relatedUserId: userId, isRead: false },
      data: { isRead: true },
    });
    await this.audit(actor.id, 'USER_REJECTED', 'USER', userId, {});
    return { success: true };
  }

  async approveContent(actor: Actor, postId: string) {
    const post = await this.prisma.post.update({
      where: { id: postId },
      data: { status: 'PUBLISHED' },
      select: { id: true, title: true },
    });
    await this.an.updateMany({
      where: { type: 'NEW_QUESTION', relatedPostId: postId, isRead: false },
      data: { isRead: true },
    });
    await this.audit(actor.id, 'CONTENT_APPROVED', 'POST', postId, { title: post.title });
    return { success: true, post };
  }

  // Duplicate questions management
  async listDuplicateCandidates(status = 'PENDING', limit = 50) {
    const rows = await this.prisma.duplicateCandidate.findMany({
      where: { status },
      include: {
        sourcePost: { select: { id: true, seoSlug: true, title: true, answerCount: true, voteScore: true } },
        targetPost: { select: { id: true, seoSlug: true, title: true, answerCount: true, voteScore: true } },
      },
      orderBy: { score: 'desc' },
      take: Math.min(limit, 100),
    });
    return { data: rows };
  }

  async dismissDuplicate(actor: Actor, id: string) {
    await this.prisma.duplicateCandidate.update({ where: { id }, data: { status: 'DISMISSED' } });
    await this.audit(actor.id, 'DUPLICATE_DISMISSED', 'POST', id, {});
    return { success: true };
  }

  /**
   * Merge sourcePostId INTO targetPostId:
   * - Move all answers, comments, votes, bookmarks to target
   * - Redirect source by soft-deleting it and setting redirectTo
   * - Mark duplicate candidate as MERGED
   */
  async mergeQuestions(actor: Actor, sourcePostId: string, targetPostId: string) {
    if (sourcePostId === targetPostId) throw new Error('Cannot merge a question with itself');

    const [source, target] = await Promise.all([
      this.prisma.post.findUnique({ where: { id: sourcePostId }, select: { id: true, title: true, seoSlug: true } }),
      this.prisma.post.findUnique({ where: { id: targetPostId }, select: { id: true, title: true, seoSlug: true } }),
    ]);
    if (!source || !target) throw new Error('One or both posts not found');

    // Move answers that don't already exist on target
    const existingAuthorIds = new Set(
      (await this.prisma.answer.findMany({ where: { postId: targetPostId }, select: { authorId: true } })).map((a) => a.authorId),
    );
    const sourceAnswers = await this.prisma.answer.findMany({ where: { postId: sourcePostId }, select: { id: true, authorId: true } });
    const toMove = sourceAnswers.filter((a) => !existingAuthorIds.has(a.authorId));

    await this.prisma.$transaction([
      // Move answers
      ...toMove.map((a) => this.prisma.answer.update({ where: { id: a.id }, data: { postId: targetPostId } })),
      // Move comments on the source post
      this.prisma.comment.updateMany({ where: { postId: sourcePostId }, data: { postId: targetPostId } }),
      // Move bookmarks (skipDuplicates not available in updateMany; just attempt)
      this.prisma.bookmark.updateMany({ where: { postId: sourcePostId }, data: { postId: targetPostId } }),
      // Soft-delete source and mark as removed (redirects handled at query time)
      this.prisma.post.update({ where: { id: sourcePostId }, data: { deletedAt: new Date(), status: 'REMOVED' } }),
      // Update answer counts on target
      this.prisma.post.update({ where: { id: targetPostId }, data: { answerCount: { increment: toMove.length } } }),
      // Mark duplicate candidate as merged
      this.prisma.duplicateCandidate.updateMany({
        where: {
          OR: [
            { sourcePostId, targetPostId },
            { sourcePostId: targetPostId, targetPostId: sourcePostId },
          ],
        },
        data: { status: 'MERGED' },
      }),
    ]);

    await this.audit(actor.id, 'QUESTIONS_MERGED', 'POST', targetPostId, { sourceId: sourcePostId, sourceTitle: source.title });
    return { success: true, movedAnswers: toMove.length, targetSlug: target.seoSlug };
  }
}
