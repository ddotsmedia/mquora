'use client';

import { useTheme } from 'next-themes';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Moon, Sun } from 'lucide-react';

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="border-b border-border bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold text-accent">
              mquora
            </Link>
            <div className="hidden md:flex gap-6">
              <Link href="/" className="text-foreground hover:text-accent">
                Home
              </Link>
              <Link href="/c" className="text-foreground hover:text-accent">
                Communities
              </Link>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <input
              type="search"
              placeholder="Search..."
              className="px-3 py-2 rounded-md bg-muted text-foreground placeholder-muted-foreground"
            />
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-md hover:bg-muted"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            {session ? (
              <div className="flex items-center gap-4">
                <Link href="/create" className="px-3 py-2 rounded-md bg-accent text-accent-foreground">
                  Create
                </Link>
                <Link href={`/profile/${session.user?.name}`} className="text-foreground hover:text-accent">
                  {session.user?.name}
                </Link>
                <button onClick={() => signOut()} className="text-foreground hover:text-accent">
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="px-3 py-2 rounded-md hover:bg-muted">
                  Login
                </Link>
                <Link href="/register" className="px-3 py-2 rounded-md bg-accent text-accent-foreground">
                  Register
                </Link>
              </div>
            )}
          </div>

          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-md hover:bg-muted"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-md hover:bg-muted">
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-border py-4 space-y-2">
            <Link href="/" className="block px-3 py-2 rounded-md hover:bg-muted">
              Home
            </Link>
            <Link href="/c" className="block px-3 py-2 rounded-md hover:bg-muted">
              Communities
            </Link>
            {session ? (
              <>
                <Link href="/create" className="block px-3 py-2 rounded-md hover:bg-muted">
                  Create Post
                </Link>
                <Link href={`/profile/${session.user?.name}`} className="block px-3 py-2 rounded-md hover:bg-muted">
                  Profile
                </Link>
                <button
                  onClick={() => signOut()}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-muted"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="block px-3 py-2 rounded-md hover:bg-muted">
                  Login
                </Link>
                <Link href="/register" className="block px-3 py-2 rounded-md hover:bg-muted">
                  Register
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
