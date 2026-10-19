import { redirect } from 'next/navigation';
import { userFetch } from '@/lib/session-api';

export const dynamic = 'force-dynamic';

// Sends the signed-in user to their own public profile.
export default async function MePage() {
  const me = await userFetch<{ username: string }>('/api/v1/users/me', '/me');
  redirect(`/profile/${encodeURIComponent(me.username)}`);
}
