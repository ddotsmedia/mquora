import { redirect } from 'next/navigation';
import { auth } from '@/auth';

// Guests get redirected to login on the server, not shown an app shell.
export default async function HistoryLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.accessToken || session.error) redirect('/login?callbackUrl=/history');
  return children;
}
