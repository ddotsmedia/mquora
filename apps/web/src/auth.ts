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
  role: string;
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      async authorize(credentials) {
        if (!credentials.email || !credentials.password) return null;

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3041'}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
        });

        if (!res.ok) return null;
        const data = await res.json();
        const user: User = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.displayName,
          image: undefined,
          accessToken: data.accessToken,
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
    jwt({ token, user }) {
      if (user) {
        token.accessToken = (user as User).accessToken;
        token.role = (user as User).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.accessToken = token.accessToken as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});

