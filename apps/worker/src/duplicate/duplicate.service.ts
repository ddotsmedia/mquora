import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class DuplicateService {
  private prisma = new PrismaClient();

  async findDuplicates(postId: string) {
    const results = await this.prisma.$queryRaw`
      SELECT p2.id as "targetPostId",
        1 - (pe2.embedding <=> pe1.embedding) AS score
      FROM "PostEmbedding" pe1
      JOIN "PostEmbedding" pe2 ON pe1.embedding IS NOT NULL AND pe2.embedding IS NOT NULL
      JOIN "Post" p1 ON p1.id = pe1."postId" AND p1.id = ${postId}
      JOIN "Post" p2 ON p2.id = pe2."postId" AND p2.id != ${postId} AND p2."deletedAt" IS NULL
      WHERE 1 - (pe2.embedding <=> pe1.embedding) > 0.92
      ORDER BY score DESC
      LIMIT 5
    `;

    for (const row of results as Array<{ targetPostId: string; score: number }>) {
      await this.prisma.duplicateCandidate.upsert({
        where: { sourcePostId_targetPostId: { sourcePostId: postId, targetPostId: row.targetPostId } },
        create: {
          sourcePostId: postId,
          targetPostId: row.targetPostId,
          score: row.score,
          status: 'PENDING',
        },
        update: { score: row.score },
      });
    }

    return results;
  }

  async processBatch(postIds: string[]) {
    for (const postId of postIds) {
      await this.findDuplicates(postId);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}
