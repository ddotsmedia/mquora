'use client';

import { useState } from 'react';
import ActionButton from './ActionButton';
import { changeRoleAction } from '@/app/admin/actions';

const roles = ['USER', 'TRUSTED_CONTRIBUTOR', 'VERIFIED_EXPERT', 'COMMUNITY_MODERATOR', 'ADMIN'];

export default function RoleSelect({ userId, current }: { userId: string; current: string }) {
  const [role, setRole] = useState(current);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-sm text-[var(--text)]"
      >
        {roles.map((r) => (
          <option key={r} value={r}>
            {r.replace(/_/g, ' ').toLowerCase()}
          </option>
        ))}
      </select>
      <ActionButton
        label="Save role"
        variant="primary"
        disabled={role === current}
        confirm={role === 'ADMIN' ? 'Grant full admin access to this user?' : undefined}
        run={() => changeRoleAction(userId, role)}
      />
    </div>
  );
}
