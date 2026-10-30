import { randInt, type Rng } from '../../util/random';

/**
 * Orbit Hop.
 *
 * A satellite circles a little planet on one of three rings. Space rocks
 * come round the other way. Tap IN or OUT to hop a ring and slip past them,
 * and to reach the stars that turn up here and there on the rings.
 *
 * It practises timing and reading ahead: seeing where a rock and the
 * satellite will meet, and which ring is clear by then. It grows with the
 * player: more rocks, coming round faster.
 *
 * Kind like everything else: a rock only bumps the satellite's shield, and
 * a star left too long drifts onto the satellite's ring. Twelve stars is
 * the round, fixed before the first hop. There's no score: the stars at the
 * end come from how few bumps.
 */

export const FIELD_WIDTH = 320;
export const FIELD_HEIGHT = 480;
export const CENTRE = { x: FIELD_WIDTH / 2, y: FIELD_HEIGHT / 2 } as const;
export const RINGS = [62, 102, 142] as const;
export const SATELLITE = 11;
export const ROCK = 12;
export const STAR = 12;
export const STARS = 12;
/** The satellite goes round this fast, radians a second, anticlockwise. */
export const SPEED = 1.2;
/** After a bump, the shield holds for this long. */
export const SHIELD = 1.2;
/** A star not reached in this long drifts onto the satellite's ring. */
export const STAR_WAIT = 9;

export type Rock = { readonly ring: number; readonly angle: number };

export type OrbitHopState = {
  readonly rockSpeed: number;
  readonly ring: number;
  readonly angle: number;
  readonly rocks: readonly Rock[];
  readonly star: { readonly ring: number; readonly angle: number; readonly age: number };
  readonly collected: number;
  readonly bumps: number;
  readonly shield: number;
  readonly time: number;
  readonly complete: boolean;
};

type LevelSpec = {
  readonly rocks: number;
  /** How fast rocks come round the other way, radians a second. */
  readonly rockSpeed: number;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { rocks: 2, rockSpeed: 0.45 },
  { rocks: 3, rockSpeed: 0.5 },
  { rocks: 3, rockSpeed: 0.65 },
  { rocks: 4, rockSpeed: 0.7 },
  { rocks: 5, rockSpeed: 0.8 },
  { rocks: 6, rockSpeed: 0.9 },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

const TAU = Math.PI * 2;
const wrap = (a: number) => ((a % TAU) + TAU) % TAU;

/** How far apart two things on rings are, in field units — the straight
 *  line between them. */
export function gap(ringA: number, angleA: number, ringB: number, angleB: number): number {
  const [ra, rb] = [RINGS[ringA], RINGS[ringB]];
  return Math.hypot(ra * Math.cos(angleA) - rb * Math.cos(angleB), ra * Math.sin(angleA) - rb * Math.sin(angleB));
}

function placeStar(rng: Rng, ring: number, angle: number, rocks: readonly Rock[]): OrbitHopState['star'] {
  for (let tries = 0; tries < 40; tries += 1) {
    const r = randInt(rng, 0, RINGS.length - 1);
    const a = wrap(angle + Math.PI / 2 + rng() * Math.PI);
    if (rocks.every((k) => k.ring !== r || gap(r, a, k.ring, k.angle) > 60) && r !== ring) return { ring: r, angle: a, age: 0 };
  }
  return { ring: (ring + 1) % RINGS.length, angle: wrap(angle + Math.PI), age: 0 };
}

export function createGame(rng: Rng, level: number): OrbitHopState {
  const spec = specForLevel(level);
  const rocks: Rock[] = [];
  for (let i = 0; i < spec.rocks; i += 1) {
    // Spread round the rings, none starting near the satellite.
    const ring = i % RINGS.length;
    rocks.push({ ring, angle: wrap(Math.PI * 0.6 + (TAU * 0.8 * (i + rng() * 0.5)) / spec.rocks) });
  }
  return {
    rockSpeed: spec.rockSpeed,
    ring: 1,
    angle: 0,
    rocks,
    star: placeStar(rng, 1, 0, rocks),
    collected: 0,
    bumps: 0,
    shield: 0,
    time: 0,
    complete: false,
  };
}

/** A hop in (towards the planet) or out. */
export function hop(state: OrbitHopState, way: -1 | 1): OrbitHopState {
  if (state.complete) return state;
  const ring = Math.max(0, Math.min(RINGS.length - 1, state.ring + way));
  return ring === state.ring ? state : { ...state, ring };
}

export function step(state: OrbitHopState, seconds: number, rng: Rng): OrbitHopState {
  if (state.complete) return state;
  let next = state;
  let left = Math.min(seconds, 0.25);
  while (left > 0 && !next.complete) {
    const dt = Math.min(left, 1 / 120);
    next = tick(next, dt, rng);
    left -= dt;
  }
  return next;
}

function tick(state: OrbitHopState, dt: number, rng: Rng): OrbitHopState {
  const angle = wrap(state.angle + SPEED * dt);
  const rocks = state.rocks.map((r) => ({ ...r, angle: wrap(r.angle - state.rockSpeed * dt) }));
  let { bumps, collected, star } = state;
  let shield = Math.max(0, state.shield - dt);
  if (shield === 0 && rocks.some((r) => r.ring === state.ring && gap(r.ring, r.angle, state.ring, angle) < SATELLITE + ROCK)) {
    bumps += 1;
    shield = SHIELD;
  }
  star = { ...star, age: star.age + dt };
  if (star.ring === state.ring && gap(star.ring, star.angle, state.ring, angle) < SATELLITE + STAR) {
    collected += 1;
    if (collected >= STARS) return { ...state, angle, rocks, bumps, shield, collected, time: state.time + dt, complete: true };
    star = placeStar(rng, state.ring, angle, rocks);
  } else if (star.age > STAR_WAIT && star.ring !== state.ring) {
    // Left too long: it drifts onto the satellite's ring, ahead of it.
    star = { ring: state.ring, angle: wrap(angle + Math.PI * 0.75), age: 0 };
  }
  return { ...state, angle, rocks, star, bumps, shield, collected, time: state.time + dt };
}

/** Where something on a ring is on the field. */
export function position(ring: number, angle: number): { x: number; y: number } {
  return { x: CENTRE.x + RINGS[ring] * Math.cos(angle), y: CENTRE.y - RINGS[ring] * Math.sin(angle) };
}

/** No bumps is three stars; a couple, two; more, one. */
export function starsForBumps(bumps: number): number {
  if (bumps === 0) return 3;
  if (bumps <= 2) return 2;
  return 1;
}
