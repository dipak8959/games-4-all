import { randInt, type Rng } from '../../util/random';

/**
 * Cloud Hopper.
 *
 * A round little hopper bounces on a cloud, and keeps bouncing — every cloud
 * is springy. Hold left or right to steer while it's in the air, and land on
 * the next cloud up. Clouds let it jump up through them from below and catch
 * it from above, so the way to the sun is up and up and up.
 *
 * It practises steering in mid-air: judging where a bounce will come down
 * and moving under it in time — and, later, waiting for a drifting cloud to
 * come round before jumping for it. It grows with the player: more clouds
 * between the ground and the sun, narrower clouds further apart, clouds that
 * drift, and clouds that puff away after one bounce.
 *
 * Kind like everything else: a miss is never the end. The hopper floats back
 * down onto the highest cloud it has reached, every cloud puffs back, and on
 * it goes. The round is over when it reaches the sun, which was fixed before
 * the first bounce. There's no score: the stars come from how few misses.
 */

export const FIELD_WIDTH = 320;
export const FIELD_HEIGHT = 480;
/** The hopper's radius. */
export const HOPPER = 13;
export const CLOUD_HEIGHT = 16;
/** How hard a cloud throws the hopper up, and how hard it falls. */
export const BOUNCE = 600;
export const GRAVITY = 900;
/** Sideways speed while a steering button is held. */
export const STEER = 180;
/** The highest a bounce goes: BOUNCE² / 2·GRAVITY. */
export const JUMP = (BOUNCE * BOUNCE) / (2 * GRAVITY);
/** The camera keeps the hopper this far above the bottom of the view. */
const CAMERA_LEAD = 220;
/** Below the view by this much, and the hopper has missed. */
const MISS_BELOW = 40;
/** The sun sits this far above the last cloud. */
const SUN_ABOVE = 0.55;

export type Cloud = {
  /** Height of the cloud's top above the ground, and where it rests across. */
  readonly y: number;
  readonly x: number;
  readonly width: number;
  /** A drifting cloud swings this far either side of `x`; 0 stays put. */
  readonly drift: number;
  readonly phase: number;
  /** Puffs away after one bounce (it comes back after a miss). */
  readonly puff: boolean;
};

export type Hopper = { readonly x: number; readonly y: number; readonly vy: number };

export type Steer = -1 | 0 | 1;

export type CloudHopperState = {
  readonly clouds: readonly Cloud[];
  /** Index of the top cloud: the sun's. Landing on it ends the round. */
  readonly sun: number;
  readonly hopper: Hopper;
  readonly steer: Steer;
  /** The highest cloud landed on, where a miss comes back to. */
  readonly best: number;
  /** Puff clouds bounced on, gone until the next miss. */
  readonly gone: readonly number[];
  /** Height of the bottom of the view. It rises with the hopper, and comes
   *  back down to the cloud it returns to after a miss. */
  readonly camera: number;
  readonly time: number;
  readonly misses: number;
  /** Bounces so far — the screen squashes the hopper on each. */
  readonly bounces: number;
  /** Seconds left of the "whoops" after a miss, for the screen. */
  readonly whoops: number;
  readonly started: boolean;
  readonly complete: boolean;
};

type LevelSpec = {
  readonly clouds: number;
  readonly width: number;
  /** How far up each cloud is, as a share of the highest bounce. */
  readonly gap: number;
  /** How far across, as a share of what a bounce can reach. */
  readonly spread: number;
  /** Share of clouds that drift from side to side. */
  readonly drifting: number;
  /** Share of clouds that puff away after one bounce. */
  readonly puffs: number;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { clouds: 12, width: 112, gap: 0.45, spread: 0.3, drifting: 0, puffs: 0 },
  { clouds: 14, width: 98, gap: 0.5, spread: 0.4, drifting: 0, puffs: 0 },
  { clouds: 16, width: 86, gap: 0.55, spread: 0.48, drifting: 0.25, puffs: 0 },
  { clouds: 18, width: 76, gap: 0.6, spread: 0.55, drifting: 0.35, puffs: 0.2 },
  { clouds: 20, width: 68, gap: 0.64, spread: 0.6, drifting: 0.45, puffs: 0.3 },
  { clouds: 22, width: 60, gap: 0.68, spread: 0.65, drifting: 0.5, puffs: 0.4 },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

/** How long a bounce takes to come down onto something `up` higher. */
export function airtime(up: number): number {
  const under = BOUNCE * BOUNCE - 2 * GRAVITY * up;
  return under < 0 ? NaN : (BOUNCE + Math.sqrt(under)) / GRAVITY;
}

/** How far across a bounce can carry the hopper onto something `up` higher. */
export function reach(up: number): number {
  return STEER * airtime(up);
}

/** How fast a drifting cloud swings, in radians a second. */
const DRIFT_SPEED = 1.1;

export function cloudX(cloud: Cloud, time: number): number {
  return cloud.drift ? cloud.x + cloud.drift * Math.sin(time * DRIFT_SPEED + cloud.phase) : cloud.x;
}

export function createGame(rng: Rng, level: number): CloudHopperState {
  const spec = specForLevel(level);
  const gap = spec.gap * JUMP;
  const across = spec.spread * reach(gap);
  const clouds: Cloud[] = [];
  // The ground cloud: wide, still, in the middle.
  clouds.push({ y: 0, x: FIELD_WIDTH / 2, width: FIELD_WIDTH - 40, drift: 0, phase: 0, puff: false });
  for (let i = 1; i < spec.clouds; i += 1) {
    const prev = clouds[i - 1];
    // Never a drifting cloud above a puff: waiting for it to come round
    // means bouncing in place, and a puff cloud can't be bounced on twice.
    const drifts = i > 1 && !prev.puff && rng() < spec.drifting;
    const drift = drifts ? 26 + rng() * 18 : 0;
    const half = spec.width / 2 + drift;
    const lo = half + 6;
    const hi = FIELD_WIDTH - half - 6;
    // Across by up to the level's spread, but never less than a little, so
    // every bounce is a steer.
    const side = rng() < 0.5 ? -1 : 1;
    const by = Math.max(24, rng() * across);
    let x = prev.x + side * by;
    if (x < lo || x > hi) x = prev.x - side * by;
    x = Math.max(lo, Math.min(hi, x));
    const y = prev.y + gap * (0.92 + rng() * 0.08);
    clouds.push({ y, x, width: spec.width, drift, phase: rng() * Math.PI * 2, puff: i > 1 && rng() < spec.puffs });
  }
  // The sun's cloud, at the top: still, and a little wider.
  const last = clouds[clouds.length - 1];
  const sunUp = gap * SUN_ABOVE + gap * 0.4;
  const sunX = Math.max(60, Math.min(FIELD_WIDTH - 60, last.x + (rng() < 0.5 ? -1 : 1) * randInt(rng, 20, 50)));
  clouds.push({ y: last.y + sunUp, x: sunX, width: Math.max(spec.width, 90), drift: 0, phase: 0, puff: false });
  return {
    clouds,
    sun: clouds.length - 1,
    hopper: { x: FIELD_WIDTH / 2, y: 0, vy: BOUNCE },
    steer: 0,
    best: 0,
    gone: [],
    camera: 0,
    time: 0,
    misses: 0,
    bounces: 0,
    whoops: 0,
    started: false,
    complete: false,
  };
}

/** A steering button held or let go. The first press starts the bouncing. */
export function setSteer(state: CloudHopperState, steer: Steer): CloudHopperState {
  if (state.complete) return state;
  if (state.steer === steer && state.started) return state;
  return { ...state, steer, started: state.started || steer !== 0 };
}

/** Just start bouncing, without steering. */
export function start(state: CloudHopperState): CloudHopperState {
  return state.started || state.complete ? state : { ...state, started: true };
}

export function step(state: CloudHopperState, seconds: number): CloudHopperState {
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

function tick(state: CloudHopperState, dt: number): CloudHopperState {
  const time = state.time + dt;
  const whoops = Math.max(0, state.whoops - dt);
  const h = state.hopper;
  let x = h.x + state.steer * STEER * dt;
  x = Math.max(HOPPER, Math.min(FIELD_WIDTH - HOPPER, x));
  const vy = h.vy - GRAVITY * dt;
  const y = h.y + vy * dt;

  // Coming down through the top of a cloud lands on it.
  if (vy < 0) {
    for (let i = 0; i < state.clouds.length; i += 1) {
      if (state.gone.includes(i)) continue;
      const c = state.clouds[i];
      if (h.y >= c.y && y <= c.y && Math.abs(x - cloudX(c, time)) <= c.width / 2 + HOPPER * 0.5) {
        if (i === state.sun) {
          return { ...state, hopper: { x, y: c.y, vy: 0 }, best: i, time, whoops, complete: true };
        }
        return {
          ...state,
          hopper: { x, y: c.y, vy: BOUNCE },
          best: Math.max(state.best, i),
          gone: c.puff ? [...state.gone, i] : state.gone,
          bounces: state.bounces + 1,
          camera: Math.max(state.camera, c.y - CAMERA_LEAD),
          time,
          whoops,
        };
      }
    }
  }

  const camera = Math.max(state.camera, y - CAMERA_LEAD);
  if (y < camera - MISS_BELOW) {
    // A miss: back onto the highest cloud reached, and every cloud back.
    const home = state.clouds[state.best];
    return {
      ...state,
      hopper: { x: cloudX(home, time), y: home.y, vy: BOUNCE },
      gone: [],
      camera: Math.min(camera, Math.max(0, home.y - 100)),
      time,
      misses: state.misses + 1,
      whoops: 1.2,
    };
  }
  return { ...state, hopper: { x, y, vy }, camera, time, whoops };
}

/** No misses is three stars; a couple, two; more, one. */
export function starsForMisses(misses: number): number {
  if (misses === 0) return 3;
  if (misses <= 2) return 2;
  return 1;
}

/** How far up the sky the hopper has got, 0-1, by clouds reached. */
export function progressOf(state: CloudHopperState): number {
  return state.complete ? 1 : state.best / state.sun;
}
