import { Injectable } from '@nestjs/common';
import { PrismaClient, Language } from '@prisma/client';
import { EmbeddingService } from '../../../../packages/ai/src/index';
import { Redis } from 'ioredis';

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

    const posts = await this.prisma.post.findMany({
      where: {
        deletedAt: null,
        ...(options.language && { language: options.language as Language }),
        OR: [{ title: { contains: query, mode: 'insensitive' } }, { body: { contains: query, mode: 'insensitive' } }],
      },
      select: { id: true, title: true, seoSlug: true, language: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      skip: offset,
    });

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
