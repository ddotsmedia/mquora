import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { serverApiFetch } from '@/lib/api';

// Routes a freshly signed-in user by role (runs server-side with the new session cookie).
export const dynamic = 'force-dynamic';

export default async function PostLogin({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl: cb } = await searchParams;
  const session = await auth();
  if (!session?.user?.accessToken || session.error) redirect('/login?expired=1');
  if (cb && cb.startsWith('/') && !/^\/[\/\\]/.test(cb) && !/[\x00-\x1f\\]/.test(cb)) redirect(cb);
  const role = session.user?.role;
  const staff = role === 'ADMIN' || role === 'COMMUNITY_MODERATOR';
  // New members pick their interests first.
  if (!staff) {
    const me = await serverApiFetch<{ onboarded: boolean }>('/api/v1/me/interests', session.user.accessToken, { cache: 'no-store' }).catch(() => ({ onboarded: true }));
    if (!me.onboarded) redirect('/onboarding');
  }
  redirect(role === 'ADMIN' || role === 'COMMUNITY_MODERATOR' ? '/admin/dashboard' : '/');
}
