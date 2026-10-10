'use client';

import { useState } from 'react';
import ActionButton from './ActionButton';
import { banUserAction, unbanUserAction } from '@/app/admin/actions';

const durations = [
  { days: 1, label: '1 day' },
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: '1 year' },
  { days: 0, label: 'Permanent' },
];

export default function BanControls({ userId, status }: { userId: string; status: string }) {
  const [days, setDays] = useState(7);
  if (status !== 'ACTIVE') {
    return <ActionButton label="Lift suspension" variant="primary" run={() => unbanUserAction(userId)} />;
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={days}
        onChange={(e) => setDays(Number(e.target.value))}
        className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-sm text-[var(--text)]"
      >
        {durations.map((d) => (
          <option key={d.days} value={d.days}>
            {d.label}
          </option>
        ))}
      </select>
      <ActionButton
        label="Suspend user"
        variant="danger"
        confirm="Suspend this user? They will be signed out and blocked from logging in."
        run={() => banUserAction(userId, days)}
      />
    </div>
  );
}
