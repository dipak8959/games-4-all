/**
 * Screen-time accounting.
 *
 * Two independent limits, both parent-controlled and both off by default:
 *   - session: how long one continuous sitting may last
 *   - daily:   how much total play is allowed per calendar day
 *
 * All logic here is pure so the rollover, clock-change, and limit-boundary
 * behaviour can be tested directly. The provider owns the timers; this owns the
 * rules.
 */

export type UsageState = {
  /** Local calendar day the totals belong to, as YYYY-MM-DD. */
  readonly day: string;
  /** Total milliseconds played during `day`. */
  readonly playedTodayMs: number;
  /** Milliseconds played in the current unbroken sitting. */
  readonly sessionMs: number;
};

export type ScreenTimeLimits = {
  /** null = no limit. */
  readonly dailyLimitMs: number | null;
  readonly sessionLimitMs: number | null;
};

export type LimitVerdict =
  | { readonly kind: 'ok'; readonly remainingMs: number | null }
  | { readonly kind: 'session-over' }
  | { readonly kind: 'daily-over' };

export const MINUTE_MS = 60 * 1000;

/** Choices offered in Parent Zone, in minutes. `null` means unlimited. */
export const LIMIT_CHOICES_MIN: readonly (number | null)[] = [10, 15, 20, 30, 45, 60, null];

export const DEFAULT_LIMITS: ScreenTimeLimits = {
  dailyLimitMs: null,
  sessionLimitMs: null,
};

/** Local calendar day key. Deliberately local, not UTC: a limit resets at the
 *  child's midnight, not at some other timezone's. */
export function dayKey(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function emptyUsage(now: Date): UsageState {
  return { day: dayKey(now), playedTodayMs: 0, sessionMs: 0 };
}

/**
 * Folds elapsed play time into the running totals.
 *
 * Crossing midnight resets the daily total but keeps the sitting intact — a
 * child mid-game at midnight is not interrupted by the rollover itself.
 * Negative or absurd deltas (device clock changes, wake from deep sleep) are
 * clamped so a jump cannot silently consume the day's allowance.
 */
export function accrue(usage: UsageState, elapsedMs: number, now: Date): UsageState {
  const safeElapsed = Math.min(Math.max(elapsedMs, 0), 5 * MINUTE_MS);
  const today = dayKey(now);

  if (today !== usage.day) {
    return { day: today, playedTodayMs: safeElapsed, sessionMs: usage.sessionMs + safeElapsed };
  }

  return {
    day: today,
    playedTodayMs: usage.playedTodayMs + safeElapsed,
    sessionMs: usage.sessionMs + safeElapsed,
  };
}

/** Called when the child stops playing (leaves a game, backgrounds the app). */
export function endSession(usage: UsageState): UsageState {
  return { ...usage, sessionMs: 0 };
}

/** Drops stale totals when the app opens on a new day. */
export function rolloverIfNeeded(usage: UsageState, now: Date): UsageState {
  const today = dayKey(now);
  if (today === usage.day) return usage;
  return { day: today, playedTodayMs: 0, sessionMs: 0 };
}

export function evaluate(usage: UsageState, limits: ScreenTimeLimits): LimitVerdict {
  const { dailyLimitMs, sessionLimitMs } = limits;

  if (dailyLimitMs != null && usage.playedTodayMs >= dailyLimitMs) return { kind: 'daily-over' };
  if (sessionLimitMs != null && usage.sessionMs >= sessionLimitMs) return { kind: 'session-over' };

  const remainingCandidates: number[] = [];
  if (dailyLimitMs != null) remainingCandidates.push(dailyLimitMs - usage.playedTodayMs);
  if (sessionLimitMs != null) remainingCandidates.push(sessionLimitMs - usage.sessionMs);

  return {
    kind: 'ok',
    remainingMs: remainingCandidates.length ? Math.min(...remainingCandidates) : null,
  };
}

/** True while the child should get a gentle "nearly time to stop" heads-up. */
export function isInWindDown(verdict: LimitVerdict, windowMs = 2 * MINUTE_MS): boolean {
  return verdict.kind === 'ok' && verdict.remainingMs != null && verdict.remainingMs <= windowMs;
}

export function formatMinutes(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / MINUTE_MS));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}
