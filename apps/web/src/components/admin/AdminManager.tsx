'use client';

import { useState } from 'react';
import ActionButton from './ActionButton';
import { SubmitButton, inputCls, useSubmit } from './forms';
import { createAdminAction, updateAdminPermissionsAction, deleteAdminAction, CreateAdminInput } from '@/app/admin/actions';

type AdminFeature = { id: string; key: string; name: string; description?: string };

export function NewAdminForm({ features }: { features: AdminFeature[] }) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set(['USERS', 'CONTENT', 'REPORTS']));
  const { pending, submit } = useSubmit();

  const toggle = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const input: CreateAdminInput = {
          email: email.trim(),
          displayName: displayName.trim(),
          password,
          featureKeys: Array.from(selected),
        };
        submit(() => createAdminAction(input), () => {
          setEmail('');
          setDisplayName('');
          setPassword('');
          setSelected(new Set(['USERS', 'CONTENT', 'REPORTS']));
        });
      }}
    >
      <div className="flex flex-col gap-3">
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          className={inputCls}
        />
        <input
          required
          maxLength={100}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Display name"
          className={inputCls}
        />
        <input
          required
          type="password"
          minLength={8}
          maxLength={72}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (min 8 chars)"
          className={inputCls}
        />
        <div className="grid gap-2">
          <label className="text-sm font-medium">Permissions</label>
          <div className="grid grid-cols-2 gap-2">
            {features.map((f) => (
              <label key={f.key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selected.has(f.key)}
                  onChange={() => toggle(f.key)}
                  className="rounded"
                />
                <span className="text-sm">{f.key.replace(/_/g, ' ')}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
      <SubmitButton pending={pending} label="Create Admin" />
    </form>
  );
}

export function AdminRowActions({
  id,
  email,
  features,
  allFeatures,
}: {
  id: string;
  email: string;
  features: string[];
  allFeatures: AdminFeature[];
}) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(features));
  const { pending, submit } = useSubmit();

  const toggle = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  };

  if (editing) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {allFeatures.map((f) => (
            <label key={f.key} className="flex items-center gap-2">
              <input type="checkbox" checked={selected.has(f.key)} onChange={() => toggle(f.key)} className="rounded" />
              <span className="text-xs">{f.key.replace(/_/g, ' ')}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() =>
              submit(
                () => updateAdminPermissionsAction(id, Array.from(selected)),
                () => setEditing(false)
              )
            }
            disabled={pending}
            className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {pending ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setSelected(new Set(features));
            }}
            className="rounded bg-slate-600 px-2 py-1 text-xs font-medium text-white hover:bg-slate-700"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end gap-2">
      <ActionButton label="Edit" run={async () => { setEditing(true); return { ok: false, message: '' }; }} />
      <ActionButton label="Delete" variant="danger" confirm={`Delete admin "${email}"?`} run={() => deleteAdminAction(id)} />
    </div>
  );
}
