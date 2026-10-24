import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import './types/auth';

type User = {
  id: string;
  email: string;
  name: string;
  image?: string;
  accessToken: string;
  refreshToken?: string;
  role: string;
};

const API = process.env.API_INTERNAL_URL || 'http://localhost:3041';
const ACCESS_TTL_MS = 14 * 60 * 1000; // API access tokens live 15m; renew a minute early

// Gets a fresh API access token. Returns null if the refresh token is no longer valid.
async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${API}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { accessToken?: string };
    return data.accessToken ?? null;
  } catch {
    return null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      async authorize(credentials) {
        if (!credentials.email || !credentials.password) return null;

        let res: Response;
        try {
          res = await fetch(`${API}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // API rejects unknown fields (csrfToken etc.), so send only these two
            body: JSON.stringify({ email: credentials.email, password: credentials.password }),
            cache: 'no-store',
          });
        } catch (err) {
          console.error('[auth] authorize fetch error — API unreachable?', err);
          return null;
        }

        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { message?: string };
          const msg = typeof body.message === 'string' ? body.message : '';
          console.error('[auth] authorize login failed:', res.status, msg);
          if (res.status === 403 && msg.toLowerCase().includes('pending')) {
            // Throw so NextAuth propagates an CredentialsSignin error with a distinguishable cause
            throw new Error('PENDING_APPROVAL');
          }
          return null;
        }
        const data = await res.json();
        const user: User = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.displayName,
          image: undefined,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          role: data.user.role,
        };
        return user;
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  pages: { signIn: '/login' },
  callbacks: {
    async signIn({ user, account }) {
      // OAuth providers: exchange the NextAuth user for real API tokens
      if (account?.provider && account.provider !== 'credentials') {
        try {
          const res = await fetch(`${API}/api/v1/auth/oauth-signin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              name: user.name || user.email,
              image: user.image,
              provider: account.provider,
            }),
            cache: 'no-store',
          });
          if (!res.ok) return false;
          const data = await res.json() as { accessToken: string; refreshToken: string; user: { id: string; email: string; username: string; displayName: string; role: string } };
          // Stash tokens on the user object so the jwt callback can pick them up
          (user as User).accessToken = data.accessToken;
          (user as User).refreshToken = data.refreshToken;
          (user as User).role = data.user.role;
          user.id = data.user.id;
          user.name = data.user.displayName;
        } catch {
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = (user as User).accessToken;
        token.refreshToken = (user as User).refreshToken;
        token.role = (user as User).role;
        token.accessTokenExpires = Date.now() + ACCESS_TTL_MS;
        delete token.error;
        return token;
      }
      if (typeof token.accessTokenExpires === 'number' && Date.now() < token.accessTokenExpires) return token;
      // Access token expired: renew it, or mark the session invalid so pages send the user to log in.
      const fresh = typeof token.refreshToken === 'string' ? await refreshAccessToken(token.refreshToken) : null;
      if (!fresh) {
        token.error = 'RefreshFailed';
        delete token.accessToken;
        return token;
      }
      token.accessToken = fresh;
      token.accessTokenExpires = Date.now() + ACCESS_TTL_MS;
      delete token.error;
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        if (token.sub) session.user.id = token.sub;
        session.user.accessToken = token.accessToken as string | undefined;
        session.user.role = token.role as string;
      }
      if (token.error) session.error = token.error as string;
      return session;
    },
  },
});

