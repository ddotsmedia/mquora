import { Injectable } from '@nestjs/common';
import { AiGatewayService, type AiMessage } from '../../../../packages/ai/src/index';
import { Redis } from 'ioredis';
import * as crypto from 'crypto';

@Injectable()
export class TranslationService {
  private aiGateway = new AiGatewayService();
  private redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

  async manglishToMalayalam(text: string): Promise<string> {
    if (/[ഀ-ൿ]/.test(text)) return text;

    const hash = crypto.createHash('sha256').update(`ml:${text}`).digest('hex');
    const cached = await this.redis.get(`translate:${hash}`);
    if (cached) return cached;

    const messages: AiMessage[] = [
      {
        role: 'system',
        content: 'Convert Manglish (Malayalam written in Latin) to Malayalam script. Output only the Malayalam text.',
      },
      { role: 'user', content: text },
    ];

    const result = await this.aiGateway.chat(messages);
    await this.redis.setex(`translate:${hash}`, 86400, result);
    return result;
  }

  async malayalamToEnglish(text: string): Promise<string> {
    const hash = crypto.createHash('sha256').update(`en:${text}`).digest('hex');
    const cached = await this.redis.get(`translate:${hash}`);
    if (cached) return cached;

    const messages: AiMessage[] = [
      { role: 'system', content: 'Translate Malayalam to English. Output only the translation.' },
      { role: 'user', content: text },
    ];

    const result = await this.aiGateway.chat(messages);
    await this.redis.setex(`translate:${hash}`, 86400, result);
    return result;
  }
}
