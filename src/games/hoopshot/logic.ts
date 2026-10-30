import type { Rng } from '../../util/random';

/**
 * Hoop Shot.
 *
 * A ball, a hoop on a post, and ten throws. Pull back from the ball and let
 * go: the further you pull, the harder it flies, and the way you pull sets
 * how high. Through the hoop is a little cheer; anything else, the ball
 * just comes back for the next throw.
 *
 * It practises judging angle and strength — picking the curve that drops a
 * ball into something — and then allowing for the wind. It grows with the
 * player: the hoop gets narrower, the dotted guide that shows the throw gets
 * shorter, the hoop stands somewhere new each throw, then the wind blows,
 * then the hoop sways.
 *
 * Ten throws and the round is over, however they went. There's no score:
 * the stars come from how many went in.
 */

export const FIELD_WIDTH = 320;
export const FIELD_HEIGHT = 480;
export const GROUND_Y = 440;
export const BALL_RADIUS = 11;
export const THROWS_PER_ROUND = 10;
/** Where the ball sits before a throw. */
export const HAND = { x: 56, y: 392 } as const;
/** Pulled this far or more is the hardest throw. */
export const MAX_PULL = 110;
/** Pulled less than this and let go: not a throw, just a slip of the finger. */
export const MIN_PULL = 14;
export const RIM_EDGE = 4;
export const BOARD_WIDTH = 6;
export const BOARD_HEIGHT = 84;

const GRAVITY = 900;
const MAX_SPEED = 860;
/** A throw lasts at most this long, even one balanced on the rim. */
const MAX_FLIGHT = 5;
/** How long the result shows before the ball comes back. */
export const REST = 0.9;
const SWAY_PERIOD = 3.2;

export type Hoop = {
  /** Middle of the rim. */
  readonly x: number;
  readonly y: number;
  /** Sideways push on the ball, in field units a second, a second. */
  readonly wind: number;
};

export type Ball = { readonly x: number; readonly y: number; readonly vx: number; readonly vy: number };

export type Phase = 'ready' | 'flying' | 'landed';

export type HoopShotState = {
  readonly rim: number;
  /** Seconds of the throw the dotted guide shows. */
  readonly guide: number;
  /** How far the hoop sways either side. */
  readonly sway: number;
  /** Where the hoop stands for each throw, fixed before the round starts. */
  readonly hoops: readonly Hoop[];
  readonly throwIndex: number;
  readonly phase: Phase;
  /** The pull, from the ball back towards the finger, while aiming. */
  readonly pull: { readonly dx: number; readonly dy: number } | null;
  readonly ball: Ball;
  /** Seconds into this throw's flight, or its rest. */
  readonly clock: number;
  /** Seconds since the round began, for the sway. */
  readonly time: number;
  readonly scored: boolean;
  /** Throws that went in, by index. */
  readonly made: readonly number[];
  readonly complete: boolean;
};

type LevelSpec = {
  /** Width of the opening between the rim's two edges. */
  readonly rim: number;
  readonly guide: number;
  /** How far the hoop's spot can move between throws. */
  readonly spread: number;
  /** The strongest the wind blows. */
  readonly wind: number;
  readonly sway: number;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { rim: 110, guide: 1.5, spread: 0, wind: 0, sway: 0 },
  { rim: 96, guide: 0.8, spread: 36, wind: 0, sway: 0 },
  { rim: 84, guide: 0.5, spread: 56, wind: 0, sway: 0 },
  { rim: 74, guide: 0.32, spread: 70, wind: 70, sway: 0 },
  { rim: 66, guide: 0.2, spread: 76, wind: 100, sway: 18 },
  { rim: 58, guide: 0.12, spread: 80, wind: 130, sway: 30 },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

const HOME_X = 244;
const HOME_Y = 272;

export function createGame(rng: Rng, level: number): HoopShotState {
  const spec = specForLevel(level);
  const hoops: Hoop[] = Array.from({ length: THROWS_PER_ROUND }, (_, i) => {
    // The first throw is always at the home spot, still air — the idea
    // before the twist.
    if (i === 0) return { x: HOME_X, y: HOME_Y, wind: 0 };
    const wind = spec.wind ? (rng() < 0.5 ? -1 : 1) * spec.wind * (0.4 + rng() * 0.6) : 0;
    return {
      x: HOME_X - rng() * spec.spread,
      y: HOME_Y + (rng() - 0.5) * spec.spread * 0.9,
      wind,
    };
  });
  return {
    rim: spec.rim,
    guide: spec.guide,
    sway: spec.sway,
    hoops,
    throwIndex: 0,
    phase: 'ready',
    pull: null,
    ball: { ...HAND, vx: 0, vy: 0 },
    clock: 0,
    time: 0,
    scored: false,
    made: [],
    complete: false,
  };
}

/** The hoop right now: its spot for this throw, swaying if the level says. */
export function hoopNow(state: HoopShotState): Hoop {
  const spot = state.hoops[Math.min(state.throwIndex, state.hoops.length - 1)];
  if (!state.sway) return spot;
  return { ...spot, x: spot.x + state.sway * Math.sin((2 * Math.PI * state.time) / SWAY_PERIOD) };
}

export function rimEdges(state: HoopShotState, hoop: Hoop = hoopNow(state)) {
  // The opening is between the edges' insides.
  const half = state.rim / 2 + RIM_EDGE;
  return { left: hoop.x - half, right: hoop.x + half, y: hoop.y };
}

export function board(state: HoopShotState, hoop: Hoop = hoopNow(state)) {
  const { right, y } = rimEdges(state, hoop);
  return { x: right + RIM_EDGE, top: y - BOARD_HEIGHT + 14, bottom: y + 14 };
}

/** The pull kept to a sensible throw: forwards and upwards, never more than
 *  the hardest. `null` for a pull too small to count. */
function clampPull(dx: number, dy: number): { dx: number; dy: number } | null {
  const length = Math.hypot(dx, dy);
  if (length < MIN_PULL) return null;
  // Up is negative y. Between just above flat and nearly straight up.
  let angle = Math.atan2(-dy, dx);
  angle = Math.max((12 * Math.PI) / 180, Math.min((88 * Math.PI) / 180, angle));
  const size = Math.min(MAX_PULL, length);
  return { dx: size * Math.cos(angle), dy: -size * Math.sin(angle) };
}

/** The finger has moved: `dx, dy` is from the finger to where it first
 *  touched, so pulling down and left throws up and right. */
export function aim(state: HoopShotState, dx: number, dy: number): HoopShotState {
  if (state.phase !== 'ready' || state.complete) return state;
  return { ...state, pull: clampPull(dx, dy) };
}

export function cancelAim(state: HoopShotState): HoopShotState {
  return state.pull ? { ...state, pull: null } : state;
}

export function launchVelocity(pull: { dx: number; dy: number }): { vx: number; vy: number } {
  const k = MAX_SPEED / MAX_PULL;
  return { vx: pull.dx * k, vy: pull.dy * k };
}

/** Let go. A proper pull throws; a slip of the finger does nothing. */
export function release(state: HoopShotState): HoopShotState {
  if (state.phase !== 'ready' || state.complete || !state.pull) return state;
  return {
    ...state,
    phase: 'flying',
    ball: { ...HAND, ...launchVelocity(state.pull) },
    pull: null,
    clock: 0,
    scored: false,
  };
}

/** Where a throw would go with this pull, in still air, sampled for the
 *  dotted guide — as far as the level shows it. */
export function guideDots(state: HoopShotState, pull = state.pull): { x: number; y: number }[] {
  if (!pull) return [];
  const { vx, vy } = launchVelocity(pull);
  const dots: { x: number; y: number }[] = [];
  for (let t = 0.06; t <= state.guide + 1e-9; t += 0.06) {
    const y = HAND.y + vy * t + 0.5 * GRAVITY * t * t;
    if (y > GROUND_Y) break;
    dots.push({ x: HAND.x + vx * t, y });
  }
  return dots;
}

export function step(state: HoopShotState, seconds: number): HoopShotState {
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

/** Bounce the ball off a point (a rim edge), losing a little speed. */
function offPoint(ball: Ball, px: number, py: number, reach: number): Ball {
  const dx = ball.x - px;
  const dy = ball.y - py;
  const d = Math.hypot(dx, dy);
  if (d >= reach || d === 0) return ball;
  const nx = dx / d;
  const ny = dy / d;
  const along = ball.vx * nx + ball.vy * ny;
  if (along >= 0) return { ...ball, x: px + nx * reach, y: py + ny * reach };
  const bounce = 1.6;
  return {
    x: px + nx * reach,
    y: py + ny * reach,
    vx: ball.vx - bounce * along * nx,
    vy: ball.vy - bounce * along * ny,
  };
}

function tick(state: HoopShotState, dt: number): HoopShotState {
  const time = state.time + dt;
  if (state.phase === 'ready') return { ...state, time };

  if (state.phase === 'landed') {
    const clock = state.clock + dt;
    if (clock < REST) return { ...state, time, clock };
    const throwIndex = state.throwIndex + 1;
    if (throwIndex >= THROWS_PER_ROUND) return { ...state, time, clock, complete: true };
    return {
      ...state,
      time,
      throwIndex,
      phase: 'ready',
      ball: { ...HAND, vx: 0, vy: 0 },
      clock: 0,
      scored: false,
    };
  }

  // Flying.
  const hoop = hoopNow({ ...state, time });
  const prev = state.ball;
  const vx0 = prev.vx + hoop.wind * dt;
  const vy0 = prev.vy + GRAVITY * dt;
  let ball: Ball = { x: prev.x + vx0 * dt, y: prev.y + vy0 * dt, vx: vx0, vy: vy0 };

  const edges = rimEdges(state, hoop);
  const reach = BALL_RADIUS + RIM_EDGE;
  ball = offPoint(ball, edges.left, edges.y, reach);
  ball = offPoint(ball, edges.right, edges.y, reach);

  // The backboard: a tall thin block the ball bounces back off.
  const b = board(state, hoop);
  const cx = Math.max(b.x, Math.min(ball.x, b.x + BOARD_WIDTH));
  const cy = Math.max(b.top, Math.min(ball.y, b.bottom));
  const ddx = ball.x - cx;
  const ddy = ball.y - cy;
  if (ddx * ddx + ddy * ddy < BALL_RADIUS * BALL_RADIUS) {
    if (cy > b.top && cy < b.bottom) {
      // Off the face or the back.
      const face = prev.x < b.x;
      ball = { ...ball, x: face ? b.x - BALL_RADIUS : b.x + BOARD_WIDTH + BALL_RADIUS, vx: -ball.vx * 0.6 };
    } else {
      // Off the top or bottom end.
      const top = cy <= b.top;
      ball = { ...ball, y: top ? b.top - BALL_RADIUS : b.bottom + BALL_RADIUS, vy: -ball.vy * 0.6 };
    }
  }

  // Up into the hoop from underneath: the net stops it, and it drops back.
  const inside = ball.x > edges.left && ball.x < edges.right;
  if (prev.y > edges.y && ball.y <= edges.y && ball.vy < 0 && inside) {
    ball = { ...ball, y: edges.y + 1, vy: -ball.vy * 0.3 };
  }

  // In: the middle of the ball drops down through the opening.
  const through = prev.y < edges.y && ball.y >= edges.y && ball.vy > 0 && inside;
  const scored = state.scored || through;

  const clock = state.clock + dt;
  const down = ball.y + BALL_RADIUS >= GROUND_Y;
  const gone = ball.x < -BALL_RADIUS * 2 || ball.x > FIELD_WIDTH + BALL_RADIUS * 2;
  if (down || gone || clock >= MAX_FLIGHT) {
    return {
      ...state,
      time,
      phase: 'landed',
      clock: 0,
      ball: down ? { ...ball, y: GROUND_Y - BALL_RADIUS, vx: 0, vy: 0 } : ball,
      scored,
      made: scored ? [...state.made, state.throwIndex] : state.made,
    };
  }
  return { ...state, time, clock, ball, scored };
}

/** Seven or more in is three stars; four or more, two; any throw, one. */
export function starsForThrows(state: HoopShotState): number {
  if (state.made.length >= 7) return 3;
  if (state.made.length >= 4) return 2;
  return 1;
}
