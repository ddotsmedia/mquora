import { redirect } from 'next/navigation';
import { auth } from '@/auth';

// Routes a freshly signed-in user by role (runs server-side with the new session cookie).
export const dynamic = 'force-dynamic';

export default async function PostLogin({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl: cb } = await searchParams;
  const session = await auth();
  if (!session) redirect('/login?error=1');
  if (cb && cb.startsWith('/') && !cb.startsWith('//')) redirect(cb);
  const role = session.user?.role;
  redirect(role === 'ADMIN' || role === 'COMMUNITY_MODERATOR' ? '/admin/dashboard' : '/');
}
