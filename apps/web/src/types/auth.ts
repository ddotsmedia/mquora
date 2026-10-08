import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: DefaultSession['user'] & {
      accessToken?: string;
      role?: string;
    };
  }

  interface User {
    accessToken?: string;
    role?: string;
  }
}
