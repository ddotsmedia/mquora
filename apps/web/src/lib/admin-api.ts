import { getSession } from 'next-auth/react';
import { ApiError } from './api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3041/api/v1';

async function adminFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const session = await getSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const token = (session as any)?.accessToken;

  const url = `${API_BASE}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (typeof options.headers === 'object' && options.headers && !(options.headers instanceof Headers)) {
    Object.assign(headers, options.headers);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new ApiError(response.status, `Admin API error: ${response.statusText}`);
  }

  return response.json();
}

export const adminApi = {
  getStats: () => adminFetch('/admin/stats'),

  getUsers: (filter?: string, page = 1, limit = 20) =>
    adminFetch(`/admin/users?page=${page}&limit=${limit}${filter ? `&filter=${filter}` : ''}`),

  banUser: (userId: string, reason: string) =>
    adminFetch(`/admin/users/${userId}/ban`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  unbanUser: (userId: string) =>
    adminFetch(`/admin/users/${userId}/unban`, { method: 'POST' }),

  changeUserRole: (userId: string, role: string) =>
    adminFetch(`/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),

  getContent: (filter?: string, cursor?: string, limit = 20) =>
    adminFetch(
      `/admin/content?${filter ? `filter=${filter}&` : ''}${cursor ? `cursor=${cursor}&` : ''}limit=${limit}`
    ),

  removeContent: (contentId: string) =>
    adminFetch(`/admin/content/${contentId}`, { method: 'DELETE' }),

  getReports: (status?: string, limit = 20) =>
    adminFetch(`/admin/reports?${status ? `status=${status}&` : ''}limit=${limit}`),

  dismissReport: (reportId: string) =>
    adminFetch(`/admin/reports/${reportId}/dismiss`, { method: 'POST' }),

  removeReportedContent: (reportId: string) =>
    adminFetch(`/admin/reports/${reportId}/remove-content`, { method: 'POST' }),

  warnReportUser: (reportId: string) =>
    adminFetch(`/admin/reports/${reportId}/warn-user`, { method: 'POST' }),

  getCommunities: () => adminFetch('/admin/communities'),

  getQueues: () => adminFetch('/admin/queues'),

  getFlags: () => adminFetch('/admin/flags'),

  setFeatureFlag: (key: string, enabled: boolean) =>
    adminFetch('/admin/flags', {
      method: 'POST',
      body: JSON.stringify({ key, enabled }),
    }),

  getAnalytics: () => adminFetch('/admin/analytics'),
};
