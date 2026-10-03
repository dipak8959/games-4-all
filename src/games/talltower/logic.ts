/**
 * Tall Tower.
 *
 * A block slides back and forth above a tower. Tap and it drops. Whatever
 * hangs over the edge of the block below is trimmed off and falls away, so
 * a block dropped a little late leaves a narrower tower to build on. Land
 * it square and it keeps its whole width. Twelve blocks and the round is
 * over.
 *
 * It practises timing: stopping something moving at the right moment —
 * watching it come and pressing before it arrives, not when it's already
 * there. It grows the way timing does: a narrower tower, a faster block,
 * less forgiveness for "nearly square", no outline showing where to aim,
 * and from level 4 a block that speeds up as the tower rises.
 *
 * Kind like everything else: a block that misses the tower altogether just
 * falls; the next one slides out at the width the tower had. The round
 * ends at the twelfth drop and only there. There's no height to beat.
 */

export const FIELD_WIDTH = 320;
export const FIELD_HEIGHT = 480;
export const BLOCK_HEIGHT = 28;
export const BLOCKS_PER_ROUND = 12;
/** The base the tower stands on sits at the bottom of the field. */
export const BASE_Y = FIELD_HEIGHT - BLOCK_HEIGHT;
/** Narrower than this, a block would be too thin to see or aim at. */
const MIN_WIDTH = 12;
/** How long a trimmed piece or a missed block takes to fall away. */
export const FALL_TIME = 0.7;

export type Block = { readonly x: number; readonly w: number };

export type Falling = { readonly x: number; readonly w: number; readonly row: number; readonly age: number };

export type TallTowerState = {
  readonly speed: number;
  /** Within this far of square, a drop snaps square. */
  readonly snap: number;
  /** How much faster the block gets with each one placed. */
  readonly accel: number;
  /** An outline above the tower showing where square would be. */
  readonly ghost: boolean;
  /** Start the slider from alternating sides. */
  readonly alternate: boolean;
  readonly startWidth: number;
  /** The tower, base first. */
  readonly tower: readonly Block[];
  /** The block sliding above it. */
  readonly slider: Block;
  readonly dir: 1 | -1;
  readonly drops: number;
  readonly misses: number;
  /** Squarely landed drops, snapped or exact. */
  readonly square: number;
  readonly falling: readonly Falling[];
  readonly started: boolean;
  readonly complete: boolean;
};

type LevelSpec = {
  readonly width: number;
  readonly speed: number;
  readonly snap: number;
  readonly accel: number;
  readonly ghost: boolean;
  readonly alternate: boolean;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { width: 170, speed: 70, snap: 14, accel: 0, ghost: true, alternate: false },
  { width: 150, speed: 85, snap: 12, accel: 0, ghost: true, alternate: false },
  { width: 132, speed: 100, snap: 10, accel: 0, ghost: false, alternate: true },
  { width: 116, speed: 115, snap: 8, accel: 0.015, ghost: false, alternate: true },
  { width: 102, speed: 130, snap: 7, accel: 0.02, ghost: false, alternate: true },
  { width: 90, speed: 145, snap: 6, accel: 0.025, ghost: false, alternate: true },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

function sliderFor(w: number, fromRight: boolean): { slider: Block; dir: 1 | -1 } {
  return fromRight ? { slider: { x: FIELD_WIDTH - w, w }, dir: -1 } : { slider: { x: 0, w }, dir: 1 };
}

export function createGame(level: number): TallTowerState {
  const spec = specForLevel(level);
  const base = { x: (FIELD_WIDTH - spec.width) / 2, w: spec.width };
  return {
    speed: spec.speed,
    snap: spec.snap,
    accel: spec.accel,
    ghost: spec.ghost,
    alternate: spec.alternate,
    startWidth: spec.width,
    tower: [base],
    ...sliderFor(spec.width, false),
    drops: 0,
    misses: 0,
    square: 0,
    falling: [],
    started: false,
    complete: false,
  };
}

export function top(state: TallTowerState): Block {
  return state.tower[state.tower.length - 1];
}

/** How fast the slider goes now: quicker as the tower rises, from level 4. */
export function speedNow(state: TallTowerState): number {
  return state.speed * (1 + state.accel * (state.tower.length - 1));
}

/** The first tap sets the block sliding; it doesn't drop it. */
export function start(state: TallTowerState): TallTowerState {
  return state.started ? state : { ...state, started: true };
}

/** A tap: the sliding block drops onto the tower. */
export function drop(state: TallTowerState): TallTowerState {
  if (!state.started || state.complete) return state;
  const below = top(state);
  const s = state.slider;
  const row = state.tower.length;
  const drops = state.drops + 1;
  let tower = state.tower;
  let falling = state.falling;
  let misses = state.misses;
  let square = state.square;

  const offset = s.x - below.x;
  if (Math.abs(offset) <= state.snap) {
    // Near enough square: it lands square, and keeps its whole width.
    tower = [...tower, { x: below.x, w: Math.min(s.w, below.w) }];
    square += 1;
  } else {
    const left = Math.max(s.x, below.x);
    const right = Math.min(s.x + s.w, below.x + below.w);
    if (right - left >= MIN_WIDTH) {
      tower = [...tower, { x: left, w: right - left }];
      // The overhang falls away, from whichever side it hung over.
      const cut = offset > 0 ? { x: right, w: s.x + s.w - right } : { x: s.x, w: left - s.x };
      falling = [...falling, { ...cut, row, age: 0 }];
    } else {
      // Missed the tower: the whole block falls.
      falling = [...falling, { ...s, row, age: 0 }];
      misses += 1;
    }
  }

  const complete = drops >= BLOCKS_PER_ROUND;
  const next = top({ ...state, tower });
  const fromRight = state.alternate && drops % 2 === 1;
  return { ...state, tower, falling, drops, misses, square, complete, ...sliderFor(next.w, fromRight) };
}

export function step(state: TallTowerState, seconds: number): TallTowerState {
  if (!state.started) return state;
  const dt = Math.min(seconds, 0.25);
  const falling = state.falling.length
    ? state.falling.map((f) => ({ ...f, age: f.age + dt })).filter((f) => f.age < FALL_TIME)
    : state.falling;
  if (state.complete) return falling === state.falling ? state : { ...state, falling };

  // The slider bounces between the sides of the field.
  let x = state.slider.x + state.dir * speedNow(state) * dt;
  let dir = state.dir;
  const far = FIELD_WIDTH - state.slider.w;
  while (x < 0 || x > far) {
    if (x < 0) {
      x = -x;
      dir = 1;
    } else {
      x = 2 * far - x;
      dir = -1;
    }
  }
  return { ...state, slider: { ...state.slider, x }, dir, falling };
}

/** No misses and most of the width kept is three stars; a slip or two, two. */
export function starsForTower(state: TallTowerState): number {
  const kept = top(state).w / state.startWidth;
  if (state.misses === 0 && kept >= 0.5) return 3;
  if (state.misses <= 2) return 2;
  return 1;
}
