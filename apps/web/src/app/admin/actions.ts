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

export async function setVerifiedAction(userId: string, verified: boolean): Promise<ActionResult> {
  return run(
    () => adminFetch(`/users/${userId}/verify`, { method: 'POST', body: { verified } }),
    verified ? 'User verified' : 'Verification removed',
    ['/admin/users', `/admin/users/${userId}`],
  );
}

export async function createStarterCommunitiesAction(): Promise<ActionResult> {
  try {
    const r = await adminFetch<{ created: number; skipped: number }>('/communities/starter', { method: 'POST' });
    revalidatePath('/admin/communities', 'page');
    revalidatePath('/admin/dashboard', 'page');
    return { ok: true, message: r.created ? `Created ${r.created} communities` : 'Starter communities already exist' };
  } catch (err) {
    if (err instanceof AdminApiError) return { ok: false, message: err.message };
    throw err;
  }
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

// ---------- communities ----------

export type CommunityInput = { name: string; slug: string; description?: string; isPublic: boolean };

export async function createCommunityAction(input: CommunityInput): Promise<ActionResult> {
  return run(
    () => adminFetch('/communities', { method: 'POST', body: input }),
    `Community "${input.name}" created`,
    ['/admin/communities', '/admin/dashboard'],
  );
}

export async function updateCommunityAction(id: string, input: Partial<Omit<CommunityInput, 'slug'>>): Promise<ActionResult> {
  return run(() => adminFetch(`/communities/${id}`, { method: 'PATCH', body: input }), 'Community updated', ['/admin/communities']);
}

export async function deleteCommunityAction(id: string): Promise<ActionResult> {
  return run(() => adminFetch(`/communities/${id}`, { method: 'DELETE' }), 'Community deleted', ['/admin/communities', '/admin/dashboard']);
}

// ---------- tags ----------

export async function createTagAction(name: string, slug: string): Promise<ActionResult> {
  return run(() => adminFetch('/tags', { method: 'POST', body: { name, slug } }), `Tag "${name}" created`, ['/admin/tags']);
}

export async function renameTagAction(id: string, name: string): Promise<ActionResult> {
  return run(() => adminFetch(`/tags/${id}`, { method: 'PATCH', body: { name } }), 'Tag renamed', ['/admin/tags']);
}

export async function deleteTagAction(id: string): Promise<ActionResult> {
  return run(() => adminFetch(`/tags/${id}`, { method: 'DELETE' }), 'Tag deleted', ['/admin/tags']);
}

// ---------- announcements ----------

export type AnnouncementInput = { title: string; body: string; link?: string; audience: 'ALL' | 'STAFF' };

export async function sendAnnouncementAction(input: AnnouncementInput): Promise<ActionResult> {
  try {
    const res = await adminFetch<{ recipients: number }>('/announcements', { method: 'POST', body: input });
    revalidatePath('/admin/announcements', 'page');
    revalidatePath('/admin/audit', 'page');
    return { ok: true, message: `Announcement sent to ${res.recipients.toLocaleString()} user(s)` };
  } catch (err) {
    if (err instanceof AdminApiError) return { ok: false, message: err.message };
    throw err;
  }
}

// ---------- admin account management ----------

export type CreateAdminInput = { email: string; displayName: string; password: string; featureKeys: string[] };

export async function createAdminAction(input: CreateAdminInput): Promise<ActionResult> {
  return run(
    () => adminFetch('/create-admin', { method: 'POST', body: input }),
    `Admin "${input.email}" created`,
    ['/admin/admins', '/admin/dashboard'],
  );
}

export async function updateAdminPermissionsAction(id: string, featureKeys: string[]): Promise<ActionResult> {
  return run(
    () => adminFetch(`/admins/${id}/permissions`, { method: 'POST', body: { featureKeys } }),
    'Admin permissions updated',
    ['/admin/admins'],
  );
}

export async function deleteAdminAction(id: string): Promise<ActionResult> {
  return run(() => adminFetch(`/admins/${id}`, { method: 'DELETE' }), 'Admin deleted', ['/admin/admins', '/admin/dashboard']);
}
