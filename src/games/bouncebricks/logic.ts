import { randInt, type Rng } from '../../util/random';

/**
 * Bounce Bricks.
 *
 * A wall of bricks at the top, a paddle at the bottom and a ball between.
 * Slide the paddle under the ball to bounce it back up; every brick it hits
 * breaks. Clear the wall — or play five balls — and the round is over.
 *
 * Where the ball comes off the paddle depends on where it lands on it: the
 * middle sends it straight up, the ends send it off at an angle. So past the
 * first levels it isn't only catching, it's aiming — at the last few bricks.
 *
 * It grows the way these games always have: a smaller paddle, a quicker
 * ball, a bigger wall, and from level 4 bricks that take two hits.
 *
 * The round has a fixed end: five balls at most, fewer if the wall comes
 * down first. A ball that falls past the paddle just means the next one is
 * served, from the paddle, when the player taps. There is no score: the
 * stars come from how much of the wall came down.
 */

export const FIELD_WIDTH = 320;
export const FIELD_HEIGHT = 480;
export const PADDLE_Y = 440;
export const PADDLE_HEIGHT = 12;
export const BALL_RADIUS = 7;
export const BALLS_PER_ROUND = 5;

const BRICK_TOP = 50;
const BRICK_HEIGHT = 18;
const BRICK_GAP = 4;
const SIDE = 10;
/** The steepest a ball leaves the paddle, off its very end. */
const MAX_ANGLE = (60 * Math.PI) / 180;

export type Brick = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** Hits still needed to break it. */
  readonly hits: number;
};

export type Ball = { readonly x: number; readonly y: number; readonly vx: number; readonly vy: number };

export type BounceBricksState = {
  readonly paddleX: number;
  readonly paddleW: number;
  readonly speed: number;
  readonly ball: Ball;
  /** On the paddle, waiting for a tap to serve. */
  readonly resting: boolean;
  readonly bricks: readonly Brick[];
  readonly total: number;
  readonly ballsLeft: number;
  /** Varies the spin off the paddle, bounce to bounce (see `tick`). */
  readonly spin: number;
  /** Paddle bounces since the ball last hit a brick. */
  readonly idle: number;
  readonly complete: boolean;
};

type LevelSpec = {
  readonly paddleW: number;
  readonly speed: number;
  readonly rows: number;
  readonly cols: number;
  /** Share of bricks that take two hits. */
  readonly tough: number;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { paddleW: 110, speed: 200, rows: 2, cols: 5, tough: 0 },
  { paddleW: 96, speed: 230, rows: 3, cols: 6, tough: 0 },
  { paddleW: 84, speed: 260, rows: 4, cols: 6, tough: 0 },
  { paddleW: 74, speed: 290, rows: 4, cols: 7, tough: 0.15 },
  { paddleW: 66, speed: 320, rows: 5, cols: 7, tough: 0.25 },
  { paddleW: 58, speed: 350, rows: 5, cols: 8, tough: 0.35 },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

const onPaddle = (paddleX: number): Ball => ({
  x: paddleX,
  y: PADDLE_Y - BALL_RADIUS - 1,
  vx: 0,
  vy: 0,
});

export function createGame(rng: Rng, level: number): BounceBricksState {
  const spec = specForLevel(level);
  const w = (FIELD_WIDTH - SIDE * 2 - (spec.cols - 1) * BRICK_GAP) / spec.cols;
  const bricks: Brick[] = [];
  for (let r = 0; r < spec.rows; r += 1) {
    for (let c = 0; c < spec.cols; c += 1) {
      bricks.push({
        x: SIDE + c * (w + BRICK_GAP),
        y: BRICK_TOP + r * (BRICK_HEIGHT + BRICK_GAP),
        w,
        h: BRICK_HEIGHT,
        hits: rng() < spec.tough ? 2 : 1,
      });
    }
  }
  const paddleX = FIELD_WIDTH / 2;
  return {
    paddleX,
    paddleW: spec.paddleW,
    speed: spec.speed,
    ball: onPaddle(paddleX),
    resting: true,
    bricks,
    total: bricks.length,
    ballsLeft: BALLS_PER_ROUND,
    spin: randInt(rng, 1, 1000),
    idle: 0,
    complete: false,
  };
}

/** The paddle follows the finger, kept inside the field. */
export function movePaddle(state: BounceBricksState, x: number): BounceBricksState {
  if (state.complete) return state;
  const half = state.paddleW / 2;
  const paddleX = Math.max(half, Math.min(FIELD_WIDTH - half, x));
  return state.resting ? { ...state, paddleX, ball: onPaddle(paddleX) } : { ...state, paddleX };
}

/** A tap while the ball rests on the paddle sends it up, a little to one
 *  side so it never goes straight back and forth. */
export function serve(state: BounceBricksState, rng: Rng): BounceBricksState {
  if (!state.resting || state.complete) return state;
  const angle = ((randInt(rng, 0, 1) === 0 ? -1 : 1) * (15 + randInt(rng, 0, 15)) * Math.PI) / 180;
  return {
    ...state,
    resting: false,
    ball: { ...state.ball, vx: state.speed * Math.sin(angle), vy: -state.speed * Math.cos(angle) },
  };
}

export function step(state: BounceBricksState, seconds: number): BounceBricksState {
  let next = state;
  let left = Math.min(seconds, 0.25);
  while (left > 0 && !next.complete) {
    const dt = Math.min(left, 1 / 240);
    next = tick(next, dt);
    left -= dt;
  }
  return next;
}

function tick(state: BounceBricksState, dt: number): BounceBricksState {
  if (state.resting || state.complete) return state;
  const r = BALL_RADIUS;
  const prev = state.ball;
  let { vx, vy } = prev;
  let x = prev.x + vx * dt;
  let y = prev.y + vy * dt;

  if (x < r) {
    x = r;
    vx = Math.abs(vx);
  } else if (x > FIELD_WIDTH - r) {
    x = FIELD_WIDTH - r;
    vx = -Math.abs(vx);
  }
  if (y < r) {
    y = r;
    vy = Math.abs(vy);
  }

  // Off the paddle: the further from the middle, the steeper the angle —
  // plus a little spin that changes every bounce, and grows each bounce the
  // ball goes without hitting a brick. A ball caught dead centre every time
  // would otherwise go straight up and down for ever, over the same column,
  // and the round would never end; with it, the ball works its way across
  // the wall even for a player who never aims.
  const half = state.paddleW / 2;
  let spin = state.spin;
  let idle = state.idle;
  if (vy > 0 && prev.y + r <= PADDLE_Y && y + r >= PADDLE_Y && Math.abs(x - state.paddleX) <= half + r) {
    spin = (spin * 1103 + 12345) % 1000;
    idle += 1;
    const size = 4 + (spin % 7) + Math.min(30, Math.max(0, idle - 1) * 8);
    const nudge = (((spin % 2 === 0 ? 1 : -1) * size) * Math.PI) / 180;
    const offset = Math.max(-1, Math.min(1, (x - state.paddleX) / half));
    const angle = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, offset * MAX_ANGLE + nudge));
    vx = state.speed * Math.sin(angle);
    vy = -state.speed * Math.cos(angle);
    y = PADDLE_Y - r;
  }

  // One brick at a time: the first the ball overlaps breaks (or cracks), and
  // the ball turns back off the side it hit.
  let bricks = state.bricks;
  const hit = bricks.findIndex((b) => {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    return (x - cx) ** 2 + (y - cy) ** 2 < r * r;
  });
  if (hit >= 0) {
    const b = bricks[hit];
    const fromSide = prev.x < b.x || prev.x > b.x + b.w;
    if (fromSide) vx = -vx;
    else vy = -vy;
    bricks = b.hits > 1 ? bricks.map((o, i) => (i === hit ? { ...o, hits: o.hits - 1 } : o)) : bricks.filter((_, i) => i !== hit);
    idle = 0;
  }

  // Past the paddle: that ball's done; the next rests on the paddle.
  if (y - r > FIELD_HEIGHT) {
    const ballsLeft = state.ballsLeft - 1;
    return {
      ...state,
      bricks,
      ballsLeft,
      resting: ballsLeft > 0,
      ball: onPaddle(state.paddleX),
      spin,
      idle: 0,
      complete: ballsLeft === 0,
    };
  }

  return { ...state, bricks, spin, idle, ball: { x, y, vx, vy }, complete: bricks.length === 0 };
}

/** How much of the wall came down. Clearing it with a ball or less lost is
 *  three stars; most of it, two; anything, one. */
export function starsForWall(state: BounceBricksState): number {
  const cleared = (state.total - state.bricks.length) / state.total;
  const lost = BALLS_PER_ROUND - state.ballsLeft;
  if (state.bricks.length === 0 && lost <= 1) return 3;
  if (cleared >= 0.6) return 2;
  return 1;
}
