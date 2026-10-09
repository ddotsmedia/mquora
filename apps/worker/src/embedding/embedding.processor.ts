import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { PrismaClient } from '@prisma/client';
import { EmbeddingService } from '../../../../packages/ai/src/index';

@Processor('generate-embedding')
export class EmbeddingProcessor {
  private prisma = new PrismaClient();
  private embedding = new EmbeddingService();

  @Process({ concurrency: 5 })
  async processEmbedding(job: Job<{ type: 'POST' | 'ANSWER'; id: string; text: string }>) {
    const vec = await this.embedding.embed(job.data.text);

    if (job.data.type === 'POST') {
      await this.prisma.$executeRaw`
        UPDATE "PostEmbedding" SET "embedding" = ${vec}::vector WHERE "postId" = ${job.data.id}
      `;
    } else {
      await this.prisma.$executeRaw`
        UPDATE "AnswerEmbedding" SET "embedding" = ${vec}::vector WHERE "answerId" = ${job.data.id}
      `;
    }

    return { type: job.data.type, id: job.data.id };
  }
}
