import { randInt, type Rng } from '../../util/random';

/**
 * Mini Golf.
 *
 * A garden course seen from above: six holes, each with a tee, a cup and a
 * flag. Pull back from the ball — the further, the harder — and let go to
 * putt. The ball rolls, slows, and bounces off walls; roll it over the cup
 * gently enough and in it drops. Too fast and it rolls on over.
 *
 * It practises angles and strength: which way to hit, including off a wall,
 * and how hard, so the ball stops where it's meant to. It grows with the
 * player: straight open holes first, then a wall with a gap, a dogleg, a
 * sweeping bar to time, water with a bridge, and a cup tucked in a pocket —
 * with a smaller cup and a faster green at every level.
 *
 * Kind like everything else: water just puts the ball back where it was hit
 * from, and a hole that takes eight putts is picked up and done. Six holes
 * is the round, fixed before the first putt. There's no score to beat: the
 * stars come from putts against the par of the holes.
 */

export const FIELD_WIDTH = 320;
export const FIELD_HEIGHT = 480;
export const BALL = 6;
/** The course's edge: walls all round, this far in from the field's. */
export const EDGE = 10;
export const HOLES_PER_ROUND = 6;
/** The most putts on a hole; after that it is picked up. */
export const MOST_PUTTS = 8;
/** Faster than this over the cup and the ball rolls on. */
export const CAPTURE = 300;
export const MAX_SPEED = 520;
/** A pull this long is the hardest putt; shorter is gentler. */
export const MAX_PULL = 140;
export const MIN_PULL = 10;
/** Walls give back this much of the speed they're hit with. */
const BOUNCE = 0.8;
/** How long a holed ball or a splash shows before play moves on. */
export const REST = 1.1;

export type Point = { readonly x: number; readonly y: number };
export type Rect = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

export type HoleKind = 'open' | 'gap' | 'dogleg' | 'sweeper' | 'water' | 'pocket';
/** Easier to harder: the order they arrive in, level by level. */
export const KINDS: readonly HoleKind[] = ['open', 'gap', 'dogleg', 'sweeper', 'water', 'pocket'];

export type Sweeper = {
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** The bar slides between these, back and forth. */
  readonly from: number;
  readonly to: number;
  readonly speed: number;
};

export type Hole = {
  readonly kind: HoleKind;
  readonly tee: Point;
  readonly cup: Point;
  readonly walls: readonly Rect[];
  readonly water: readonly Rect[];
  readonly sweeper: Sweeper | null;
  /** A way round the hole a careful player can follow: stop at each point
   *  in turn, the last being the cup. It sets the par. */
  readonly route: readonly Point[];
  readonly par: number;
};

export type Ball = { readonly x: number; readonly y: number; readonly vx: number; readonly vy: number };

export type Phase = 'aiming' | 'rolling' | 'holed' | 'splash';

export type MiniGolfState = {
  readonly cup: number;
  readonly friction: number;
  readonly holes: readonly Hole[];
  readonly index: number;
  readonly ball: Ball;
  /** Where the last putt was hit from — where water sends the ball back. */
  readonly lie: Point;
  readonly phase: Phase;
  /** Putts on each hole so far. */
  readonly putts: readonly number[];
  /** Seconds into the round: the sweeper moves with it. */
  readonly time: number;
  readonly clock: number;
  /** A hole picked up after its last putt, for the screen to say so. */
  readonly pickedUp: boolean;
  readonly complete: boolean;
};

type LevelSpec = {
  /** The cup's radius. */
  readonly cup: number;
  /** How fast the green slows the ball: less is a faster green. */
  readonly friction: number;
  /** The hardest kind of hole this level has; holes are drawn from it and
   *  the two below it. */
  readonly hardest: number;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { cup: 16, friction: 230, hardest: 0 },
  { cup: 15, friction: 215, hardest: 1 },
  { cup: 14, friction: 200, hardest: 2 },
  { cup: 13, friction: 185, hardest: 3 },
  { cup: 12, friction: 170, hardest: 4 },
  { cup: 11, friction: 155, hardest: 5 },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

const TEE: Point = { x: FIELD_WIDTH / 2, y: FIELD_HEIGHT - 60 };

function makeHole(rng: Rng, kind: HoleKind): Hole {
  const blank = { walls: [] as Rect[], water: [] as Rect[], sweeper: null as Sweeper | null };
  switch (kind) {
    case 'open': {
      const cup = { x: randInt(rng, 70, 250), y: randInt(rng, 80, 130) };
      return { kind, tee: TEE, cup, ...blank, route: [cup], par: 2 };
    }
    case 'gap': {
      // A wall across the middle, with a gap at one side.
      const left = rng() < 0.5;
      const gapW = 92;
      const y = 232;
      const wall = left ? { x: EDGE + gapW, y, w: FIELD_WIDTH - 2 * EDGE - gapW, h: 16 } : { x: EDGE, y, w: FIELD_WIDTH - 2 * EDGE - gapW, h: 16 };
      const through = { x: left ? EDGE + gapW / 2 : FIELD_WIDTH - EDGE - gapW / 2, y: y + 8 };
      const cup = { x: left ? randInt(rng, 170, 250) : randInt(rng, 70, 150), y: randInt(rng, 80, 120) };
      return { kind, tee: TEE, cup, ...blank, walls: [wall], route: [through, cup], par: 3 };
    }
    case 'dogleg': {
      // A wall down from the top: the cup is behind it, round the corner.
      const cupLeft = rng() < 0.5;
      const wall = { x: FIELD_WIDTH / 2 - 8, y: EDGE, w: 16, h: 290 };
      const tee = { x: cupLeft ? 240 : 80, y: FIELD_HEIGHT - 60 };
      const corner = { x: cupLeft ? 100 : 220, y: 350 };
      const cup = { x: cupLeft ? randInt(rng, 60, 110) : randInt(rng, 210, 260), y: randInt(rng, 80, 130) };
      return { kind, tee, cup, ...blank, walls: [wall], route: [corner, cup], par: 3 };
    }
    case 'sweeper': {
      // A bar sliding back and forth across the way: time the putt.
      const cup = { x: randInt(rng, 120, 200), y: randInt(rng, 80, 120) };
      const sweeper = { y: 256, w: 84, h: 14, from: EDGE + 42, to: FIELD_WIDTH - EDGE - 42, speed: randInt(rng, 60, 85) };
      return { kind, tee: TEE, cup, ...blank, sweeper, route: [cup], par: 2 };
    }
    case 'water': {
      // A pond across the middle, and a bridge over it.
      const bridge = randInt(rng, 70, 250);
      const half = 34;
      const y = 216;
      const h = 60;
      const water = [
        { x: EDGE, y, w: bridge - half - EDGE, h },
        { x: bridge + half, y, w: FIELD_WIDTH - EDGE - bridge - half, h },
      ];
      const before = { x: bridge, y: y + h + 36 };
      const cup = { x: Math.max(60, Math.min(260, bridge + randInt(rng, -18, 18))), y: randInt(rng, 80, 120) };
      return { kind, tee: TEE, cup, ...blank, water, route: [before, cup], par: 3 };
    }
    case 'pocket':
    default: {
      // The cup in a little walled pocket, open on one side.
      const cup = { x: randInt(rng, 110, 210), y: randInt(rng, 110, 140) };
      const open = (['down', 'left', 'right'] as const)[randInt(rng, 0, 2)];
      const r = 30;
      const t = 8;
      const top = { x: cup.x - r, y: cup.y - r, w: r * 2, h: t };
      const bottom = { x: cup.x - r, y: cup.y + r - t, w: r * 2, h: t };
      const leftWall = { x: cup.x - r, y: cup.y - r, w: t, h: r * 2 };
      const rightWall = { x: cup.x + r - t, y: cup.y - r, w: t, h: r * 2 };
      const walls = open === 'down' ? [top, leftWall, rightWall] : open === 'left' ? [top, bottom, rightWall] : [top, bottom, leftWall];
      const mouth =
        open === 'down' ? { x: cup.x, y: cup.y + r + 50 } : open === 'left' ? { x: cup.x - r - 50, y: cup.y } : { x: cup.x + r + 50, y: cup.y };
      return { kind, tee: TEE, cup, ...blank, walls, route: [mouth, cup], par: 3 };
    }
  }
}

export function createGame(rng: Rng, level: number): MiniGolfState {
  const spec = specForLevel(level);
  const lowest = Math.max(0, spec.hardest - 2);
  const holes: Hole[] = [];
  for (let i = 0; i < HOLES_PER_ROUND; i += 1) {
    // The hardest kind at least twice; the rest from the two below it.
    const kind = i % 3 === 2 ? KINDS[spec.hardest] : KINDS[randInt(rng, lowest, spec.hardest)];
    holes.push(makeHole(rng, kind));
  }
  return atTee({
    cup: spec.cup,
    friction: spec.friction,
    holes,
    index: 0,
    ball: { x: 0, y: 0, vx: 0, vy: 0 },
    lie: holes[0].tee,
    phase: 'aiming',
    putts: [0],
    time: 0,
    clock: 0,
    pickedUp: false,
    complete: false,
  });
}

function atTee(state: MiniGolfState): MiniGolfState {
  const { tee } = state.holes[state.index];
  return { ...state, ball: { x: tee.x, y: tee.y, vx: 0, vy: 0 }, lie: tee, phase: 'aiming', clock: 0, pickedUp: false };
}

export function holeNow(state: MiniGolfState): Hole {
  return state.holes[Math.min(state.index, state.holes.length - 1)];
}

/** Where the sweeper bar is at a moment: sliding at its speed, bouncing
 *  between its ends. */
export function sweeperX(sweeper: Sweeper, time: number): number {
  const span = sweeper.to - sweeper.from;
  const run = (time * sweeper.speed) % (span * 2);
  return sweeper.from + (run < span ? run : span * 2 - run);
}

export function sweeperRect(sweeper: Sweeper, time: number): Rect {
  const x = sweeperX(sweeper, time);
  return { x: x - sweeper.w / 2, y: sweeper.y - sweeper.h / 2, w: sweeper.w, h: sweeper.h };
}

/** How hard a pull of this length hits the ball. */
export function speedForPull(pull: number): number {
  return (Math.min(pull, MAX_PULL) / MAX_PULL) * MAX_SPEED;
}

/** The pull that would roll the ball `distance` and stop: the inverse of
 *  the green's slowing, for the help line and for tests. */
export function speedToRoll(state: Pick<MiniGolfState, 'friction'>, distance: number): number {
  return Math.sqrt(2 * state.friction * Math.max(0, distance));
}

/** A putt: this hard, this way (radians; 0 is right, down is positive). */
export function putt(state: MiniGolfState, angle: number, speed: number): MiniGolfState {
  if (state.complete || state.phase !== 'aiming') return state;
  const v = Math.min(MAX_SPEED, Math.max(0, speed));
  if (v <= 0) return state;
  const putts = [...state.putts];
  putts[state.index] = (putts[state.index] ?? 0) + 1;
  return {
    ...state,
    ball: { ...state.ball, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v },
    lie: { x: state.ball.x, y: state.ball.y },
    phase: 'rolling',
    putts,
  };
}

/** A putt from a pull back from the ball: it goes the opposite way. */
export function puttFromPull(state: MiniGolfState, pullX: number, pullY: number): MiniGolfState {
  const pull = Math.hypot(pullX, pullY);
  if (pull < MIN_PULL) return state;
  return putt(state, Math.atan2(-pullY, -pullX), speedForPull(pull));
}

export function step(state: MiniGolfState, seconds: number): MiniGolfState {
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

function inside(p: Point, r: Rect): boolean {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

/** Bounces the ball off a wall it has rolled into. */
function bounceOff(ball: Ball, r: Rect): Ball {
  const cx = Math.max(r.x, Math.min(ball.x, r.x + r.w));
  const cy = Math.max(r.y, Math.min(ball.y, r.y + r.h));
  let dx = ball.x - cx;
  let dy = ball.y - cy;
  let d = Math.hypot(dx, dy);
  if (d >= BALL) return ball;
  if (d === 0) {
    // The centre inside the wall: out the nearest side.
    const out = [ball.x - r.x, r.x + r.w - ball.x, ball.y - r.y, r.y + r.h - ball.y];
    const i = out.indexOf(Math.min(...out));
    [dx, dy] = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ][i];
    d = 0;
  } else {
    dx /= d;
    dy /= d;
  }
  const push = BALL - d;
  const into = ball.vx * dx + ball.vy * dy;
  const vx = into < 0 ? ball.vx - (1 + BOUNCE) * into * dx : ball.vx;
  const vy = into < 0 ? ball.vy - (1 + BOUNCE) * into * dy : ball.vy;
  return { x: ball.x + dx * push, y: ball.y + dy * push, vx, vy };
}

const COURSE: readonly Rect[] = [
  { x: 0, y: 0, w: FIELD_WIDTH, h: EDGE },
  { x: 0, y: FIELD_HEIGHT - EDGE, w: FIELD_WIDTH, h: EDGE },
  { x: 0, y: 0, w: EDGE, h: FIELD_HEIGHT },
  { x: FIELD_WIDTH - EDGE, y: 0, w: EDGE, h: FIELD_HEIGHT },
];

function tick(state: MiniGolfState, dt: number): MiniGolfState {
  const time = state.time + dt;
  if (state.phase === 'aiming') return { ...state, time };
  if (state.phase === 'holed' || state.phase === 'splash') {
    const clock = state.clock + dt;
    if (clock < REST) return { ...state, time, clock };
    if (state.phase === 'splash') {
      const back = { x: state.lie.x, y: state.lie.y, vx: 0, vy: 0 };
      // Water on the last putt allowed: picked up, like any other.
      if (state.putts[state.index] >= MOST_PUTTS) return { ...state, time, clock: 0, ball: back, phase: 'holed', pickedUp: true };
      return { ...state, time, clock: 0, phase: 'aiming', ball: back };
    }
    const index = state.index + 1;
    if (index >= state.holes.length) return { ...state, time, clock, complete: true };
    return atTee({ ...state, time, index, putts: [...state.putts, 0] });
  }

  const hole = holeNow(state);
  const b = state.ball;
  const speed = Math.hypot(b.vx, b.vy);
  const slowed = Math.max(0, speed - state.friction * dt);
  const k = speed > 0 ? slowed / speed : 0;
  let ball: Ball = { x: b.x + b.vx * dt, y: b.y + b.vy * dt, vx: b.vx * k, vy: b.vy * k };
  for (const wall of [...COURSE, ...hole.walls]) ball = bounceOff(ball, wall);
  if (hole.sweeper) ball = bounceOff(ball, sweeperRect(hole.sweeper, time));

  // Over the cup, slowly enough: in.
  if (Math.hypot(ball.x - hole.cup.x, ball.y - hole.cup.y) < state.cup && Math.hypot(ball.vx, ball.vy) < CAPTURE) {
    return { ...state, time, ball: { x: hole.cup.x, y: hole.cup.y, vx: 0, vy: 0 }, phase: 'holed', clock: 0 };
  }
  // Into the water: a splash, and back to where it was hit from.
  if (hole.water.some((w) => inside(ball, w))) {
    return { ...state, time, ball, phase: 'splash', clock: 0 };
  }
  if (Math.hypot(ball.vx, ball.vy) < 3) {
    const stopped = { ...ball, vx: 0, vy: 0 };
    // The last putt allowed, and not in: picked up, and on to the next.
    if (state.putts[state.index] >= MOST_PUTTS) {
      return { ...state, time, ball: stopped, phase: 'holed', clock: 0, pickedUp: true };
    }
    return { ...state, time, ball: stopped, phase: 'aiming' };
  }
  return { ...state, time, ball };
}

export function parFor(state: Pick<MiniGolfState, 'holes'>): number {
  return state.holes.reduce((sum, h) => sum + h.par, 0);
}

/** Level par or under, three stars; up to four over, two; more, one. */
export function starsForRound(state: Pick<MiniGolfState, 'holes' | 'putts'>): number {
  const over = state.putts.reduce((a, b) => a + b, 0) - parFor(state);
  if (over <= 0) return 3;
  if (over <= 4) return 2;
  return 1;
}
