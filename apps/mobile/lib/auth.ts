import * as SecureStore from 'expo-secure-store';
import { apiFetch } from './api';

export type Me = { id: string; username: string; displayName: string; email: string; bio: string; profile?: { credential?: string | null } | null };

export async function login(email: string, password: string) {
  const data = await apiFetch<{ accessToken: string; refreshToken: string }>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  await SecureStore.setItemAsync('accessToken', data.accessToken);
  await SecureStore.setItemAsync('refreshToken', data.refreshToken);
}

export async function logout() {
  await apiFetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => {});
  await SecureStore.deleteItemAsync('accessToken');
  await SecureStore.deleteItemAsync('refreshToken');
}

export const getMe = () => apiFetch<Me>('/api/v1/users/me');
