/**
 * Cooldown guard for expensive match recomputation. In-memory and
 * per-user — sufficient for this single-instance app; swap for a
 * shared store if the app is ever horizontally scaled.
 */

export const RECOMPUTE_COOLDOWN_MS = 60_000;

const lastRunByUser = new Map<string, number>();

export type CooldownVerdict =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export function checkRecomputeCooldown(
  userId: string,
  now: number = Date.now(),
  cooldownMs: number = RECOMPUTE_COOLDOWN_MS
): CooldownVerdict {
  const last = lastRunByUser.get(userId);
  if (last !== undefined && now - last < cooldownMs) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((cooldownMs - (now - last)) / 1000),
    };
  }
  lastRunByUser.set(userId, now);
  return { allowed: true };
}

/** Test helper. */
export function resetRecomputeCooldowns(): void {
  lastRunByUser.clear();
}
