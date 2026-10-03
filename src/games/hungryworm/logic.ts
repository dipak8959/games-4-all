import { randInt, type Rng } from '../../util/random';

/**
 * Hungry Worm.
 *
 * A worm on a grid, always on the move. Steer it with the arrows to the
 * apple; each apple makes it longer. Ten apples and the round is over.
 *
 * It practises steering and planning ahead: turning early enough, and —
 * as the worm grows and rocks appear — not boxing yourself in. It grows
 * with the player: quicker, a longer worm per apple, then rocks.
 *
 * The one thing the classic versions of this game do that this one never
 * does: end on a bump. Running into a wall, a rock or its own tail just
 * stops the worm, and it waits — as long as it takes — for a way that's
 * clear. A bump costs a star and nothing else. The round ends at the tenth
 * apple and only there.
 */

export const APPLES_PER_ROUND = 10;

export type Dir = 'up' | 'right' | 'down' | 'left';
const OPPOSITE: Record<Dir, Dir> = { up: 'down', right: 'left', down: 'up', left: 'right' };

export type HungryWormState = {
  readonly cols: number;
  readonly rows: number;
  /** Cells, head first. A cell is `row * cols + col`. */
  readonly worm: readonly number[];
  readonly dir: Dir;
  readonly rocks: readonly number[];
  readonly apple: number;
  /** Segments still to add, from apples eaten. */
  readonly growing: number;
  readonly eaten: number;
  /** Stopped against something, waiting for a clear way. */
  readonly stuck: boolean;
  readonly bumps: number;
  /** Seconds since the worm last moved. */
  readonly since: number;
  readonly tick: number;
  readonly growBy: number;
  readonly started: boolean;
  readonly complete: boolean;
};

type LevelSpec = {
  readonly cols: number;
  readonly rows: number;
  /** Seconds per step. */
  readonly tick: number;
  readonly growBy: number;
  readonly rocks: number;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { cols: 8, rows: 10, tick: 0.42, growBy: 1, rocks: 0 },
  { cols: 9, rows: 11, tick: 0.37, growBy: 1, rocks: 0 },
  { cols: 10, rows: 12, tick: 0.32, growBy: 2, rocks: 0 },
  { cols: 10, rows: 12, tick: 0.28, growBy: 2, rocks: 3 },
  { cols: 11, rows: 14, tick: 0.24, growBy: 2, rocks: 5 },
  { cols: 12, rows: 15, tick: 0.2, growBy: 3, rocks: 7 },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

export function neighbour(cols: number, rows: number, cell: number, dir: Dir): number | null {
  const r = Math.floor(cell / cols);
  const c = cell % cols;
  if (dir === 'up') return r > 0 ? cell - cols : null;
  if (dir === 'down') return r < rows - 1 ? cell + cols : null;
  if (dir === 'left') return c > 0 ? cell - 1 : null;
  return c < cols - 1 ? cell + 1 : null;
}

/** Free cells the head can get to from where it is. */
function reachable(state: Pick<HungryWormState, 'cols' | 'rows' | 'worm' | 'rocks'>): Set<number> {
  const blocked = new Set([...state.worm, ...state.rocks]);
  const seen = new Set<number>();
  let frontier = [state.worm[0]];
  while (frontier.length) {
    const next: number[] = [];
    for (const cell of frontier) {
      for (const d of ['up', 'right', 'down', 'left'] as Dir[]) {
        const n = neighbour(state.cols, state.rows, cell, d);
        if (n === null || blocked.has(n) || seen.has(n)) continue;
        seen.add(n);
        next.push(n);
      }
    }
    frontier = next;
  }
  return seen;
}

/**
 * An apple on any open square, not right under the worm's nose.
 *
 * Any open square will do: the worm's body moves on, and rocks never wall
 * a square off, so every open square can be reached in time. Asking for
 * squares reachable *right now* went wrong when the worm happened to be
 * curled into a pocket — there were none, no apple appeared, and the round
 * could never end.
 */
function placeApple(rng: Rng, state: Pick<HungryWormState, 'cols' | 'rows' | 'worm' | 'rocks'>): number {
  const head = state.worm[0];
  const taken = new Set([...state.worm, ...state.rocks]);
  const options = Array.from({ length: state.cols * state.rows }, (_, c) => c).filter((c) => !taken.has(c));
  const far = options.filter((c) => {
    const dr = Math.abs(Math.floor(c / state.cols) - Math.floor(head / state.cols));
    const dc = Math.abs((c % state.cols) - (head % state.cols));
    return dr + dc >= 3;
  });
  const pool = far.length ? far : options;
  return pool.length ? pool[randInt(rng, 0, pool.length - 1)] : -1;
}

export function createGame(rng: Rng, level: number): HungryWormState {
  const spec = specForLevel(level);
  const { cols, rows } = spec;
  const mid = Math.floor(rows / 2);
  // Three long, in the middle row, facing right.
  const worm = [mid * cols + 3, mid * cols + 2, mid * cols + 1];
  // Rocks away from the worm's row, and never walling anything off.
  let rocks: number[] = [];
  for (let attempt = 0; attempt < 50; attempt += 1) {
    rocks = [];
    while (rocks.length < spec.rocks) {
      const cell = randInt(rng, 0, cols * rows - 1);
      const r = Math.floor(cell / cols);
      if (Math.abs(r - mid) <= 1 || rocks.includes(cell)) continue;
      rocks.push(cell);
    }
    const open = cols * rows - rocks.length - worm.length;
    if (reachable({ cols, rows, worm, rocks }).size === open) break;
  }
  const base = { cols, rows, worm, rocks };
  return {
    ...base,
    dir: 'right',
    apple: placeApple(rng, base),
    growing: 0,
    eaten: 0,
    stuck: false,
    bumps: 0,
    since: 0,
    tick: spec.tick,
    growBy: spec.growBy,
    started: false,
    complete: false,
  };
}

/** An arrow press. The first press starts the worm, heading that way. The
 *  worm can't turn straight back on itself. */
export function turn(state: HungryWormState, dir: Dir): HungryWormState {
  if (state.complete) return state;
  if (state.worm.length > 1) {
    const neck = state.worm[1];
    if (neighbour(state.cols, state.rows, state.worm[0], dir) === neck) {
      return state.started ? state : { ...state, started: true };
    }
  }
  // Still stuck until a step actually goes somewhere: pressing into another
  // wall while stopped is not a second bump.
  return { ...state, dir, started: true };
}

export function step(state: HungryWormState, seconds: number, rng: Rng): HungryWormState {
  if (!state.started || state.complete) return state;
  let next = state;
  let left = Math.min(seconds, 0.5);
  while (left > 0 && !next.complete) {
    const dt = Math.min(left, next.tick - next.since);
    next = { ...next, since: next.since + dt };
    left -= dt;
    if (next.since >= next.tick - 1e-9) next = move({ ...next, since: 0 }, rng);
  }
  return next;
}

function move(state: HungryWormState, rng: Rng): HungryWormState {
  if (!state.started || state.complete) return state;
  const head = state.worm[0];
  const to = neighbour(state.cols, state.rows, head, state.dir);
  // The tail moves out of the way this step unless the worm is growing.
  const body = state.growing > 0 ? state.worm : state.worm.slice(0, -1);
  const open = (cell: number | null) => cell !== null && !state.rocks.includes(cell) && !body.includes(cell);
  if (!open(to)) {
    const bumped = state.stuck ? state : { ...state, stuck: true, bumps: state.bumps + 1 };
    // Boxed in by its own body, with no way out at all: it pulls its tail
    // in, a square a step, until one opens. Without this a worm curled up
    // tight would wait for ever, and the round could never end.
    // "No way out" counts the worm's neck as shut, since it can't turn
    // straight back onto it.
    const trapped = !(['up', 'right', 'down', 'left'] as Dir[]).some((d) => {
      const n = neighbour(state.cols, state.rows, head, d);
      return open(n) && n !== state.worm[1];
    });
    if (trapped && state.worm.length > 1) return { ...bumped, worm: state.worm.slice(0, -1), growing: 0 };
    return bumped;
  }
  const worm = [to as number, ...body];
  const growing = Math.max(0, state.growing - 1);
  if (to !== state.apple) return { ...state, worm, growing, stuck: false };

  const eaten = state.eaten + 1;
  const grown = { ...state, worm, growing: growing + state.growBy, eaten, stuck: false };
  if (eaten >= APPLES_PER_ROUND) return { ...grown, complete: true };
  return { ...grown, apple: placeApple(rng, grown) };
}
