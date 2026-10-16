'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import ActionButton from './ActionButton';
import { Field, SubmitButton, inputCls, slugify, useSubmit } from './forms';
import { createCommunityAction, deleteCommunityAction, updateCommunityAction } from '@/app/admin/actions';

export function NewCommunityForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const { pending, submit } = useSubmit();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-medium text-white hover:brightness-110"
      >
        <Plus className="h-4 w-4" /> New community
      </button>
    );
  }

  return (
    <form
      className="w-full space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit(
          () => createCommunityAction({ name, slug, description: description || undefined, isPublic }),
          () => {
            setName('');
            setSlug('');
            setSlugTouched(false);
            setDescription('');
            setOpen(false);
          },
        );
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">New community</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Name">
          <input
            required
            maxLength={80}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            className={inputCls}
            placeholder="Kerala Tech"
          />
        </Field>
        <Field label="Slug" hint="Lowercase letters, numbers and dashes. Used in /c/<slug>.">
          <input
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            maxLength={50}
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase());
            }}
            className={inputCls}
            placeholder="kerala-tech"
          />
        </Field>
      </div>
      <Field label="Description">
        <textarea maxLength={500} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
      </Field>
      <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} /> Public community
      </label>
      <SubmitButton pending={pending} label="Create community" />
    </form>
  );
}

export function CommunityRowActions({ id, name, isPublic }: { id: string; name: string; isPublic: boolean }) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <ActionButton
        label="Rename"
        run={async () => {
          const next = window.prompt('New community name', name)?.trim();
          if (!next || next === name) return { ok: false, message: 'Rename cancelled' };
          return updateCommunityAction(id, { name: next });
        }}
      />
      <ActionButton label={isPublic ? 'Make private' : 'Make public'} run={() => updateCommunityAction(id, { isPublic: !isPublic })} />
      <ActionButton
        label="Delete"
        variant="danger"
        confirm={`Delete "${name}"? It will disappear from the site. Posts are kept.`}
        run={() => deleteCommunityAction(id)}
      />
    </div>
  );
}
