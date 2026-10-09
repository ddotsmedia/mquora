/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin-api';
import { Trash2 } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ContentPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [content, setContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'flagged' | 'low-quality'>('all');

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (await adminApi.getContent(filter)) as any;
      setContent((data && data.data) || []);
      setLoading(false);
    };
    fetchContent();
  }, [filter]);

  const handleRemove = async (contentId: string) => {
    if (confirm('Remove this content?')) {
      await adminApi.removeContent(contentId);
      setContent(content.filter(c => c.id !== contentId));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[var(--text)]">Content Management</h2>
      </div>

      <div className="flex gap-2">
        {['all', 'flagged', 'low-quality'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === f
                ? 'bg-[var(--primary)] text-white'
                : 'bg-[var(--surface-2)] text-[var(--text-secondary)]'
            }`}
          >
            {f === 'all' ? 'All' : f === 'flagged' ? 'Flagged' : 'Low Quality'}
          </button>
        ))}
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-[var(--text-muted)]">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-2)] border-b border-[var(--border)]">
                <tr>
                  <th className="text-left py-3 px-4">Title</th>
                  <th className="text-left py-3 px-4">Author</th>
                  <th className="text-left py-3 px-4">Community</th>
                  <th className="text-left py-3 px-4">Score</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {content.map((item: any) => (
                  <tr key={item.id} className="hover:bg-[var(--surface-2)]">
                    <td className="py-3 px-4">{item.title}</td>
                    <td className="py-3 px-4">{item.author.username}</td>
                    <td className="py-3 px-4">{item.community?.name}</td>
                    <td className="py-3 px-4">{item.voteScore}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleRemove(item.id)}
                        className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
