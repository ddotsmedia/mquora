/**
 * Verifies a Cloudflare Turnstile token server-side.
 * Returns true only when verification succeeds, or when Turnstile is not configured.
 * If Turnstile is configured, a verification outage rejects the request (fails closed).
 */
export async function verifyTurnstile(token: string | undefined): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      // Fail hard in production: missing secret means bot protection is completely disabled.
      throw new Error('TURNSTILE_SECRET_KEY is not set in production. Bot verification cannot proceed.');
    }
    // Non-production: warn and skip (dev convenience).
    console.warn('[turnstile] TURNSTILE_SECRET_KEY not set — skipping bot check (non-production)');
    return true;
  }
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
    return false;
  }
}
