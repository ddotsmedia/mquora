import Constants from 'expo-constants';
import { API_URL } from './api';

// Compares dotted versions ("1.2.0" vs "1.10.0") numerically.
export function isOlder(current: string, minimum: string): boolean {
  const a = current.split('.').map(Number);
  const b = minimum.split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x < y;
  }
  return false;
}

// Returns the minimum supported version if this build is too old, otherwise null.
export async function updateRequiredFor(): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/app/version`);
    if (!res.ok) return null;
    const { minVersion } = (await res.json()) as { minVersion: string };
    const current = Constants.expoConfig?.version ?? '0.0.0';
    return isOlder(current, minVersion) ? minVersion : null;
  } catch {
    return null;
  }
}
