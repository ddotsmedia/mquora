/**
 * Verifies a Cloudflare Turnstile token server-side.
 * Returns true if verification passes or if Turnstile is not configured.
 */
export async function verifyTurnstile(token: string | undefined): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  // If not configured, skip check (graceful degradation)
  if (!secret) return true;
  // If configured but no token provided, reject
  if (!token) return false;

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch {
    // Network error verifying — allow through to avoid blocking all users
    return true;
  }
}
