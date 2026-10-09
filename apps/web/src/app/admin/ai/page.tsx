/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin-api';
import { Circle } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function AIPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [queues, setQueues] = useState<any>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [q, f] = await Promise.all([
        adminApi.getQueues() as Promise<any>,
        adminApi.getFlags() as Promise<Record<string, boolean>>,
      ]);
      setQueues(q || {});
      setFlags(f || {});
      setLoading(false);
    };
    const interval = setInterval(fetchData, 15000);
    fetchData();
    return () => clearInterval(interval);
  }, []);

  const handleFlagToggle = async (key: string, enabled: boolean) => {
    await adminApi.setFeatureFlag(key, !enabled);
    setFlags({ ...flags, [key]: !enabled });
  };

  const getQueueStatus = (queue: any) => {
    const total = queue.waiting + queue.active;
    if (total === 0) return 'ok';
    if (total > 100) return 'error';
    return 'warn';
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[var(--text)]">AI & Queues</h2>

      {loading ? (
        <div className="text-center text-[var(--text-muted)]">Loading...</div>
      ) : (
        <>
          {/* Queue Health */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-[var(--text)]">Queue Health</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {Object.entries(queues).map(([name, queue]: [string, any]) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const status = getQueueStatus(queue as any);
                const statusColor = {
                  ok: 'text-green-500',
                  warn: 'text-yellow-500',
                  error: 'text-red-500',
                };
                return (
                  <div key={name} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Circle className={`w-3 h-3 fill-current ${statusColor[status]}`} />
                      <p className="font-medium text-[var(--text)]">{name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-[var(--text-muted)]">Waiting</p>
                        <p className="font-semibold text-[var(--text)]">{queue.waiting}</p>
                      </div>
                      <div>
                        <p className="text-[var(--text-muted)]">Active</p>
                        <p className="font-semibold text-[var(--text)]">{queue.active}</p>
                      </div>
                      <div>
                        <p className="text-[var(--text-muted)]">Completed</p>
                        <p className="font-semibold text-[var(--text)]">{queue.completed}</p>
                      </div>
                      <div>
                        <p className="text-[var(--text-muted)]">Failed</p>
                        <p className="font-semibold text-[var(--text)]">{queue.failed}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Feature Flags */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Feature Flags</h3>
            <div className="space-y-3">
              {Object.entries(flags).map(([key, enabled]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">{key}</span>
                  <button
                    onClick={() => handleFlagToggle(key, enabled)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      enabled
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-[var(--surface-2)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
