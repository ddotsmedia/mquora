import { Controller, Get } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import axios from 'axios';

interface HealthResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  uptime: number;
  checks: {
    database: 'ok' | 'error';
    redis: 'ok' | 'error';
    worker: 'ok' | 'unknown';
  };
}

@Controller('health')
export class HealthController {
  private prisma = new PrismaClient();
  private redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  });
  private startTime = Date.now();

  @Get()
  async getHealth(): Promise<HealthResponse> {
    let dbStatus: 'ok' | 'error' = 'ok';
    let redisStatus: 'ok' | 'error' = 'ok';
    let workerStatus: 'ok' | 'unknown' = 'unknown';

    // Check database
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      dbStatus = 'error';
    }

    // Check Redis
    try {
      await this.redis.ping();
    } catch (error) {
      redisStatus = 'error';
    }

    // Check worker health
    try {
      const response = await axios.get(
        `http://${process.env.WORKER_HOST || 'worker'}:3023/health`,
        { timeout: 2000 },
      );
      if (response.status === 200) {
        workerStatus = 'ok';
      }
    } catch (error) {
      // Worker is optional, don't fail the response
    }

    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const status = dbStatus === 'ok' ? 'ok' : 'degraded';

    const checks = {
      database: dbStatus,
      redis: redisStatus,
      worker: workerStatus,
    };

    const response: HealthResponse = {
      status,
      timestamp: new Date().toISOString(),
      uptime,
      checks,
    };

    // Return 200 if database ok, 503 if database error
    if (dbStatus === 'error') {
      throw {
        statusCode: 503,
        message: 'Service Unavailable',
        response,
      };
    }

    return response;
  }
}
