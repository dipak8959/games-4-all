import { randInt, type Rng } from '../../util/random';

/**
 * Duck Crossing.
 *
 * A duckling has to cross the roads to get to its pond. Hop it forward one
 * square at a time — and sideways, or back, when that's safer — while the
 * traffic goes by. Three ducklings home and the round is over.
 *
 * It practises looking ahead and judging gaps: watching which way a lane is
 * going and how fast, and stepping out when there's room, not when there
 * isn't — the same judgement crossing a real road asks for (and no, a real
 * road is not crossed like this; the help says so).
 *
 * The one thing the classic versions do that this never does: end on a
 * bump. A duckling that's bumped is back on the grass at the edge of that
 * road, and tries again. A bump costs a star, not the round. It grows the
 * way a road does: more lanes, faster traffic, smaller gaps, longer lorries.
 */

export const COLS = 7;
export const DUCKS_PER_ROUND = 3;
/** Traffic runs round a loop a little wider than the road, so vehicles
 *  drive on and off it rather than appearing. */
export const LOOP = COLS + 4;
const OFFSET = 2;
/** How far into its square a vehicle must reach to bump the duckling. */
const MARGIN = 0.2;

export type RowKind = 'grass' | 'road' | 'pond';

export type Vehicle = {
  /** Left end, along the loop, at time 0. */
  readonly at: number;
  readonly length: number;
};

export type Lane = {
  /** +1 drives right, -1 left. */
  readonly dir: 1 | -1;
  /** Squares a second. */
  readonly speed: number;
  readonly vehicles: readonly Vehicle[];
};

export type DuckCrossingState = {
  /** Bottom to top. */
  readonly rows: readonly RowKind[];
  /** A lane for each road row, by row index. */
  readonly lanes: Readonly<Record<number, Lane>>;
  readonly duck: { readonly row: number; readonly col: number };
  readonly home: number;
  readonly bumps: number;
  /** Seconds since the start, which is where all the traffic is. */
  readonly time: number;
  /** Seconds left showing a bump, or a duckling home. */
  readonly flash: number;
  readonly flashKind: 'bump' | 'home' | null;
  readonly complete: boolean;
};

type LevelSpec = {
  readonly lanes: number;
  readonly speed: number;
  /** The smallest gap between vehicles, in squares. */
  readonly gap: number;
  /** The longest vehicle, in squares. */
  readonly maxLength: number;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { lanes: 2, speed: 0.9, gap: 4, maxLength: 1 },
  { lanes: 3, speed: 1.05, gap: 3.6, maxLength: 1 },
  { lanes: 4, speed: 1.2, gap: 3.2, maxLength: 2 },
  { lanes: 5, speed: 1.35, gap: 2.9, maxLength: 2 },
  { lanes: 6, speed: 1.5, gap: 2.6, maxLength: 3 },
  { lanes: 7, speed: 1.7, gap: 2.3, maxLength: 3 },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

/** Roads of at most three lanes, with a strip of grass between. */
function layout(lanes: number): RowKind[] {
  const stretches = Math.ceil(lanes / 3);
  const rows: RowKind[] = ['grass'];
  for (let i = 0; i < stretches; i += 1) {
    // As even as they'll go, the longer stretches first.
    const here = Math.ceil((lanes - rows.filter((r) => r === 'road').length) / (stretches - i));
    for (let j = 0; j < here; j += 1) rows.push('road');
    if (i < stretches - 1) rows.push('grass');
  }
  rows.push('pond');
  return rows;
}

function makeLane(rng: Rng, spec: LevelSpec, dir: 1 | -1): Lane {
  const vehicles: Vehicle[] = [];
  let at = rng() * 2;
  for (;;) {
    const length = randInt(rng, 1, spec.maxLength);
    // Never let the last one close the gap round the loop to the first.
    if (at + length + spec.gap > LOOP + (vehicles[0]?.at ?? 0)) break;
    vehicles.push({ at, length });
    at += length + spec.gap + rng() * 1.5;
  }
  return { dir, speed: spec.speed * (0.85 + rng() * 0.3), vehicles };
}

export function createGame(rng: Rng, level: number): DuckCrossingState {
  const spec = specForLevel(level);
  const rows = layout(spec.lanes);
  const lanes: Record<number, Lane> = {};
  let dir: 1 | -1 = rng() < 0.5 ? 1 : -1;
  rows.forEach((kind, row) => {
    if (kind !== 'road') return;
    lanes[row] = makeLane(rng, spec, dir);
    dir = dir === 1 ? -1 : 1;
  });
  return {
    rows,
    lanes,
    duck: { row: 0, col: Math.floor(COLS / 2) },
    home: 0,
    bumps: 0,
    time: 0,
    flash: 0,
    flashKind: null,
    complete: false,
  };
}

const wrap = (x: number) => ((x % LOOP) + LOOP) % LOOP;

/** Where each vehicle in a lane is at a given time, as [left, right) in
 *  board squares — a vehicle wrapping round the loop may show as two. */
export function vehiclesAt(lane: Lane, time: number): { left: number; right: number; length: number }[] {
  const out: { left: number; right: number; length: number }[] = [];
  for (const v of lane.vehicles) {
    const at = wrap(v.at + lane.dir * lane.speed * time);
    for (const shift of [0, -LOOP]) {
      const left = at + shift - OFFSET;
      out.push({ left, right: left + v.length, length: v.length });
    }
  }
  return out.filter((v) => v.right > -OFFSET && v.left < COLS + OFFSET);
}

/** Is a square of a road clear of traffic at this moment? */
export function clearAt(state: Pick<DuckCrossingState, 'rows' | 'lanes'>, row: number, col: number, time: number): boolean {
  if (state.rows[row] !== 'road') return true;
  return vehiclesAt(state.lanes[row], time).every((v) => v.right <= col + MARGIN || v.left >= col + 1 - MARGIN);
}

/** The grass the duckling goes back to after a bump on this road. */
function kerb(rows: readonly RowKind[], row: number): number {
  let r = row;
  while (r > 0 && rows[r] !== 'grass') r -= 1;
  return r;
}

function bumpIfHit(state: DuckCrossingState): DuckCrossingState {
  const { row, col } = state.duck;
  if (clearAt(state, row, col, state.time)) return state;
  return {
    ...state,
    duck: { row: kerb(state.rows, row), col },
    bumps: state.bumps + 1,
    flash: 0.9,
    flashKind: 'bump',
  };
}

export type Hop = 'up' | 'down' | 'left' | 'right';

/** One hop. The traffic has been going all along — the duckling is safe
 *  on the grass, so there's time to watch before stepping out. */
export function hop(state: DuckCrossingState, way: Hop): DuckCrossingState {
  if (state.complete) return state;
  const { row, col } = state.duck;
  const to =
    way === 'up'
      ? { row: row + 1, col }
      : way === 'down'
        ? { row: Math.max(0, row - 1), col }
        : { row, col: Math.max(0, Math.min(COLS - 1, col + (way === 'left' ? -1 : 1))) };
  let next: DuckCrossingState = { ...state, duck: to };
  if (next.rows[to.row] === 'pond') {
    const home = state.home + 1;
    next = {
      ...next,
      home,
      duck: { row: 0, col: Math.floor(COLS / 2) },
      flash: 0.9,
      flashKind: 'home',
      complete: home >= DUCKS_PER_ROUND,
    };
    return next;
  }
  return bumpIfHit(next);
}

export function step(state: DuckCrossingState, seconds: number): DuckCrossingState {
  if (state.complete) return state;
  let next = state;
  let left = Math.min(seconds, 0.25);
  while (left > 0) {
    const dt = Math.min(left, 1 / 60);
    left -= dt;
    const flash = Math.max(0, next.flash - dt);
    next = bumpIfHit({ ...next, time: next.time + dt, flash, flashKind: flash > 0 ? next.flashKind : null });
  }
  return next;
}
