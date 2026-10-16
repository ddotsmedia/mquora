'use client';

import { useState } from 'react';
import { Field, SubmitButton, inputCls, useSubmit } from './forms';
import { sendAnnouncementAction } from '@/app/admin/actions';

export default function AnnouncementForm() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [audience, setAudience] = useState<'ALL' | 'STAFF'>('ALL');
  const { pending, submit } = useSubmit();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const who = audience === 'ALL' ? 'every user' : 'all staff';
        if (!window.confirm(`Send this announcement to ${who}? It can't be recalled.`)) return;
        submit(() => sendAnnouncementAction({ title, body, link: link || undefined, audience }), () => {
          setTitle('');
          setBody('');
          setLink('');
        });
      }}
    >
      <Field label="Title">
        <input required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="New feature: Malayalam voice search" />
      </Field>
      <Field label="Message">
        <textarea required maxLength={1000} rows={4} value={body} onChange={(e) => setBody(e.target.value)} className={inputCls} />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Link (optional)" hint="A path on this site, e.g. /c/kerala-tech">
          <input pattern="/\S*" maxLength={200} value={link} onChange={(e) => setLink(e.target.value)} className={inputCls} placeholder="/" />
        </Field>
        <Field label="Audience">
          <select value={audience} onChange={(e) => setAudience(e.target.value as 'ALL' | 'STAFF')} className={inputCls}>
            <option value="ALL">All users</option>
            <option value="STAFF">Staff only (admins & moderators)</option>
          </select>
        </Field>
      </div>
      <p className="text-xs text-[var(--text-muted)]">{body.length}/1000 characters · delivered as an in-app notification</p>
      <SubmitButton pending={pending} label="Send announcement" />
    </form>
  );
}
