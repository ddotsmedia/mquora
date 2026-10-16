'use client';

import { useState } from 'react';
import ActionButton from './ActionButton';
import { SubmitButton, inputCls, slugify, useSubmit } from './forms';
import { createTagAction, deleteTagAction, renameTagAction } from '@/app/admin/actions';

export function NewTagForm() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const { pending, submit } = useSubmit();
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit(() => createTagAction(name.trim(), slug), () => {
          setName('');
          setSlug('');
        });
      }}
    >
      <input
        required
        maxLength={50}
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setSlug(slugify(e.target.value));
        }}
        placeholder="Tag name"
        className={`${inputCls} max-w-[14rem]`}
      />
      <input
        required
        pattern="[a-z0-9]+(-[a-z0-9]+)*"
        maxLength={50}
        value={slug}
        onChange={(e) => setSlug(e.target.value.toLowerCase())}
        placeholder="tag-slug"
        className={`${inputCls} max-w-[12rem] font-mono`}
      />
      <SubmitButton pending={pending} label="Add tag" />
    </form>
  );
}

export function TagRowActions({ id, name, postCount }: { id: string; name: string; postCount: number }) {
  return (
    <div className="flex justify-end gap-2">
      <ActionButton
        label="Rename"
        run={async () => {
          const next = window.prompt('New tag name', name)?.trim();
          if (!next || next === name) return { ok: false, message: 'Rename cancelled' };
          return renameTagAction(id, next);
        }}
      />
      <ActionButton
        label="Delete"
        variant="danger"
        confirm={postCount ? `Delete "${name}"? It will be removed from ${postCount} post(s).` : `Delete "${name}"?`}
        run={() => deleteTagAction(id)}
      />
    </div>
  );
}
