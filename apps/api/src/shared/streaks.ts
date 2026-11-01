const DAY_MS = 86_400_000;
const GULF_OFFSET_MS = 4 * 3_600_000;

export const gulfDay = (d: Date) => new Date(d.getTime() + GULF_OFFSET_MS).toISOString().slice(0, 10);

/** Counts a contribution (question, answer or vote) toward today's streak. Runs at most one update per day. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function recordActivity(prisma: any, userId: string, now = new Date()): Promise<void> {
  const today = gulfDay(now);
  const yesterday = gulfDay(new Date(now.getTime() - DAY_MS));
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currentStreak: true, longestStreak: true, lastActiveDay: true },
  });
  if (!user || user.lastActiveDay === today) return;
  const next = user.lastActiveDay === yesterday ? user.currentStreak + 1 : 1;
  await prisma.user.updateMany({
    where: { id: userId, OR: [{ lastActiveDay: null }, { lastActiveDay: { not: today } }] },
    data: { currentStreak: next, longestStreak: Math.max(user.longestStreak, next), lastActiveDay: today },
  });
}

/** The streak as a reader should see it: zero once a full day has been missed. */
export function effectiveStreak(u: { currentStreak: number; lastActiveDay: string | null }, now = new Date()): number {
  const today = gulfDay(now);
  const yesterday = gulfDay(new Date(now.getTime() - DAY_MS));
  return u.lastActiveDay === today || u.lastActiveDay === yesterday ? u.currentStreak : 0;
}
