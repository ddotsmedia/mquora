import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class SpamService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async checkSpam(content: string, userId: string): Promise<{ isSpam: boolean; reason?: string }> {
    const urlMatch = (content.match(/https?:\/\//g) || []).length;
    const urlDensity = content.length > 100 ? (urlMatch / (content.length / 100)) * 100 : 0;

    if (urlDensity > 3) {
      return { isSpam: true, reason: 'Too many URLs' };
    }

    const repeatChars = /(.)\1{6,}/.test(content);
    if (repeatChars) {
      return { isSpam: true, reason: 'Repeated characters' };
    }

    const onlyLetters = content.replace(/[^a-zA-Zാ-ൃഃദാഭവ-ൈ०-৯]/g, '');
    if (onlyLetters.length > 10) {
      const uppercase = (onlyLetters.match(/[A-Z]/g) || []).length;
      const capsRatio = (uppercase / onlyLetters.length) * 100;
      if (capsRatio > 80) {
        return { isSpam: true, reason: 'Excessive capitals' };
      }
    }

    const key = `spam:post_rate:${userId}`;
    const postCount = await this.redis.incr(key);
    if (postCount === 1) {
      await this.redis.expire(key, 60);
    }

    if (postCount > 5) {
      return { isSpam: true, reason: 'Rate limit exceeded' };
    }

    return { isSpam: false };
  }
}
