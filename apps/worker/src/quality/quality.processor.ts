import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { PrismaClient } from '@prisma/client';
import { AiGatewayService } from '../../../../packages/ai/src/index';

@Processor('answer-quality')
export class QualityProcessor {
  private prisma = new PrismaClient();
  private aiGateway = new AiGatewayService();

  @Process({ concurrency: 2 })
  async assessQuality(job: Job<{ answerId: string }>) {
    const answer = await this.prisma.answer.findUnique({
      where: { id: job.data.answerId },
      select: { body: true, postId: true },
    });

    if (!answer) return;

    const post = await this.prisma.post.findUnique({
      where: { id: answer.postId },
      select: { title: true },
    });

    const prompt = `Score this answer for quality on scale 0-100. Consider: relevance, completeness, accuracy, clarity. Output only JSON: {"score": number, "feedback": string}`;
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: prompt },
      {
        role: 'user',
        content: `Question: ${post?.title}\n\nAnswer: ${answer.body}`,
      },
    ];

    const response = await this.aiGateway.chat(messages);
    try {
      const parsed = JSON.parse(response);
      await this.prisma.answer.update({
        where: { id: job.data.answerId },
        data: { qualityScore: Math.min(100, Math.max(0, parsed.score)) },
      });
    } catch (error) {
      console.error('Quality scoring error:', error);
    }
  }
}
