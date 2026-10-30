import { randInt, type Rng } from '../../util/random';

/**
 * Peekaboo Pals.
 *
 * Pals peek out of holes, one or a few at a time, and duck back down after
 * a moment. Tap a pal who is awake to say hello. Some pals are sleepy —
 * eyes shut, nightcap on — and those are best left alone. Twenty pals peek
 * out in a round, and then it's over.
 *
 * It practises paying attention and holding back: noticing quickly, and —
 * from level 3 — *not* tapping when the thing in front of you is the wrong
 * thing. That second part, the brake as well as the go, is a skill a young
 * child is still building, and it grows the way it does: more holes, pals
 * who don't stay up as long, more of them at once, and more sleepy ones.
 *
 * Kind like everything else: tapping an empty hole does nothing at all; a
 * pal missed or a sleepy pal woken costs a star, not the round.
 */

export const PALS_PER_ROUND = 20;

export type PalKind = 'awake' | 'sleepy';

export type Pop = {
  readonly hole: number;
  /** Seconds after the start that it peeks out. */
  readonly at: number;
  /** Seconds it stays up. */
  readonly up: number;
  readonly kind: PalKind;
};

export type PeekabooState = {
  readonly cols: number;
  readonly rows: number;
  readonly pops: readonly Pop[];
  /** Pops tapped, by index — hello'd if awake, woken if sleepy. */
  readonly tapped: readonly number[];
  readonly elapsed: number;
  readonly started: boolean;
  readonly complete: boolean;
};

type LevelSpec = {
  readonly cols: number;
  readonly rows: number;
  /** Seconds a pal stays up. */
  readonly up: number;
  /** The most pals up at once. */
  readonly together: number;
  readonly sleepy: number;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { cols: 2, rows: 2, up: 2.2, together: 1, sleepy: 0 },
  { cols: 3, rows: 2, up: 1.9, together: 1, sleepy: 0 },
  { cols: 3, rows: 3, up: 1.6, together: 1, sleepy: 0.2 },
  { cols: 3, rows: 3, up: 1.4, together: 2, sleepy: 0.25 },
  { cols: 3, rows: 4, up: 1.2, together: 2, sleepy: 0.3 },
  { cols: 3, rows: 4, up: 1.0, together: 3, sleepy: 0.35 },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

const LEAD_IN = 0.8;
const RUN_OUT = 0.5;

export function createGame(rng: Rng, level: number): PeekabooState {
  const spec = specForLevel(level);
  const holes = spec.cols * spec.rows;
  const sleepyCount = Math.round(PALS_PER_ROUND * spec.sleepy);
  const kinds: PalKind[] = Array.from({ length: PALS_PER_ROUND }, () => 'awake');
  // The first two are always awake, so the idea comes before the twist.
  const slots = Array.from({ length: PALS_PER_ROUND - 2 }, (_, i) => i + 2);
  for (let i = 0; i < sleepyCount; i += 1) kinds[slots.splice(randInt(rng, 0, slots.length - 1), 1)[0]] = 'sleepy';

  const pops: Pop[] = [];
  let t = LEAD_IN;
  for (const kind of kinds) {
    // A hole that's free for the whole time this pal is up, and a moment
    // either side.
    const busy = new Set(pops.filter((p) => p.at < t + spec.up + 0.2 && p.at + p.up + 0.2 > t).map((p) => p.hole));
    const free = Array.from({ length: holes }, (_, h) => h).filter((h) => !busy.has(h));
    pops.push({ hole: free[randInt(rng, 0, free.length - 1)], at: t, up: spec.up, kind });
    // Never more up at once than the level allows.
    t += (spec.up / spec.together) * (1 + rng() * 0.3);
  }
  return { cols: spec.cols, rows: spec.rows, pops, tapped: [], elapsed: 0, started: false, complete: false };
}

/** The last pal ducks down, and a beat after: the round's fixed end. */
export function roundLength(state: PeekabooState): number {
  return Math.max(...state.pops.map((p) => p.at + p.up)) + RUN_OUT;
}

/** Which pop is up in a hole right now, if any — a tapped one ducks at once. */
export function upIn(state: PeekabooState, hole: number): number {
  return state.pops.findIndex(
    (p, i) => p.hole === hole && state.elapsed >= p.at && state.elapsed < p.at + p.up && !state.tapped.includes(i),
  );
}

export function start(state: PeekabooState): PeekabooState {
  return state.started ? state : { ...state, started: true };
}

/** A tap on a hole. An empty hole: nothing happens. */
export function tapHole(state: PeekabooState, hole: number): PeekabooState {
  if (!state.started || state.complete) return state;
  const i = upIn(state, hole);
  if (i < 0) return state;
  return { ...state, tapped: [...state.tapped, i] };
}

export function step(state: PeekabooState, seconds: number): PeekabooState {
  if (!state.started || state.complete) return state;
  const elapsed = state.elapsed + Math.min(seconds, 0.25);
  return { ...state, elapsed, complete: elapsed >= roundLength(state) };
}

/** Awake pals nobody said hello to, once they've ducked back down. */
export function missed(state: PeekabooState): number {
  return state.pops.filter(
    (p, i) => p.kind === 'awake' && !state.tapped.includes(i) && state.elapsed >= p.at + p.up,
  ).length;
}

/** Sleepy pals tapped. */
export function woken(state: PeekabooState): number {
  return state.tapped.filter((i) => state.pops[i].kind === 'sleepy').length;
}

/** One slip is still three stars — twenty pals is a lot to watch. */
export function starsForPals(state: PeekabooState): number {
  const slips = missed(state) + woken(state);
  if (slips <= 1) return 3;
  if (slips <= 4) return 2;
  return 1;
}
