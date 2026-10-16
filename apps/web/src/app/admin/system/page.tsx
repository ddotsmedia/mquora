import { Activity, Cpu, Database, HardDrive, Layers, Server } from 'lucide-react';
import { adminFetch } from '@/lib/admin-server';
import { PageHeader, Panel, StatCard, formatDate } from '@/components/admin/ui';
import AutoRefresh from '@/components/admin/AutoRefresh';

type Health = {
  checkedAt: string;
  database: { ok: boolean; latencyMs: number; error?: string; sizeBytes: number | null };
  redis: { ok: boolean; latencyMs: number; error?: string; usedMemoryBytes: number | null };
  queues: { ok: boolean; error?: string; stats: Record<string, { waiting?: number; active?: number; failed?: number }> };
  api: { uptimeSec: number; rssBytes: number; heapUsedBytes: number; node: string; env: string };
  counts: Record<string, number>;
};

export const dynamic = 'force-dynamic';

const mb = (b: number | null) => (b === null ? '—' : `${(b / 1024 / 1024).toFixed(1)} MB`);
const uptime = (s: number) => {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
};

function Status({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-[var(--surface-2)] px-4 py-3">
      <div className="flex items-center gap-3">
        <span className={`h-2.5 w-2.5 rounded-full ${ok ? 'bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400/60' : 'bg-rose-500'}`} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className={`text-sm tabular-nums ${ok ? 'text-[var(--text-secondary)]' : 'text-rose-300'}`}>{detail}</span>
    </div>
  );
}

export default async function SystemPage() {
  const h = await adminFetch<Health>('/system');
  const failedJobs = Object.values(h.queues.stats).reduce((n, q) => n + (q.failed ?? 0), 0);
  const waitingJobs = Object.values(h.queues.stats).reduce((n, q) => n + (q.waiting ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="System health" description={`Live status of the API, database, cache and job queues. Checked ${formatDate(h.checkedAt)}.`} actions={<AutoRefresh />} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="API uptime" value={uptime(h.api.uptimeSec)} hint={`${h.api.node} · ${h.api.env}`} icon={Server} tone="green" />
        <StatCard label="API memory" value={mb(h.api.rssBytes)} hint={`heap ${mb(h.api.heapUsedBytes)}`} icon={Cpu} tone="sky" />
        <StatCard label="Database size" value={mb(h.database.sizeBytes)} hint={`${h.database.latencyMs} ms query`} icon={HardDrive} tone="gold" />
        <StatCard label="Failed jobs" value={failedJobs} hint={`${waitingJobs} waiting`} icon={Layers} tone={failedJobs ? 'rose' : 'green'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Services">
          <div className="space-y-2">
            <Status ok label="API" detail="responding" />
            <Status ok={h.database.ok} label="PostgreSQL" detail={h.database.ok ? `${h.database.latencyMs} ms` : h.database.error ?? 'down'} />
            <Status ok={h.redis.ok} label="Redis" detail={h.redis.ok ? `${h.redis.latencyMs} ms · ${mb(h.redis.usedMemoryBytes)}` : h.redis.error ?? 'down'} />
            <Status ok={h.queues.ok} label="Job queues" detail={h.queues.ok ? `${Object.keys(h.queues.stats).length} queues` : h.queues.error ?? 'down'} />
          </div>
        </Panel>
        <Panel title="Data volume" action={<Database className="h-4 w-4 text-[var(--text-muted)]" />}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Object.entries(h.counts).map(([k, v]) => (
              <div key={k} className="rounded-xl bg-[var(--surface-2)] p-3">
                <p className="text-xl font-semibold tabular-nums">{v.toLocaleString()}</p>
                <p className="mt-1 text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{k}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Queues" action={<Activity className="h-4 w-4 text-[var(--text-muted)]" />}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Object.entries(h.queues.stats).map(([name, q]) => (
            <div key={name} className="rounded-xl bg-[var(--surface-2)] p-3">
              <p className="font-mono text-xs text-[var(--text-muted)]">{name}</p>
              <p className="mt-2 text-sm tabular-nums">
                {q.waiting ?? 0} waiting · {q.active ?? 0} active ·{' '}
                <span className={(q.failed ?? 0) > 0 ? 'text-rose-300' : ''}>{q.failed ?? 0} failed</span>
              </p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
