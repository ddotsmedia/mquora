import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { EmbeddingService } from '../../../../packages/ai/src/index';
import { Redis } from 'ioredis';
import { expandQuery } from './manglish';

@Injectable()
export class SearchService {
  private prisma = new PrismaClient();
  private embedding = new EmbeddingService();
  private redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

  async search(
    query: string,
    options: { type?: string; cursor?: string; limit?: number; language?: string } = {},
  ) {
    const limit = options.limit || 10;
    const offset = options.cursor ? parseInt(options.cursor, 10) : 0;

    const embedding = await this.embedding.embed(query);
    const isZeroVector = embedding.every((v: number) => v === 0);

    if (!isZeroVector) {
      try {
        const results = await this.prisma.$queryRaw`
          SELECT p.id, p.title, p."seoSlug", p.language, p."createdAt",
            1 - (pe.embedding <=> ${embedding}::vector) AS score
          FROM "Post" p
          JOIN "PostEmbedding" pe ON pe."postId" = p.id
          WHERE p."deletedAt" IS NULL
            AND (${options.language}::text IS NULL OR p.language = ${options.language})
          ORDER BY score DESC
          LIMIT ${limit + 1}
        `;

        const typedResults = results as Array<{ id: string; title: string; seoSlug: string; language: string; createdAt: Date; score: number }>;
        return {
          data: typedResults.slice(0, limit),
          nextCursor:
            typedResults.length > limit ? (offset + limit).toString() : null,
          searchType: 'semantic',
        };
      } catch (error) {
        console.error('Vector search error:', error);
      }
    }

    // Substring match on the query and its Malayalam-script forms, OR typo-tolerant title similarity (pg_trgm).
    const patterns = expandQuery(query).map((q) => `%${q}%`);
    const posts = await this.prisma.$queryRaw<
      Array<{ id: string; title: string; seoSlug: string; language: string; createdAt: Date }>
    >`
      SELECT p.id, p.title, p."seoSlug", p.language, p."createdAt"
      FROM "Post" p
      WHERE p."deletedAt" IS NULL
        AND (${options.language}::text IS NULL OR p.language::text = ${options.language})
        AND (p.title ILIKE ANY(${patterns}::text[])
          OR p.body ILIKE ANY(${patterns}::text[])
          OR similarity(p.title, ${query}) > 0.3)
      ORDER BY similarity(p.title, ${query}) DESC, p."createdAt" DESC
      LIMIT ${limit + 1} OFFSET ${offset}
    `;

    if (posts.length === 0 && query.trim().length >= 2) {
      const key = query.trim().toLowerCase().slice(0, 100);
      void this.redis.zincrby('search:zero', 1, key).catch(() => undefined);
      void this.redis.zremrangebyrank('search:zero', 0, -501).catch(() => undefined);
    }

    return {
      data: posts.slice(0, limit),
      nextCursor: posts.length > limit ? (offset + limit).toString() : null,
      searchType: 'fulltext',
    };
  }

  async suggest(query: string) {
    const key = `search:suggest:${query}`;
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached);

    const results = await this.prisma.post.findMany({
      where: { title: { startsWith: query, mode: 'insensitive' }, deletedAt: null },
      select: { title: true },
      take: 5,
    });

    const data = results.map((r) => r.title);
    await this.redis.setex(key, 3600, JSON.stringify(data));
    return data;
  }
}
