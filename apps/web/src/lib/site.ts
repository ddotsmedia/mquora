// Public site origin, derived from the build-time public URL (https://askvyo.com in production).
export function siteOrigin(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL || 'https://askvyo.com').origin;
  } catch {
    return 'https://askvyo.com';
  }
}

export function siteDomain(): string {
  return new URL(siteOrigin()).host;
}
