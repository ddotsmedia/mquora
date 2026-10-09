import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error(`Cache del error for key ${key}:`, error);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const stream = this.redis.scanStream({
        match: pattern,
        count: 100,
      });

      const keys: string[] = [];
      stream.on('data', (resultKeys: string[]) => {
        if (resultKeys.length) {
          keys.push(...resultKeys);
        }
      });

      await new Promise<void>((resolve, reject) => {
        stream.on('end', () => {
          if (keys.length > 0) {
            this.redis.del(...keys).catch(reject);
          }
          resolve();
        });
        stream.on('error', reject);
      });
    } catch (error) {
      console.error(`Cache delPattern error for pattern ${pattern}:`, error);
    }
  }
}
