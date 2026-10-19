import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { serverApiFetch } from '@/lib/api';

// Server-only: calls the API as the signed-in user, or sends them to log in.
export async function userFetch<T>(path: string, returnTo: string, init?: RequestInit): Promise<T> {
  const session = await auth();
  const token = session?.user?.accessToken;
  if (!token || session?.error) redirect(`/login?callbackUrl=${encodeURIComponent(returnTo)}`);
  return serverApiFetch<T>(path, token, { cache: 'no-store', ...init });
}
