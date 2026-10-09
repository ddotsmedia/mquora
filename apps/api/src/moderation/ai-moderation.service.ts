import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AiGatewayService } from '../../../../packages/ai/src/index';
import { SpamService } from '../shared/spam.service';

export interface AiModerationResult {
  action: 'ALLOW' | 'FLAG' | 'BLOCK';
  confidence: number;
  reasons: string[];
  isMalayalam: boolean;
}

@Injectable()
export class AiModerationService {
  private prisma = new PrismaClient();
  private aiGateway = new AiGatewayService();

  constructor(private spamService: SpamService) {}

  async analyzeContent(text: string, _contentType: 'POST' | 'ANSWER' | 'COMMENT'): Promise<AiModerationResult> {
    const isMalayalam = /[ഀ-ൿ]/.test(text);
    const modResult = await this.aiGateway.moderate(text);

    if (modResult.flagged) {
      return {
        action: 'FLAG',
        confidence: 0.85,
        reasons: modResult.categories,
        isMalayalam,
      };
    }

    const spamCheck = await this.spamService.checkSpam(text, 'unknown');
    if (spamCheck.isSpam) {
      return {
        action: 'FLAG',
        confidence: 0.7,
        reasons: [spamCheck.reason || 'spam'],
        isMalayalam,
      };
    }

    return {
      action: 'ALLOW',
      confidence: 1.0,
      reasons: [],
      isMalayalam,
    };
  }

  async autoModerate(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { title: true, body: true, authorId: true },
    });

    if (!post) return;

    const result = await this.analyzeContent(`${post.title} ${post.body}`, 'POST');

    if (result.action === 'BLOCK') {
      await this.prisma.post.update({
        where: { id: postId },
        data: { deletedAt: new Date(), status: 'DELETED' },
      });
    } else if (result.action === 'FLAG') {
      await this.prisma.report.create({
        data: {
          reporterId: 'system',
          targetId: postId,
          targetType: 'POST',
          reason: 'AI_FLAG',
          details: result.reasons.join(', '),
          status: 'UNDER_REVIEW',
        },
      });
    }
  }
}
