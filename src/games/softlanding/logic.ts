import { randInt, type Rng } from '../../util/random';

/**
 * Soft Landing.
 *
 * A little rocket drops towards the ground. Hold the button to fire its
 * engine and slow it down; let go and it falls faster. Bring it down gently
 * on the striped pad. From level 3 the pad is off to one side and two more
 * buttons nudge the rocket left and right.
 *
 * It practises controlling speed: using just enough push, early enough —
 * braking before it's too late, and not so hard it floats away. That's the
 * same feel for "how fast is this going, and how long to stop" that riding a
 * bike downhill needs. It grows with the player: stronger gravity, a gentler
 * landing needed, a smaller pad, a longer way across, hills, wind, and less
 * fuel.
 *
 * Kind like everything else: a bumpy landing is just a bump — the rocket
 * stands there, and the next one comes down. Three descents and the round is
 * over. There's no score: the stars come from how many landed softly.
 */

export const FIELD_WIDTH = 320;
export const FIELD_HEIGHT = 480;
export const DESCENTS_PER_ROUND = 3;
/** Half the rocket's width, foot to foot. */
export const HALF_WIDTH = 14;
/** The rocket, from its feet to the top of its nose. */
export const ROCKET_HEIGHT = 46;
export const START_Y = 80;
/** The ground with no hills, and the top of the pad on it. */
export const BASE_Y = 440;
export const PAD_Y = BASE_Y - 8;
/** The ground is drawn and felt as columns this wide. */
export const COLUMN = 8;
export const COLUMNS = FIELD_WIDTH / COLUMN;
/** Highest the rocket can climb: its nose at the top of the field. */
const CEILING = ROCKET_HEIGHT + 4;
/** How long the result shows before the next rocket. */
export const REST = 1.4;
/** The engine pushes this many times harder than gravity pulls. */
const LIFT = 2.2;
const SIDE_PUSH = 50;
/** The rocket starts off drifting down, not standing still. */
const START_DRIFT = 18;

export type Landing = 'soft' | 'bumpy' | 'off';

export type Descent = {
  readonly startX: number;
  readonly padX: number;
  readonly wind: number;
  /** Top of the ground in each column, pad included. */
  readonly ground: readonly number[];
};

export type Rocket = { readonly x: number; readonly y: number; readonly vx: number; readonly vy: number };

export type Engines = { readonly up: boolean; readonly left: boolean; readonly right: boolean };

export type Phase = 'waiting' | 'flying' | 'landed';

export type SoftLandingState = {
  readonly gravity: number;
  readonly safeV: number;
  readonly safeH: number;
  readonly padW: number;
  /** Side engines — from level 3. */
  readonly sideways: boolean;
  readonly fuelFull: number;
  readonly descents: readonly Descent[];
  readonly index: number;
  readonly phase: Phase;
  readonly rocket: Rocket;
  readonly engines: Engines;
  /** Seconds of engine left, this descent. */
  readonly fuel: number;
  readonly clock: number;
  readonly landings: readonly Landing[];
  readonly complete: boolean;
};

type LevelSpec = {
  readonly gravity: number;
  /** The fastest down the rocket can be going and still land softly. */
  readonly safeV: number;
  /** The fastest sideways. */
  readonly safeH: number;
  readonly padW: number;
  /** How far across from the pad the rocket starts. */
  readonly offset: number;
  /** How high the hills rise. */
  readonly hills: number;
  readonly wind: number;
  /** Seconds of engine for a descent. */
  readonly fuel: number;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { gravity: 40, safeV: 42, safeH: 30, padW: 110, offset: 0, hills: 0, wind: 0, fuel: 14 },
  { gravity: 46, safeV: 38, safeH: 28, padW: 96, offset: 0, hills: 0, wind: 0, fuel: 12 },
  { gravity: 52, safeV: 34, safeH: 26, padW: 84, offset: 70, hills: 0, wind: 0, fuel: 12 },
  { gravity: 58, safeV: 31, safeH: 24, padW: 74, offset: 90, hills: 24, wind: 0, fuel: 11 },
  { gravity: 64, safeV: 28, safeH: 22, padW: 66, offset: 110, hills: 40, wind: 10, fuel: 10 },
  { gravity: 70, safeV: 25, safeH: 20, padW: 58, offset: 130, hills: 56, wind: 16, fuel: 9 },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

function makeDescent(rng: Rng, spec: LevelSpec, first: boolean): Descent {
  const margin = 10;
  const padX =
    first && spec.offset === 0
      ? FIELD_WIDTH / 2
      : randInt(rng, Math.ceil(spec.padW / 2 + margin), Math.floor(FIELD_WIDTH - spec.padW / 2 - margin));
  // Start across from the pad by the level's distance, on whichever side
  // has the room.
  let startX = padX;
  if (spec.offset) {
    const lo = HALF_WIDTH + 16;
    const hi = FIELD_WIDTH - HALF_WIDTH - 16;
    const left = padX - spec.offset;
    const right = padX + spec.offset;
    const options = [left, right].filter((x) => x >= lo && x <= hi);
    startX = options.length
      ? options[randInt(rng, 0, options.length - 1)]
      : padX - spec.offset < lo
        ? hi
        : lo;
  }
  // Hills: a height every five columns, sloping between, and flat under the
  // pad.
  const knots = Array.from({ length: COLUMNS / 5 + 1 }, () => rng() * spec.hills);
  const ground = Array.from({ length: COLUMNS }, (_, c) => {
    const mid = c * COLUMN + COLUMN / 2;
    if (Math.abs(mid - padX) <= spec.padW / 2 + COLUMN) return PAD_Y;
    const at = c / 5;
    const i = Math.floor(at);
    const h = knots[i] + (knots[Math.min(i + 1, knots.length - 1)] - knots[i]) * (at - i);
    return BASE_Y - Math.round(h / 2) * 2;
  });
  const wind = spec.wind ? (rng() < 0.5 ? -1 : 1) * spec.wind : 0;
  return { startX, padX, wind, ground };
}

function atTop(descent: Descent): Rocket {
  return { x: descent.startX, y: START_Y, vx: 0, vy: 0 };
}

const OFF: Engines = { up: false, left: false, right: false };

export function createGame(rng: Rng, level: number): SoftLandingState {
  const spec = specForLevel(level);
  const descents = Array.from({ length: DESCENTS_PER_ROUND }, (_, i) => makeDescent(rng, spec, i === 0));
  return {
    gravity: spec.gravity,
    safeV: spec.safeV,
    safeH: spec.safeH,
    padW: spec.padW,
    sideways: spec.offset > 0 || spec.wind > 0,
    fuelFull: spec.fuel,
    descents,
    index: 0,
    phase: 'waiting',
    rocket: atTop(descents[0]),
    engines: OFF,
    fuel: spec.fuel,
    clock: 0,
    landings: [],
    complete: false,
  };
}

export function descentNow(state: SoftLandingState): Descent {
  return state.descents[Math.min(state.index, state.descents.length - 1)];
}

/** An engine button pressed or let go. The first press drops the rocket. */
export function setEngine(state: SoftLandingState, engine: keyof Engines, on: boolean): SoftLandingState {
  if (state.complete || state.phase === 'landed') return state;
  if ((engine === 'left' || engine === 'right') && !state.sideways) return state;
  if (state.engines[engine] === on && !(on && state.phase === 'waiting')) return state;
  const engines = { ...state.engines, [engine]: on };
  if (state.phase === 'waiting') {
    if (!on) return { ...state, engines };
    return { ...state, engines, phase: 'flying', rocket: { ...state.rocket, vy: START_DRIFT } };
  }
  return { ...state, engines };
}

/** The highest ground anywhere under the rocket. */
export function groundUnder(descent: Descent, x: number): number {
  const from = Math.max(0, Math.floor((x - HALF_WIDTH) / COLUMN));
  const to = Math.min(COLUMNS - 1, Math.floor((x + HALF_WIDTH - 1e-6) / COLUMN));
  let top = Infinity;
  for (let c = from; c <= to; c += 1) top = Math.min(top, descent.ground[c]);
  return top;
}

export function onPad(state: SoftLandingState, x: number, descent: Descent = descentNow(state)): boolean {
  return x - HALF_WIDTH >= descent.padX - state.padW / 2 && x + HALF_WIDTH <= descent.padX + state.padW / 2;
}

export function step(state: SoftLandingState, seconds: number): SoftLandingState {
  if (state.complete || state.phase === 'waiting') return state;
  let next = state;
  let left = Math.min(seconds, 0.25);
  while (left > 0 && !next.complete && next.phase !== 'waiting') {
    const dt = Math.min(left, 1 / 240);
    next = tick(next, dt);
    left -= dt;
  }
  return next;
}

function tick(state: SoftLandingState, dt: number): SoftLandingState {
  if (state.phase === 'landed') {
    const clock = state.clock + dt;
    if (clock < REST) return { ...state, clock };
    const index = state.index + 1;
    if (index >= DESCENTS_PER_ROUND) return { ...state, clock, complete: true };
    return {
      ...state,
      index,
      phase: 'waiting',
      rocket: atTop(state.descents[index]),
      engines: OFF,
      fuel: state.fuelFull,
      clock: 0,
    };
  }

  const descent = descentNow(state);
  const burning = state.fuel > 0;
  const up = burning && state.engines.up;
  const side = burning && state.sideways ? (state.engines.right ? 1 : 0) - (state.engines.left ? 1 : 0) : 0;
  const ay = state.gravity - (up ? state.gravity * LIFT : 0);
  const ax = descent.wind + side * SIDE_PUSH;
  const used = (up ? dt : 0) + (side !== 0 ? dt * 0.5 : 0);
  const fuel = Math.max(0, state.fuel - used);

  const r = state.rocket;
  let vx = r.vx + ax * dt;
  let vy = r.vy + ay * dt;
  let x = r.x + vx * dt;
  let y = r.y + vy * dt;
  // The sides of the sky, and its top, stop the rocket rather than lose it.
  if (x < HALF_WIDTH) {
    x = HALF_WIDTH;
    vx = Math.max(0, vx);
  } else if (x > FIELD_WIDTH - HALF_WIDTH) {
    x = FIELD_WIDTH - HALF_WIDTH;
    vx = Math.min(0, vx);
  }
  if (y < CEILING) {
    y = CEILING;
    vy = Math.max(0, vy);
  }

  const clock = state.clock + dt;
  const floor = groundUnder(descent, x);
  if (y >= floor) {
    const gentle = vy <= state.safeV && Math.abs(vx) <= state.safeH;
    const landing: Landing = !onPad(state, x, descent) ? 'off' : gentle ? 'soft' : 'bumpy';
    return {
      ...state,
      phase: 'landed',
      rocket: { x, y: floor, vx, vy },
      engines: OFF,
      fuel,
      clock: 0,
      landings: [...state.landings, landing],
    };
  }
  return { ...state, rocket: { x, y, vx, vy }, fuel, clock };
}

/** All three soft is three stars; two, two; anything, one. */
export function starsForLandings(state: SoftLandingState): number {
  const soft = state.landings.filter((l) => l === 'soft').length;
  if (soft >= 3) return 3;
  if (soft === 2) return 2;
  return 1;
}
