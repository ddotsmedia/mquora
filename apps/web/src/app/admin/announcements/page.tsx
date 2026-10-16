import { adminFetch } from '@/lib/admin-server';
import { EmptyState, PageHeader, Panel, formatDate } from '@/components/admin/ui';
import AnnouncementForm from '@/components/admin/AnnouncementForm';

type Row = {
  id: string;
  createdAt: string;
  actor: { username: string } | null;
  metadata: { title?: string; body?: string; link?: string | null; audience?: string; recipients?: number } | null;
};

export default async function AnnouncementsPage() {
  const { data } = await adminFetch<{ data: Row[] }>('/announcements');
  return (
    <div className="space-y-6">
      <PageHeader title="Announcements" description="Send an in-app notification to every user or to staff." />
      <div className="grid gap-6 xl:grid-cols-5">
        <Panel title="New announcement" className="xl:col-span-3">
          <AnnouncementForm />
        </Panel>
        <Panel title="Recently sent" className="xl:col-span-2">
          {data.length ? (
            <ul className="space-y-4">
              {data.map((a) => (
                <li key={a.id} className="rounded-xl bg-[var(--surface-2)] p-4">
                  <p className="font-medium">{a.metadata?.title}</p>
                  <p className="mt-1 line-clamp-3 text-sm text-[var(--text-secondary)]">{a.metadata?.body}</p>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    {formatDate(a.createdAt)} · {a.metadata?.audience === 'STAFF' ? 'Staff' : 'All users'} ·{' '}
                    {(a.metadata?.recipients ?? 0).toLocaleString()} recipients · by {a.actor?.username ?? 'system'}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Nothing sent yet" />
          )}
        </Panel>
      </div>
    </div>
  );
}
