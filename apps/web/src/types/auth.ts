import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session extends DefaultSession {
    error?: string; // 'RefreshFailed' when the API session can no longer be renewed
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
