'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin-api';
import { Trash2, CheckCircle } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ModerationPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (await adminApi.getReports()) as any[];
      setReports(data || []);
      setLoading(false);
    };
    const interval = setInterval(fetchReports, 30000);
    fetchReports();
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = async (reportId: string) => {
    await adminApi.dismissReport(reportId);
    setReports(reports.filter(r => r.id !== reportId));
  };

  const handleRemove = async (reportId: string) => {
    await adminApi.removeContent(reportId);
    setReports(reports.filter(r => r.id !== reportId));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--text)]">Moderation Queue</h2>
        <p className="text-[var(--text-secondary)] mt-1">{reports.length} pending reports</p>
      </div>

      {loading ? (
        <div className="text-center text-[var(--text-muted)]">Loading...</div>
      ) : reports.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-[var(--text)]">All clear! No pending reports.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {reports.map(report => (
            <div key={report.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium">
                    {report.type}
                  </span>
                  <p className="text-sm text-[var(--text-secondary)] mt-2">
                    Reported by: {report.reporter.username}
                  </p>
                </div>
                <span className="text-xs text-[var(--text-muted)]">
                  {new Date(report.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-[var(--text)] mb-4">{report.details}</p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => handleDismiss(report.id)}
                  className="px-4 py-2 text-sm rounded-lg bg-[var(--surface-2)] hover:bg-[var(--border)] text-[var(--text)] transition-all"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => handleRemove(report.id)}
                  className="px-4 py-2 text-sm rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-all"
                >
                  <Trash2 className="w-4 h-4 inline mr-2" />
                  Remove Content
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
