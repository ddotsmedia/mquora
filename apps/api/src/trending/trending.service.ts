import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const DAY = 86_400_000;
const POST_CARD = {
  id: true, seoSlug: true, title: true, body: true, language: true, voteScore: true,
  answerCount: true, viewCount: true, createdAt: true,
  author: { select: { id: true, username: true, displayName: true } },
  community: { select: { id: true, slug: true, name: true } },
} as const;

const clamp = (n: number | undefined, def: number) => Math.min(Math.max(Number(n) || def, 1), 50);

// Deterministic discovery (plan §10 phase 1): engagement + freshness, no personal data.
@Injectable()
export class TrendingService {
  private prisma = new PrismaClient();

  async tags(limit?: number) {
    const rows = await this.prisma.tag.findMany({
      where: { postCount: { gt: 0 } },
      select: { id: true, name: true, slug: true, postCount: true },
      orderBy: [{ postCount: 'desc' }, { name: 'asc' }],
      take: clamp(limit, 10),
    });
    // _count kept for the existing sidebar component
    return { data: rows.map((t) => ({ ...t, _count: { posts: t.postCount } })) };
  }

  async posts(limit?: number, days = 7) {
    const since = new Date(Date.now() - days * DAY);
    const rows = await this.prisma.post.findMany({
      where: { status: 'PUBLISHED', deletedAt: null, createdAt: { gte: since } },
      select: POST_CARD,
      orderBy: [{ voteScore: 'desc' }, { answerCount: 'desc' }, { viewCount: 'desc' }, { createdAt: 'desc' }],
      take: clamp(limit, 10),
    });
    return { data: rows };
  }

  async unanswered(limit?: number) {
    const rows = await this.prisma.post.findMany({
      where: { status: 'PUBLISHED', deletedAt: null, answerCount: 0 },
      select: POST_CARD,
      orderBy: { createdAt: 'desc' },
      take: clamp(limit, 10),
    });
    return { data: rows };
  }

  async communities(limit?: number) {
    const rows = await this.prisma.community.findMany({
      where: { deletedAt: null, isPublic: true },
      select: { id: true, name: true, slug: true, description: true, memberCount: true, postCount: true },
      orderBy: [{ memberCount: 'desc' }, { postCount: 'desc' }],
      take: clamp(limit, 10),
    });
    return { data: rows.map((c) => ({ ...c, _count: { members: c.memberCount } })) };
  }

  // All tags for the /tags directory, optionally filtered by name.
  async allTags(q?: string, limit?: number) {
    const rows = await this.prisma.tag.findMany({
      where: { postCount: { gt: 0 }, ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}) },
      select: { id: true, name: true, slug: true, postCount: true },
      orderBy: [{ postCount: 'desc' }, { name: 'asc' }],
      take: Math.min(Math.max(Number(limit) || 200, 1), 500),
    });
    return { data: rows };
  }

  // One tag with its latest questions.
  async tagBySlug(slugValue: string, limit?: number) {
    const tag = await this.prisma.tag.findUnique({ where: { slug: slugValue }, select: { id: true, name: true, slug: true, postCount: true } });
    if (!tag) throw new NotFoundException('Tag not found');
    const posts = await this.prisma.post.findMany({
      where: { status: 'PUBLISHED', deletedAt: null, tags: { some: { tagId: tag.id } } },
      select: POST_CARD,
      orderBy: { createdAt: 'desc' },
      take: clamp(limit, 30),
    });
    return { ...tag, posts };
  }

  // Real totals for the home page hero.
  async stats() {
    const [communities, questions, answers, topics, members] = await Promise.all([
      this.prisma.community.count({ where: { deletedAt: null, isPublic: true } }),
      this.prisma.post.count({ where: { status: 'PUBLISHED', deletedAt: null } }),
      this.prisma.answer.count({ where: { status: 'PUBLISHED', deletedAt: null } }),
      this.prisma.tag.count({ where: { postCount: { gt: 0 } } }),
      this.prisma.user.count({ where: { deletedAt: null } }),
    ]);
    return { communities, questions, answers, topics, members };
  }
}
