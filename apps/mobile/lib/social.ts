import { apiFetch } from './api';

export type Community = { id: string; name: string };
export type Tag = { id: string; name: string; slug: string };
export type Interests = { onboarded: boolean; communityIds: string[]; tagIds: string[] };

export const getInterests = () => apiFetch<Interests>('/api/v1/me/interests');

export const listCommunities = () =>
  apiFetch<{ data: Community[] }>('/api/v1/trending/communities?limit=50').then((r) => r.data ?? []);

export const listTags = () => apiFetch<{ data: Tag[] }>('/api/v1/tags?limit=30').then((r) => r.data ?? []);

export const completeOnboarding = (communityIds: string[], tagIds: string[]) =>
  apiFetch('/api/v1/me/onboarding', { method: 'POST', body: JSON.stringify({ communityIds, tagIds }) });

export const skipOnboarding = () => apiFetch('/api/v1/me/onboarding/skip', { method: 'POST' });
