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
  /** When play time last accrued (epoch ms), so a break can be measured.
   *  Missing on usage saved before breaks were. */
  readonly lastPlayedAt?: number;
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

/**
 * How long away from play ends a sitting. Putting the app away for a moment
 * is not a break — otherwise a sitting limit is one swipe from undone — but
 * ten minutes doing something else is, wherever they were spent.
 */
export const BREAK_MS = 10 * MINUTE_MS;

/** A limit reached mid-round lets that round finish, for at most this long. */
export const LAST_ROUND_MS = 3 * MINUTE_MS;

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

  const lastPlayedAt = now.getTime();
  if (today !== usage.day) {
    return { day: today, playedTodayMs: safeElapsed, sessionMs: usage.sessionMs + safeElapsed, lastPlayedAt };
  }

  return {
    day: today,
    playedTodayMs: usage.playedTodayMs + safeElapsed,
    sessionMs: usage.sessionMs + safeElapsed,
    lastPlayedAt,
  };
}

/** Ends the sitting outright. */
export function endSession(usage: UsageState): UsageState {
  return { ...usage, sessionMs: 0 };
}

/** How much of the break is still to go: 0 once the sitting is over. */
export function breakLeftMs(usage: UsageState, now: Date): number {
  if (usage.sessionMs === 0 || usage.lastPlayedAt == null) return 0;
  // A clock set back can't stretch a break out for ever.
  const away = Math.max(0, now.getTime() - usage.lastPlayedAt);
  return Math.max(0, BREAK_MS - away);
}

/** Ends the sitting if the child has been away from play for a real break. */
export function afterBreak(usage: UsageState, now: Date): UsageState {
  // A clock set back: the break counts from now, not from a moment that
  // hasn't come yet.
  if (usage.lastPlayedAt != null && usage.lastPlayedAt > now.getTime()) return { ...usage, lastPlayedAt: now.getTime() };
  return usage.sessionMs > 0 && breakLeftMs(usage, now) === 0 ? endSession(usage) : usage;
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
