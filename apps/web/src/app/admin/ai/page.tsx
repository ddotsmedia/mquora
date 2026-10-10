import { adminFetch } from '@/lib/admin-server';
import { PageHeader, Panel } from '@/components/admin/ui';

type Counts = { waiting?: number; active?: number; completed?: number; failed?: number; delayed?: number; paused?: number };

const labels: Record<string, string> = {
  'generate-embedding': 'Generate embeddings',
  'duplicate-detection': 'Duplicate detection',
  'answer-quality': 'Answer quality scoring',
  'compute-trending': 'Trending computation',
  'build-feed': 'Feed building',
};

export default async function QueuesPage() {
  const queues = await adminFetch<Record<string, Counts>>('/queues');
  return (
    <div className="space-y-6">
      <PageHeader title="Background queues" description="Background jobs for search, quality and feeds. Failed jobs need attention." />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Object.entries(queues).map(([name, c]) => {
          const failed = c.failed ?? 0;
          return (
            <Panel key={name} title={labels[name] ?? name}>
              <p className="mb-4 font-mono text-xs text-[var(--text-muted)]">{name}</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                {(['waiting', 'active', 'completed', 'delayed', 'failed'] as const).map((k) => (
                  <div key={k} className="rounded-xl bg-[var(--surface-2)] p-3">
                    <p className={`text-xl font-semibold tabular-nums ${k === 'failed' && failed > 0 ? 'text-rose-300' : ''}`}>{(c[k] ?? 0).toLocaleString()}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{k}</p>
                  </div>
                ))}
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
