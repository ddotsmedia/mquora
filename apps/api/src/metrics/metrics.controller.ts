import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { MetricsService } from './metrics.service';
import { AdminGuard } from '../guards/admin.guard';

@Controller('metrics')
export class MetricsController {
  private prisma = new PrismaClient();

  constructor(private metricsService: MetricsService) {}

  @Get()
  @UseGuards(AdminGuard)
  async getMetrics(): Promise<string> {
    // Get active users in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeUsers24h = await this.prisma.user.count({
      where: {
        updatedAt: { gte: oneDayAgo },
      },
    });

    // Get total posts
    const totalPosts = await this.prisma.post.count({
      where: { status: 'PUBLISHED', deletedAt: null },
    });

    // Get queue depths (placeholder - would need Bull queue integration)
    const queueDepths = {
      'generate-embedding': 0,
      'compute-trending': 0,
      'build-feed': 0,
      'answer-quality': 0,
      'duplicate-detection': 0,
    };

    return this.metricsService.getMetrics(activeUsers24h, totalPosts, queueDepths);
  }
}
