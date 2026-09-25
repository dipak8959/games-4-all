import { randInt, shuffle, type Rng } from '../../util/random';

/**
 * Puddle Hop.
 *
 * A small runner trots across the park towards a flag. Tap anywhere to hop
 * over what's in the way — stones, bushes, puddles. That is the whole game,
 * and it is the same one-button jumping everyone knows from the browser's
 * offline screen, rebuilt around this app's rules:
 *
 *   - It ends. The course is laid out before the run starts and finishes at
 *     a flag, twenty-odd seconds away (under twenty at the gentlest level). There is no "how far can you get",
 *     so there is no moment where stopping means losing your best run.
 *   - There is nothing to lose. Running into something is a stumble, not a
 *     game over: the runner tumbles, picks itself up and carries on. A bump
 *     costs a star at the end, like a wrong answer does anywhere else.
 *   - There is nothing to chase. No distance counter, no score, no best —
 *     and speed doesn't creep up during a run, so a round is never a race
 *     to see how long you can hold on.
 *
 * What's left is the part that is actually good for a child: judging when
 * something coming towards you arrives, and acting at the right moment.
 *
 * Everything here is pure — `step` advances the world by a slice of time —
 * so the physics and every guarantee above can be tested without a screen.
 * Units are the stage's own: the course is laid out in stage-widths of
 * `STAGE_WIDTH`, and the screen scales that to whatever the phone has.
 */

/** Logical width of the visible stage, and where on it the runner stands. */
export const STAGE_WIDTH = 320;
export const RUNNER_X = 56;
export const RUNNER_SIZE = 34;

/** Hop physics. A hop lasts about 0.6s and rises about four runner-heights
 *  — high enough to clear anything on the course with room to spare, so
 *  the skill is all in the timing, never in having to hold the button. */
export const GRAVITY = 2600;
export const HOP_SPEED = 820;
const AIRTIME = (2 * HOP_SPEED) / GRAVITY;

/** How long a stumble plays for, in seconds. */
export const STUMBLE_TIME = 0.6;

/** Stretches of empty ground at the start and before the flag. */
const RUNWAY = 460;
const RUN_OUT = 360;

export type ObstacleKind = 'stone' | 'bush' | 'puddle' | 'stones';

type ObstacleShape = { readonly width: number; readonly height: number };

/** Each kind is a different *shape*, so none of them is told apart by colour:
 *  a squat block, a tall block, a long flat pool, and a pair of blocks that
 *  needs one long hop rather than two short ones. */
export const OBSTACLE_SHAPES: Readonly<Record<ObstacleKind, ObstacleShape>> = {
  stone: { width: 26, height: 26 },
  bush: { width: 30, height: 46 },
  puddle: { width: 72, height: 6 },
  stones: { width: 70, height: 26 },
};

export type Obstacle = {
  readonly kind: ObstacleKind;
  /** Course position of the obstacle's left edge. */
  readonly x: number;
  readonly width: number;
  readonly height: number;
  /** Already bumped into — a stumble is counted once per obstacle. */
  readonly hit: boolean;
};

export type PuddleHopState = {
  readonly obstacles: readonly Obstacle[];
  /** Course position of the flag. The round ends when the runner reaches it. */
  readonly finish: number;
  /** How far the runner has come. */
  readonly distance: number;
  /** Course units per second — fixed for the whole run. */
  readonly speed: number;
  /** Height above the ground, and vertical speed. */
  readonly height: number;
  readonly rise: number;
  /** Nothing moves until the first tap: the child starts the run. */
  readonly started: boolean;
  /** Seconds of stumble left to play, 0 when running normally. */
  readonly stumbling: number;
  /** What the most recent stumble was into, for the screen to draw. */
  readonly lastBump: ObstacleKind | null;
  readonly bumps: number;
  readonly complete: boolean;
};

type LevelSpec = {
  readonly speed: number;
  readonly obstacles: number;
  readonly kinds: readonly ObstacleKind[];
  /** Gaps between obstacles, as a multiple of the ground covered in one hop.
   *  Tighter gaps leave less time to land and set up the next hop. */
  readonly gapMin: number;
  readonly gapMax: number;
};

/**
 * One entry per level, 1-6. Speed, how many things are in the way, how many
 * different things, and how little room there is between them all only ever
 * grow — so a promotion is always a harder run, and no two levels match.
 */
const LEVELS: readonly LevelSpec[] = [
  { speed: 170, obstacles: 7, kinds: ['stone'], gapMin: 2.2, gapMax: 3.6 },
  { speed: 190, obstacles: 9, kinds: ['stone', 'bush'], gapMin: 2.0, gapMax: 3.2 },
  { speed: 215, obstacles: 11, kinds: ['stone', 'bush', 'puddle'], gapMin: 1.8, gapMax: 2.9 },
  { speed: 240, obstacles: 13, kinds: ['stone', 'bush', 'puddle'], gapMin: 1.7, gapMax: 2.6 },
  { speed: 270, obstacles: 15, kinds: ['stone', 'bush', 'puddle', 'stones'], gapMin: 1.6, gapMax: 2.4 },
  { speed: 300, obstacles: 17, kinds: ['stone', 'bush', 'puddle', 'stones'], gapMin: 1.5, gapMax: 2.2 },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

/** Ground covered during one hop at this speed. */
export function hopReach(speed: number): number {
  return speed * AIRTIME;
}

/** Lays the course out before the run: every obstacle in place, the flag at
 *  the end. Nothing is added once the run has started. */
export function createGame(rng: Rng, level: number): PuddleHopState {
  const spec = specForLevel(level);
  const reach = hopReach(spec.speed);

  // Every kind the level allows turns up at least once, the rest at random,
  // so a new kind isn't something a child might go several rounds without
  // meeting.
  const kinds = shuffle(rng, [
    ...spec.kinds,
    ...Array.from({ length: spec.obstacles - spec.kinds.length }, () =>
      spec.kinds[randInt(rng, 0, spec.kinds.length - 1)],
    ),
  ]);

  const obstacles: Obstacle[] = [];
  let x = RUNWAY;
  for (const kind of kinds) {
    const { width, height } = OBSTACLE_SHAPES[kind];
    obstacles.push({ kind, x, width, height, hit: false });
    // The gap is measured from this obstacle's far edge, so a wide puddle
    // never eats into the room the next hop needs.
    const gap = reach * (spec.gapMin + rng() * (spec.gapMax - spec.gapMin));
    x += width + Math.round(gap);
  }

  return {
    obstacles,
    finish: x + RUN_OUT,
    distance: 0,
    speed: spec.speed,
    height: 0,
    rise: 0,
    started: false,
    stumbling: 0,
    lastBump: null,
    bumps: 0,
    complete: false,
  };
}

/**
 * A tap. The first one starts the run; after that, a tap while on the ground
 * hops. A tap in the air does nothing — there is no double jump to learn and
 * no way to float, so the only thing that matters is *when*.
 */
export function hop(state: PuddleHopState): PuddleHopState {
  if (state.complete) return state;
  if (!state.started) return { ...state, started: true };
  if (state.height > 0 || state.rise > 0) return state;
  return { ...state, rise: HOP_SPEED };
}

/** The runner's footprint on the course, trimmed a little on every side so
 *  a graze counts as a clear. A child who very nearly made it did. */
const FORGIVE = 6;

function touches(state: PuddleHopState, obstacle: Obstacle): boolean {
  const left = state.distance + RUNNER_X + FORGIVE;
  const right = state.distance + RUNNER_X + RUNNER_SIZE - FORGIVE;
  const overlapsAcross = left < obstacle.x + obstacle.width && right > obstacle.x;
  const low = state.height < obstacle.height - FORGIVE / 2;
  return overlapsAcross && low;
}

/** Advances the world by `seconds`. Big gaps between frames (a backgrounded
 *  tab, a slow phone) are cut into small steps so nothing is ever skipped
 *  over, and a hitch never teleports the runner past an obstacle. */
export function step(state: PuddleHopState, seconds: number): PuddleHopState {
  let next = state;
  let left = Math.min(seconds, 0.25);
  while (left > 0 && !next.complete) {
    const dt = Math.min(left, 1 / 120);
    next = tick(next, dt);
    left -= dt;
  }
  return next;
}

function tick(state: PuddleHopState, dt: number): PuddleHopState {
  if (!state.started || state.complete) return state;

  const distance = Math.min(state.finish, state.distance + state.speed * dt);
  let rise = state.rise - GRAVITY * dt;
  let height = state.height + state.rise * dt - 0.5 * GRAVITY * dt * dt;
  if (height <= 0) {
    height = 0;
    rise = 0;
  }

  let next: PuddleHopState = {
    ...state,
    distance,
    height,
    rise,
    stumbling: Math.max(0, state.stumbling - dt),
  };

  const bumped = next.obstacles.findIndex((o) => !o.hit && touches(next, o));
  if (bumped >= 0) {
    next = {
      ...next,
      obstacles: next.obstacles.map((o, i) => (i === bumped ? { ...o, hit: true } : o)),
      bumps: next.bumps + 1,
      stumbling: STUMBLE_TIME,
      lastBump: next.obstacles[bumped].kind,
    };
  }

  return distance >= state.finish ? { ...next, complete: true } : next;
}

/** How long a run takes, in seconds. A stumble doesn't slow the runner, so
 *  this is the same however the run goes. */
export function runTime(state: PuddleHopState): number {
  return state.finish / state.speed;
}
