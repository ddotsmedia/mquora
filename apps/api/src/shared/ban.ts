// A user is banned while bannedAt is set and either bannedUntil is empty (permanent) or still in the future.
export function isBanned(user: { bannedAt: Date | null; bannedUntil: Date | null }, now = new Date()): boolean {
  return !!user.bannedAt && (!user.bannedUntil || user.bannedUntil > now);
}
