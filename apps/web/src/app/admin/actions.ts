'use server';

import { revalidatePath } from 'next/cache';
import { adminFetch, AdminApiError } from '@/lib/admin-server';

export type ActionResult = { ok: true; message: string } | { ok: false; message: string };

// Runs an admin mutation. Expected API errors become a message for the UI;
// anything else (including redirects on an expired session) is rethrown.
async function run(task: () => Promise<unknown>, success: string, paths: string[]): Promise<ActionResult> {
  try {
    await task();
  } catch (err) {
    if (err instanceof AdminApiError) return { ok: false, message: err.message };
    throw err;
  }
  for (const p of paths) revalidatePath(p, 'page');
  return { ok: true, message: success };
}

export async function banUserAction(userId: string, days: number): Promise<ActionResult> {
  return run(
    () => adminFetch(`/users/${userId}/ban`, { method: 'POST', body: { days } }),
    days === 0 ? 'User banned permanently' : `User banned for ${days} day(s)`,
    ['/admin/users', `/admin/users/${userId}`, '/admin/dashboard'],
  );
}

export async function unbanUserAction(userId: string): Promise<ActionResult> {
  return run(
    () => adminFetch(`/users/${userId}/unban`, { method: 'POST' }),
    'Ban lifted',
    ['/admin/users', `/admin/users/${userId}`, '/admin/dashboard'],
  );
}

export async function changeRoleAction(userId: string, role: string): Promise<ActionResult> {
  return run(
    () => adminFetch(`/users/${userId}/role`, { method: 'POST', body: { role } }),
    `Role changed to ${role.replace(/_/g, ' ').toLowerCase()}`,
    ['/admin/users', `/admin/users/${userId}`],
  );
}

export async function setPostStatusAction(postId: string, status: 'REMOVED' | 'PUBLISHED'): Promise<ActionResult> {
  const path = status === 'REMOVED' ? 'remove' : 'restore';
  return run(
    () => adminFetch(`/content/${postId}/${path}`, { method: 'POST' }),
    status === 'REMOVED' ? 'Post removed' : 'Post restored',
    ['/admin/content', '/admin/moderation', '/admin/dashboard'],
  );
}

export async function resolveReportAction(
  reportId: string,
  action: 'DISMISS' | 'REMOVE' | 'WARN',
): Promise<ActionResult> {
  const messages = { DISMISS: 'Report dismissed', REMOVE: 'Content removed and report resolved', WARN: 'Report resolved with warning' };
  return run(
    () => adminFetch(`/reports/${reportId}/resolve`, { method: 'POST', body: { action } }),
    messages[action],
    ['/admin/moderation', '/admin/dashboard', '/admin/audit'],
  );
}

export async function setFlagAction(key: string, enabled: boolean): Promise<ActionResult> {
  return run(
    () => adminFetch('/flags', { method: 'PATCH', body: { key, enabled } }),
    `${key} ${enabled ? 'enabled' : 'disabled'}`,
    ['/admin/config', '/admin/audit'],
  );
}
