import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsService {
  private requestCounts = new Map<string, number>();
  private responseTimes = new Map<string, number[]>();

  constructor() {
    // Reset counters every hour
    setInterval(() => {
      this.requestCounts.clear();
      this.responseTimes.clear();
    }, 60 * 60 * 1000);
  }

  recordRequest(method: string, route: string, status: number, responseTimeMs: number): void {
    const key = `${method}:${route}:${status}`;
    this.requestCounts.set(key, (this.requestCounts.get(key) || 0) + 1);

    if (!this.responseTimes.has(route)) {
      this.responseTimes.set(route, []);
    }
    this.responseTimes.get(route)!.push(responseTimeMs);
  }

  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((sorted.length * p) / 100) - 1;
    return sorted[Math.max(0, index)];
  }

  getMetrics(activeUsers24h: number, totalPosts: number, queueDepths: Record<string, number>): string {
    let metrics = '# HELP mquora_requests_total Total requests processed\n';
    metrics += '# TYPE mquora_requests_total counter\n';

    for (const [key, count] of this.requestCounts.entries()) {
      const [method, route, status] = key.split(':');
      metrics += `mquora_requests_total{method="${method}",route="${route}",status="${status}"} ${count}\n`;
    }

    metrics += '\n# HELP mquora_response_time_ms Response time histogram\n';
    metrics += '# TYPE mquora_response_time_ms histogram\n';

    for (const [route, times] of this.responseTimes.entries()) {
      const p50 = this.percentile(times, 50);
      const p95 = this.percentile(times, 95);
      const p99 = this.percentile(times, 99);

      metrics += `mquora_response_time_ms{route="${route}",quantile="0.5"} ${p50}\n`;
      metrics += `mquora_response_time_ms{route="${route}",quantile="0.95"} ${p95}\n`;
      metrics += `mquora_response_time_ms{route="${route}",quantile="0.99"} ${p99}\n`;
    }

    metrics += '\n# HELP mquora_active_users_24h Active users in last 24 hours\n';
    metrics += '# TYPE mquora_active_users_24h gauge\n';
    metrics += `mquora_active_users_24h ${activeUsers24h}\n`;

    metrics += '\n# HELP mquora_posts_total Total posts created\n';
    metrics += '# TYPE mquora_posts_total gauge\n';
    metrics += `mquora_posts_total ${totalPosts}\n`;

    metrics += '\n# HELP mquora_queue_depth Job queue depth\n';
    metrics += '# TYPE mquora_queue_depth gauge\n';

    for (const [queue, depth] of Object.entries(queueDepths)) {
      metrics += `mquora_queue_depth{queue="${queue}"} ${depth}\n`;
    }

    return metrics;
  }
}
