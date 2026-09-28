import { type Rng } from '../../util/random';

/**
 * Stop and Go.
 *
 * A signal at the side of the park. While it says go — the round light at
 * the bottom — hold WALK and the walker crosses the park. When it says stop —
 * the square light at the top — let go and stand still. The middle light
 * warns that stop is coming.
 *
 * It practises self-control: stopping the moment you're told, even halfway
 * through doing something you want to keep doing. It grows with the player:
 * shorter goes, less warning, and less time to let go.
 *
 * Kind like everything else: walking on a stop just takes the walker a step
 * back, once, and they wait for the next go — nobody is out. Five crossings is the round, fixed before the first
 * step. There's no score: the stars come from how few steps back.
 */

export const CROSSINGS = 5;
/** Across the park, holding WALK, takes this many seconds. */
export const CROSS_SECONDS = 4;
/** A step back for walking on a stop. */
export const BACK = 0.12;

export type Light = 'go' | 'ready' | 'stop';

export type StopGoState = {
  readonly goMin: number;
  readonly warning: number;
  readonly grace: number;
  readonly light: Light;
  /** Seconds left of this go (warning included) or stop. */
  readonly left: number;
  /** How long this stop has been on. */
  readonly stopFor: number;
  readonly walking: boolean;
  /** After a step back, WALK does nothing until the next go. */
  readonly held: boolean;
  readonly x: number;
  readonly crossings: number;
  readonly oops: number;
  /** "A step back!" shows for a moment. */
  readonly oopsFor: number;
  readonly complete: boolean;
};

type LevelSpec = {
  /** Each go lasts between goMin and goMin + 2 seconds. */
  readonly goMin: number;
  /** The ready light comes on this long before stop. */
  readonly warning: number;
  /** Still walking this long into a stop is let off. */
  readonly grace: number;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { goMin: 4, warning: 1.5, grace: 0.8 },
  { goMin: 3.5, warning: 1.2, grace: 0.7 },
  { goMin: 3, warning: 1, grace: 0.6 },
  { goMin: 2.5, warning: 0.7, grace: 0.5 },
  { goMin: 2, warning: 0.4, grace: 0.35 },
  { goMin: 1.5, warning: 0, grace: 0.25 },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

export function createGame(_rng: Rng, level: number): StopGoState {
  const spec = specForLevel(level);
  return {
    goMin: spec.goMin,
    warning: spec.warning,
    grace: spec.grace,
    light: 'go',
    left: spec.goMin + 1,
    stopFor: 0,
    walking: false,
    held: false,
    x: 0,
    crossings: 0,
    oops: 0,
    oopsFor: 0,
    complete: false,
  };
}

/** WALK held down (true) or let go (false). */
export function hold(state: StopGoState, down: boolean): StopGoState {
  if (state.complete) return state;
  return { ...state, walking: down && !state.held };
}

export function step(state: StopGoState, seconds: number, rng: Rng): StopGoState {
  if (state.complete) return state;
  let next = state;
  let rest = Math.min(seconds, 0.25);
  while (rest > 0 && !next.complete) {
    const dt = Math.min(rest, 1 / 60);
    next = tick(next, dt, rng);
    rest -= dt;
  }
  return next;
}

function tick(state: StopGoState, dt: number, rng: Rng): StopGoState {
  let { light, left, stopFor, x, crossings, oops, walking, held } = state;
  const oopsFor = Math.max(0, state.oopsFor - dt);
  // The signal: go, ready, stop, and round again.
  left -= dt;
  if (light === 'stop') stopFor += dt;
  if (left <= 0) {
    if (light === 'stop') {
      light = 'go';
      left = state.goMin + rng() * 2;
      stopFor = 0;
      held = false;
    } else {
      light = 'stop';
      left = 1.5 + rng() * 1.5;
      stopFor = 0;
    }
  } else if (light === 'go' && left <= state.warning) {
    light = 'ready';
  }
  if (walking) {
    if (light === 'stop' && stopFor > state.grace) {
      // Walking on a stop: a step back, and stand still until the next go.
      return { ...state, light, left, stopFor, x: Math.max(0, x - BACK), walking: false, held: true, oops: oops + 1, oopsFor: 1.2 };
    }
    x += dt / CROSS_SECONDS;
    if (x >= 1) {
      x = 0;
      crossings += 1;
      if (crossings >= CROSSINGS) return { ...state, light, left, stopFor, x: 1, crossings, complete: true, oopsFor };
    }
  }
  return { ...state, light, left, stopFor, x, crossings, oops, oopsFor, walking, held };
}

/** No steps back is three stars; a couple, two; more, one. */
export function starsForOops(oops: number): number {
  if (oops === 0) return 3;
  if (oops <= 2) return 2;
  return 1;
}
