import { type Rng } from '../../util/random';

/**
 * Paper Plane.
 *
 * A paper dart flies on its own, always forward. Hold to lift its nose and
 * climb; let go and it glides down. Tall stacks of cloud stand across the
 * way, each with a gap of open sky: fly through the gaps, all the way to the
 * field at the end.
 *
 * It practises timing and control: starting to climb or to sink early
 * enough to be in the right place when the gap arrives, and holding a line
 * through it. It grows with the player: more stacks, smaller gaps, a faster
 * plane, gaps further up and down from each other and closer together, then
 * gaps that bob.
 *
 * Kind like everything else: a bump is only a bump — the plane wobbles and
 * pops through, and flies on. The course is fixed before take-off, and
 * landing on the field ends the round. There's no score: the stars come
 * from how few bumps.
 */

export const FIELD_WIDTH = 320;
export const FIELD_HEIGHT = 480;
/** The plane stays this far in from the left; the world scrolls past it. */
export const PLANE_X = 80;
export const PLANE_HALF_LENGTH = 16;
export const PLANE_HALF_HEIGHT = 7;
/** The top of the sky and the grass. */
export const SKY_TOP = 28;
export const GROUND_Y = 444;
export const STACK_WIDTH = 46;
export const GRAVITY = 420;
export const LIFT = 1000;
export const MAX_CLIMB = 280;
export const MAX_SINK = 300;
/** Where the first stack stands, and the field after the last. */
const FIRST = 380;
const RUN_IN = 280;
/** How fast a bobbing gap moves, in radians a second, and how far. */
const BOB_SPEED = 1.3;
const BOB = 26;

export type Stack = {
  /** Where it stands along the course, and the middle of its gap. */
  readonly x: number;
  readonly centre: number;
  readonly bob: number;
  readonly phase: number;
};

export type PaperPlaneState = {
  readonly gap: number;
  readonly speed: number;
  readonly stacks: readonly Stack[];
  /** How far the course runs: past the last stack, onto the field. */
  readonly length: number;
  /** How far the plane has flown. */
  readonly flown: number;
  readonly y: number;
  readonly vy: number;
  readonly holding: boolean;
  readonly time: number;
  readonly bumps: number;
  /** Seconds left of a bump's wobble. */
  readonly wobble: number;
  readonly started: boolean;
  readonly complete: boolean;
};

type LevelSpec = {
  readonly stacks: number;
  readonly gap: number;
  readonly speed: number;
  /** How far the gap moves up or down from one stack to the next, as a
   *  share of what the plane can climb or sink between them. */
  readonly swing: number;
  readonly spacing: number;
  /** Share of gaps that bob up and down. */
  readonly bobbing: number;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { stacks: 8, gap: 170, speed: 90, swing: 0.3, spacing: 230, bobbing: 0 },
  { stacks: 10, gap: 150, speed: 100, swing: 0.42, spacing: 215, bobbing: 0 },
  { stacks: 12, gap: 134, speed: 110, swing: 0.52, spacing: 200, bobbing: 0 },
  { stacks: 14, gap: 120, speed: 120, swing: 0.6, spacing: 190, bobbing: 0.25 },
  { stacks: 16, gap: 108, speed: 130, swing: 0.66, spacing: 180, bobbing: 0.4 },
  { stacks: 18, gap: 96, speed: 140, swing: 0.7, spacing: 170, bobbing: 0.5 },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

export function gapCentre(stack: Stack, time: number): number {
  return stack.bob ? stack.centre + stack.bob * Math.sin(time * BOB_SPEED + stack.phase) : stack.centre;
}

/**
 * How far the plane can sink and climb, from level flight, in the open sky
 * between two stacks — the most any gap may move from the one before.
 */
export function between(spec: Pick<LevelSpec, 'spacing' | 'speed'>): { readonly sink: number; readonly climb: number } {
  const t = (spec.spacing - STACK_WIDTH - PLANE_HALF_LENGTH * 2) / spec.speed;
  return { sink: 0.5 * GRAVITY * t * t, climb: 0.5 * (LIFT - GRAVITY) * t * t };
}

export function createGame(rng: Rng, level: number): PaperPlaneState {
  const spec = specForLevel(level);
  const room = between(spec);
  const stacks: Stack[] = [];
  const middle = (SKY_TOP + GROUND_Y) / 2;
  for (let i = 0; i < spec.stacks; i += 1) {
    const bob = rng() < spec.bobbing ? BOB : 0;
    // Room for the gap, and its bob, clear of the sky's top and the grass.
    const lo = SKY_TOP + spec.gap / 2 + bob + 12;
    const hi = GROUND_Y - spec.gap / 2 - bob - 12;
    const from = i === 0 ? middle : stacks[i - 1].centre;
    // Down by up to the level's share of a sink, or up by its share of a
    // climb — less any bob, which can add to the distance.
    const bobs = bob + (i === 0 ? 0 : stacks[i - 1].bob);
    const down = Math.max(0, spec.swing * room.sink - bobs);
    const up = Math.max(0, spec.swing * room.climb - bobs);
    const want = rng() < 0.5 ? from + rng() * down : from - rng() * up;
    const centre = Math.max(lo, Math.min(hi, want));
    stacks.push({ x: FIRST + i * spec.spacing, centre, bob, phase: rng() * Math.PI * 2 });
  }
  return {
    gap: spec.gap,
    speed: spec.speed,
    stacks,
    length: stacks[stacks.length - 1].x + RUN_IN,
    flown: 0,
    y: middle,
    vy: 0,
    holding: false,
    time: 0,
    bumps: 0,
    wobble: 0,
    started: false,
    complete: false,
  };
}

/** Holding to climb, or letting go to glide. The first press takes off. */
export function setHolding(state: PaperPlaneState, holding: boolean): PaperPlaneState {
  if (state.complete) return state;
  if (state.holding === holding && (state.started || !holding)) return state;
  return { ...state, holding, started: state.started || holding };
}

export function step(state: PaperPlaneState, seconds: number): PaperPlaneState {
  if (state.complete || !state.started) return state;
  let next = state;
  let left = Math.min(seconds, 0.25);
  while (left > 0 && !next.complete) {
    const dt = Math.min(left, 1 / 240);
    next = tick(next, dt);
    left -= dt;
  }
  return next;
}

/** The stack the plane is passing through right now, if any. */
export function stackAt(state: PaperPlaneState, flown: number = state.flown): Stack | undefined {
  return state.stacks.find((s) => Math.abs(s.x - flown) < STACK_WIDTH / 2 + PLANE_HALF_LENGTH);
}

function tick(state: PaperPlaneState, dt: number): PaperPlaneState {
  const time = state.time + dt;
  const flown = state.flown + state.speed * dt;
  if (flown >= state.length) return { ...state, flown: state.length, time, complete: true };
  // Wobbling through after a bump: level along the middle of the gap, until
  // it is clear of the stack.
  if (state.wobble > 0) {
    const wobble = Math.max(0, state.wobble - dt);
    const through = stackAt(state, flown);
    return { ...state, flown, y: through ? gapCentre(through, time) : state.y, vy: 0, time, wobble };
  }
  const ay = GRAVITY - (state.holding ? LIFT : 0);
  const vy = Math.max(-MAX_CLIMB, Math.min(MAX_SINK, state.vy + ay * dt));
  let y = state.y + vy * dt;
  let v = vy;
  // The top of the sky and the grass hold the plane in; neither is a bump.
  if (y < SKY_TOP + PLANE_HALF_HEIGHT) {
    y = SKY_TOP + PLANE_HALF_HEIGHT;
    v = Math.max(0, v);
  } else if (y > GROUND_Y - PLANE_HALF_HEIGHT) {
    y = GROUND_Y - PLANE_HALF_HEIGHT;
    v = Math.min(0, v);
  }
  const stack = stackAt(state, flown);
  if (stack) {
    const centre = gapCentre(stack, time);
    const top = centre - state.gap / 2;
    const bottom = centre + state.gap / 2;
    if (y - PLANE_HALF_HEIGHT < top || y + PLANE_HALF_HEIGHT > bottom) {
      // A bump: the plane pops into the gap and wobbles through.
      return { ...state, flown, y: centre, vy: 0, time, bumps: state.bumps + 1, wobble: wobbleFor(state) };
    }
  }
  return { ...state, flown, y, vy: v, time };
}

/** No bumps is three stars; a couple, two; more, one. */
export function starsForBumps(bumps: number): number {
  if (bumps === 0) return 3;
  if (bumps <= 2) return 2;
  return 1;
}

/** Long enough to carry a bumped plane clear of the stack it bumped. */
export function wobbleFor(state: Pick<PaperPlaneState, 'speed'>): number {
  return (STACK_WIDTH + PLANE_HALF_LENGTH * 2) / state.speed + 0.1;
}

/** Stacks flown past so far. */
export function passed(state: PaperPlaneState): number {
  return state.stacks.filter((s) => s.x + STACK_WIDTH / 2 + PLANE_HALF_LENGTH < state.flown).length;
}
