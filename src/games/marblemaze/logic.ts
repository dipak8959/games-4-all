import { randInt, type Rng } from '../../util/random';

/**
 * Marble Maze.
 *
 * A wooden board seen from above, with walls across it, each with a door,
 * and holes here and there. Press and hold anywhere and the board tips that
 * way: the marble rolls towards your finger, picking up speed. Let go and
 * the board levels out, and the marble slows. Roll it up through every door
 * to the ring with the star at the top — without letting it drop down a
 * hole on the way.
 *
 * It practises fine control and planning: steering something that keeps
 * rolling, slowing before the turns, and going round the holes, not near
 * them. It grows with the player: more walls, narrower doors, more holes
 * closer to the way through, and a board that tips harder.
 *
 * Kind like everything else: a marble down a hole comes back up at the last
 * door it went through, and a board that has taken four marbles is lifted
 * to the finish. Three boards is the round, fixed before the first roll.
 * There's no score: the stars come from how few marbles dropped.
 */

export const FIELD_WIDTH = 320;
export const FIELD_HEIGHT = 480;
/** The board's rim: this far in from the field's edge. */
export const EDGE = 10;
export const MARBLE = 11;
/** A marble whose middle is over a hole drops down it. */
export const HOLE = 15;
/** The finish ring. */
export const GOAL = 20;
export const BAR = 8;
export const BOARDS = 3;
/** Dropped this many times, a board is lifted to the finish. */
export const MOST_DROPS = 4;
/** How long a drop or a finish shows before play goes on. */
export const REST = 0.9;
/** The board tips no further than this: the fastest a marble rolls. */
export const MAX_SPEED = 320;
/** How quickly a rolling marble slows by itself, per second. */
const DRAG = 1.1;
/** Walls give back this much of the speed they're hit with. */
const BOUNCE = 0.45;
export const START_Y = FIELD_HEIGHT - 44;
export const GOAL_Y = 48;

export type Point = { readonly x: number; readonly y: number };
export type Rect = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

/** A wall right across the board, with one door in it. */
export type Bar = { readonly y: number; readonly door: number; readonly width: number };

export type Board = {
  readonly start: Point;
  readonly goal: Point;
  readonly bars: readonly Bar[];
  readonly holes: readonly Point[];
};

export type Marble = { readonly x: number; readonly y: number; readonly vx: number; readonly vy: number };

export type Phase = 'rolling' | 'dropped' | 'home';

export type MarbleMazeState = {
  readonly tilt: number;
  readonly boards: readonly Board[];
  readonly index: number;
  readonly marble: Marble;
  /** Where a finger is holding the board down, or null. */
  readonly finger: Point | null;
  readonly phase: Phase;
  readonly clock: number;
  /** Marbles dropped, board by board. */
  readonly drops: readonly number[];
  /** The last board was lifted to the finish, not rolled there. */
  readonly lifted: boolean;
  readonly complete: boolean;
};

type LevelSpec = {
  readonly bars: number;
  /** How wide each door is. */
  readonly door: number;
  readonly holes: number;
  /** The least room between the way through and a hole's edge. */
  readonly room: number;
  /** How hard the board tips: the marble's pick-up. */
  readonly tilt: number;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { bars: 2, door: 104, holes: 2, room: 40, tilt: 150 },
  { bars: 2, door: 92, holes: 3, room: 36, tilt: 170 },
  { bars: 3, door: 80, holes: 4, room: 32, tilt: 190 },
  { bars: 3, door: 70, holes: 6, room: 28, tilt: 215 },
  { bars: 4, door: 62, holes: 7, room: 25, tilt: 240 },
  { bars: 4, door: 54, holes: 9, room: 22, tilt: 265 },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

/** Just below and just above a door: a marble goes through straight. */
export const THROUGH = BAR / 2 + MARBLE + 6;

/** The way through a board a careful player follows: up to each door,
 *  straight through it, and on to the next, then the goal. */
export function route(board: Board): Point[] {
  const out: Point[] = [board.start];
  for (const bar of board.bars) {
    out.push({ x: bar.door, y: bar.y + THROUGH }, { x: bar.door, y: bar.y - THROUGH });
  }
  out.push(board.goal);
  return out;
}

function toSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length2 = dx * dx + dy * dy;
  const t = length2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length2)) : 0;
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}

/** How far a point is from the way through. */
export function offRoute(board: Board, p: Point): number {
  const way = route(board);
  let least = Infinity;
  for (let i = 1; i < way.length; i += 1) least = Math.min(least, toSegment(p, way[i - 1], way[i]));
  return least;
}

function makeBoard(rng: Rng, spec: LevelSpec): Board {
  const inner = { left: EDGE + 6, right: FIELD_WIDTH - EDGE - 6 };
  const mid = FIELD_WIDTH / 2;
  const between = (START_Y - GOAL_Y) / (spec.bars + 1);
  // Doors swap sides, wall by wall, so the way through zigzags.
  let side = rng() < 0.5 ? -1 : 1;
  const bars: Bar[] = [];
  for (let i = 0; i < spec.bars; i += 1) {
    const y = START_Y - between * (i + 1);
    const half = spec.door / 2;
    const door =
      side < 0 ? randInt(rng, Math.ceil(inner.left + half + 4), Math.floor(mid - 20)) : randInt(rng, Math.ceil(mid + 20), Math.floor(inner.right - half - 4));
    bars.push({ y, door, width: spec.door });
    side = -side;
  }
  const start = { x: bars[0].door < mid ? randInt(rng, mid + 20, inner.right - 40) : randInt(rng, inner.left + 40, mid - 20), y: START_Y };
  const last = bars[bars.length - 1];
  const goal = { x: last.door < mid ? randInt(rng, mid + 30, inner.right - 40) : randInt(rng, inner.left + 40, mid - 30), y: GOAL_Y };
  const board: Board = { start, goal, bars, holes: [] };

  // Holes near the way through, never on it: room enough to roll past.
  const holes: Point[] = [];
  for (let tries = 0; tries < 4000 && holes.length < spec.holes; tries += 1) {
    const p = { x: inner.left + HOLE + rng() * (inner.right - inner.left - HOLE * 2), y: GOAL_Y - 20 + rng() * (START_Y - GOAL_Y + 30) };
    const off = offRoute(board, p);
    if (off < HOLE + spec.room || off > HOLE + spec.room + 70) continue;
    if (p.y < EDGE + HOLE + 4 || p.y > FIELD_HEIGHT - EDGE - HOLE - 4) continue;
    if (bars.some((b) => Math.abs(p.y - b.y) < HOLE + BAR / 2 + 4)) continue;
    if (holes.some((h) => Math.hypot(h.x - p.x, h.y - p.y) < HOLE * 2 + 10)) continue;
    if (Math.hypot(p.x - start.x, p.y - start.y) < HOLE + spec.room + MARBLE || Math.hypot(p.x - goal.x, p.y - goal.y) < HOLE + GOAL + 10) continue;
    holes.push(p);
  }
  return { ...board, holes };
}

export function createGame(rng: Rng, level: number): MarbleMazeState {
  const spec = specForLevel(level);
  const boards = Array.from({ length: BOARDS }, () => makeBoard(rng, spec));
  return {
    tilt: spec.tilt,
    boards,
    index: 0,
    marble: { ...boards[0].start, vx: 0, vy: 0 },
    finger: null,
    phase: 'rolling',
    clock: 0,
    drops: [0],
    lifted: false,
    complete: false,
  };
}

export function boardNow(state: Pick<MarbleMazeState, 'boards' | 'index'>): Board {
  return state.boards[Math.min(state.index, state.boards.length - 1)];
}

/** A finger down (or moved) on the board, or lifted off it (null). */
export function press(state: MarbleMazeState, at: Point | null): MarbleMazeState {
  if (state.complete) return state;
  return { ...state, finger: at };
}

/** Every wall on a board, as rectangles: the rim, and each bar either side
 *  of its door. */
export function wallsOf(board: Board): Rect[] {
  const rim: Rect[] = [
    { x: 0, y: 0, w: FIELD_WIDTH, h: EDGE },
    { x: 0, y: FIELD_HEIGHT - EDGE, w: FIELD_WIDTH, h: EDGE },
    { x: 0, y: 0, w: EDGE, h: FIELD_HEIGHT },
    { x: FIELD_WIDTH - EDGE, y: 0, w: EDGE, h: FIELD_HEIGHT },
  ];
  const bars = board.bars.flatMap((b) => [
    { x: EDGE, y: b.y - BAR / 2, w: b.door - b.width / 2 - EDGE, h: BAR },
    { x: b.door + b.width / 2, y: b.y - BAR / 2, w: FIELD_WIDTH - EDGE - (b.door + b.width / 2), h: BAR },
  ]);
  return [...rim, ...bars];
}

/** Rolls the marble out of a wall it has run into. */
function bounceOff(m: Marble, r: Rect): Marble {
  const cx = Math.max(r.x, Math.min(m.x, r.x + r.w));
  const cy = Math.max(r.y, Math.min(m.y, r.y + r.h));
  let dx = m.x - cx;
  let dy = m.y - cy;
  let d = Math.hypot(dx, dy);
  if (d >= MARBLE) return m;
  if (d === 0) {
    const out = [m.x - r.x, r.x + r.w - m.x, m.y - r.y, r.y + r.h - m.y];
    const i = out.indexOf(Math.min(...out));
    [dx, dy] = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ][i];
  } else {
    dx /= d;
    dy /= d;
  }
  const push = MARBLE - d;
  const into = m.vx * dx + m.vy * dy;
  const vx = into < 0 ? m.vx - (1 + BOUNCE) * into * dx : m.vx;
  const vy = into < 0 ? m.vy - (1 + BOUNCE) * into * dy : m.vy;
  return { x: m.x + dx * push, y: m.y + dy * push, vx, vy };
}

/** Where a dropped marble comes back: just past the last door it went
 *  through, or the start. */
export function comeBackAt(board: Board, from: Point): Point {
  const passed = board.bars.filter((b) => from.y < b.y);
  if (!passed.length) return board.start;
  const bar = passed[passed.length - 1];
  return { x: bar.door, y: bar.y - THROUGH };
}

export function step(state: MarbleMazeState, seconds: number): MarbleMazeState {
  if (state.complete) return state;
  let next = state;
  let left = Math.min(seconds, 0.25);
  while (left > 0 && !next.complete) {
    const dt = Math.min(left, 1 / 240);
    next = tick(next, dt);
    left -= dt;
  }
  return next;
}

function tick(state: MarbleMazeState, dt: number): MarbleMazeState {
  const board = boardNow(state);
  if (state.phase !== 'rolling') {
    const clock = state.clock + dt;
    if (clock < REST) return { ...state, clock };
    if (state.phase === 'dropped') {
      const back = comeBackAt(board, state.marble);
      // A board that has taken enough marbles is lifted to the finish.
      if (state.drops[state.index] >= MOST_DROPS) return { ...state, clock: 0, phase: 'home', lifted: true, marble: { ...board.goal, vx: 0, vy: 0 } };
      // The finger must press again (or slide) to set it rolling: it never
      // rolls off on its own from where it comes back.
      return { ...state, clock: 0, phase: 'rolling', finger: null, marble: { ...back, vx: 0, vy: 0 } };
    }
    const index = state.index + 1;
    if (index >= state.boards.length) return { ...state, clock, complete: true };
    return { ...state, index, clock: 0, phase: 'rolling', finger: null, lifted: false, drops: [...state.drops, 0], marble: { ...state.boards[index].start, vx: 0, vy: 0 } };
  }

  const m = state.marble;
  let ax = 0;
  let ay = 0;
  if (state.finger) {
    // The board tips towards the finger — less so right under it, so the
    // marble settles there rather than rattling round.
    const dx = state.finger.x - m.x;
    const dy = state.finger.y - m.y;
    const d = Math.hypot(dx, dy);
    if (d > 0.5) {
      const pull = state.tilt * Math.min(1, d / 16);
      ax = (dx / d) * pull;
      ay = (dy / d) * pull;
    }
  }
  let vx = (m.vx + ax * dt) * (1 - DRAG * dt);
  let vy = (m.vy + ay * dt) * (1 - DRAG * dt);
  const speed = Math.hypot(vx, vy);
  if (speed > MAX_SPEED) {
    vx *= MAX_SPEED / speed;
    vy *= MAX_SPEED / speed;
  }
  let marble: Marble = { x: m.x + vx * dt, y: m.y + vy * dt, vx, vy };
  for (const wall of wallsOf(board)) marble = bounceOff(marble, wall);

  if (Math.hypot(marble.x - board.goal.x, marble.y - board.goal.y) < GOAL - MARBLE / 2) {
    return { ...state, marble: { ...board.goal, vx: 0, vy: 0 }, phase: 'home', clock: 0 };
  }
  if (board.holes.some((h) => Math.hypot(marble.x - h.x, marble.y - h.y) < HOLE)) {
    const drops = [...state.drops];
    drops[state.index] += 1;
    const hole = board.holes.find((h) => Math.hypot(marble.x - h.x, marble.y - h.y) < HOLE) as Point;
    return { ...state, marble: { ...hole, vx: 0, vy: 0 }, phase: 'dropped', clock: 0, drops };
  }
  return { ...state, marble };
}

export function totalDrops(state: Pick<MarbleMazeState, 'drops'>): number {
  return state.drops.reduce((a, b) => a + b, 0);
}

/** Every board with no drops is three stars; a couple, two; more, one. */
export function starsForDrops(drops: number): number {
  if (drops === 0) return 3;
  if (drops <= 2) return 2;
  return 1;
}
