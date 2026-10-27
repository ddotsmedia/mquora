import { getInterests } from './social';

// After sign-in, send users who have not picked interests to onboarding.
// If the check fails, fall back to the feed rather than blocking the user.
export async function nextRoute(): Promise<'/onboarding' | '/'> {
  try {
    const { onboarded } = await getInterests();
    return onboarded ? '/' : '/onboarding';
  } catch {
    return '/';
  }
}
