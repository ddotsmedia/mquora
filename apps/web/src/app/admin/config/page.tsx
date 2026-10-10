import { auth } from '@/auth';
import { adminFetch } from '@/lib/admin-server';
import { EmptyState, PageHeader, Panel } from '@/components/admin/ui';
import { FlagToggle, NewFlagForm } from '@/components/admin/FlagControls';

export default async function FlagsPage() {
  const session = await auth();
  const canEdit = session?.user?.role === 'ADMIN';
  const flags = await adminFetch<Record<string, boolean>>('/flags');
  const entries = Object.entries(flags).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-6">
      <PageHeader title="Feature flags" description="Switch features on or off without a deploy. Changes are logged in the audit trail." />
      <Panel title="Flags" action={<span className="text-xs text-[var(--text-muted)]">{canEdit ? 'Admins can edit' : 'Read-only for moderators'}</span>}>
        {entries.length ? (
          <ul className="divide-y divide-[var(--border)]">
            {entries.map(([key, enabled]) => (
              <li key={key} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="font-mono text-sm">{key}</p>
                  <p className="text-xs text-[var(--text-muted)]">{enabled ? 'On for everyone' : 'Off'}</p>
                </div>
                <FlagToggle flagKey={key} enabled={enabled} canEdit={canEdit} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No flags yet" description="Add one below to get started." />
        )}
      </Panel>
      {canEdit && (
        <Panel title="Add a flag">
          <NewFlagForm canEdit={canEdit} />
          <p className="mt-3 text-xs text-[var(--text-muted)]">Use lowercase letters, numbers, dots, dashes or underscores. New flags start enabled.</p>
        </Panel>
      )}
    </div>
  );
}
