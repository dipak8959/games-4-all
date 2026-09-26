import { randInt, type Rng } from '../../util/random';

/**
 * Deep Sea Fishing.
 *
 * A little boat bobs in the middle of the sea, and fish swim past below it,
 * each at its own depth. A bubble at the top shows the fish to catch. Tap to
 * drop the line: the hook goes straight down and catches the first fish it
 * touches. So the trick is when — past the fish nearer the top, and onto
 * the one that's wanted as it swims under the boat.
 *
 * It practises timing and matching: knowing the fish by its pattern and its
 * tail, and dropping the line at the right moment. It grows with the player:
 * more depths, more fish at each, faster fish, and more kinds to tell apart.
 *
 * Kind like everything else: the wrong fish is let go again, gently, and the
 * line can go down as often as you like. Eight fish is the round, fixed
 * before the first cast. There's no score: the stars come from how few went
 * back.
 */

export const FIELD_WIDTH = 320;
export const FIELD_HEIGHT = 480;
export const BOAT_X = FIELD_WIDTH / 2;
export const SURFACE = 76;
export const BOTTOM = 452;
export const FISH_HALF_LENGTH = 22;
export const FISH_HALF_HEIGHT = 12;
export const CATCHES = 8;
export const DROP = 320;
export const RISE = 380;
/** How long "got it" or "not this one" shows. */
export const SHOW = 0.9;
const TOP_LANE = 150;
const BOTTOM_LANE = 424;

export type Pattern = 'stripes' | 'spots' | 'plain';
export type Tail = 'round' | 'pointed';
export type Kind = { readonly pattern: Pattern; readonly tail: Tail };

/** In the order they join the sea, level by level: each new one is told
 *  apart from the ones before by pattern, tail, or both. */
export const KINDS: readonly Kind[] = [
  { pattern: 'stripes', tail: 'pointed' },
  { pattern: 'plain', tail: 'round' },
  { pattern: 'spots', tail: 'pointed' },
  { pattern: 'stripes', tail: 'round' },
  { pattern: 'plain', tail: 'pointed' },
  { pattern: 'spots', tail: 'round' },
];

export type Fish = {
  readonly id: number;
  readonly lane: number;
  readonly x: number;
  /** Which of KINDS. */
  readonly kind: number;
};

export type Hook = {
  readonly y: number;
  readonly going: 'down' | 'up' | null;
  readonly carrying: Fish | null;
};

export type DeepSeaState = {
  readonly lanes: number;
  /** Each depth's speed and way (+1 right, -1 left). */
  readonly laneSpeed: readonly number[];
  readonly kinds: number;
  readonly fish: readonly Fish[];
  readonly hook: Hook;
  /** Which of KINDS is wanted now. */
  readonly wanted: number;
  readonly catches: number;
  readonly slips: number;
  readonly said: 'got' | 'back' | null;
  readonly saidFor: number;
  readonly nextId: number;
  readonly time: number;
  readonly complete: boolean;
};

type LevelSpec = {
  readonly lanes: number;
  readonly perLane: number;
  readonly speed: number;
  readonly kinds: number;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { lanes: 2, perLane: 1, speed: 40, kinds: 2 },
  { lanes: 3, perLane: 1, speed: 48, kinds: 3 },
  { lanes: 3, perLane: 2, speed: 56, kinds: 4 },
  { lanes: 4, perLane: 2, speed: 64, kinds: 5 },
  { lanes: 4, perLane: 3, speed: 72, kinds: 6 },
  { lanes: 5, perLane: 3, speed: 80, kinds: 6 },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

/** Where a depth's fish swim. */
export function laneY(state: Pick<DeepSeaState, 'lanes'>, lane: number): number {
  if (state.lanes === 1) return (TOP_LANE + BOTTOM_LANE) / 2;
  return TOP_LANE + ((BOTTOM_LANE - TOP_LANE) * lane) / (state.lanes - 1);
}

/** The swim is a loop a little wider than the sea, so fish come back round. */
const LOOP = FIELD_WIDTH + FISH_HALF_LENGTH * 4;

export function createGame(rng: Rng, level: number): DeepSeaState {
  const spec = specForLevel(level);
  const laneSpeed = Array.from({ length: spec.lanes }, (_, i) => (i % 2 ? -1 : 1) * spec.speed * (0.85 + rng() * 0.3));
  const fish: Fish[] = [];
  let id = 0;
  for (let lane = 0; lane < spec.lanes; lane += 1) {
    const start = rng() * LOOP;
    for (let n = 0; n < spec.perLane; n += 1) {
      fish.push({ id, lane, x: ((start + (n * LOOP) / spec.perLane) % LOOP) - FISH_HALF_LENGTH * 2, kind: randInt(rng, 0, spec.kinds - 1) });
      id += 1;
    }
  }
  const state: DeepSeaState = {
    lanes: spec.lanes,
    laneSpeed,
    kinds: spec.kinds,
    fish,
    hook: { y: SURFACE, going: null, carrying: null },
    wanted: 0,
    catches: 0,
    slips: 0,
    said: null,
    saidFor: 0,
    nextId: id,
    time: 0,
    complete: false,
  };
  return chooseWanted(state, rng);
}

/** Wants a kind that is swimming now — making sure one is. */
function chooseWanted(state: DeepSeaState, rng: Rng): DeepSeaState {
  const wanted = randInt(rng, 0, state.kinds - 1);
  if (state.fish.some((f) => f.kind === wanted)) return { ...state, wanted };
  // None of that kind about: the next fish along turns into one.
  const change = state.fish[randInt(rng, 0, state.fish.length - 1)];
  return { ...state, wanted, fish: state.fish.map((f) => (f.id === change.id ? { ...f, kind: wanted } : f)) };
}

/** Drops the line, if it's up. */
export function cast(state: DeepSeaState): DeepSeaState {
  if (state.complete || state.hook.going) return state;
  return { ...state, hook: { y: SURFACE, going: 'down', carrying: null } };
}

export function step(state: DeepSeaState, seconds: number, rng: Rng): DeepSeaState {
  if (state.complete) return state;
  let next = state;
  let left = Math.min(seconds, 0.25);
  while (left > 0 && !next.complete) {
    const dt = Math.min(left, 1 / 240);
    next = tick(next, dt, rng);
    left -= dt;
  }
  return next;
}

function swim(x: number, speed: number, dt: number): number {
  let v = x + speed * dt;
  const lo = -FISH_HALF_LENGTH * 2;
  if (v > lo + LOOP) v -= LOOP;
  if (v < lo) v += LOOP;
  return v;
}

function tick(state: DeepSeaState, dt: number, rng: Rng): DeepSeaState {
  const time = state.time + dt;
  const saidFor = Math.max(0, state.saidFor - dt);
  const said = saidFor > 0 ? state.said : null;
  const fish = state.fish.map((f) => ({ ...f, x: swim(f.x, state.laneSpeed[f.lane], dt) }));
  let hook = state.hook;
  let next: DeepSeaState = { ...state, fish, time, said, saidFor };

  if (hook.going === 'down') {
    const y = hook.y + DROP * dt;
    // The first fish the hook touches on the way down.
    const bite = fish.find((f) => Math.abs(f.x - BOAT_X) < FISH_HALF_LENGTH && Math.abs(laneY(state, f.lane) - y) < FISH_HALF_HEIGHT);
    if (bite) {
      hook = { y: laneY(state, bite.lane), going: 'up', carrying: bite };
      next = { ...next, fish: fish.filter((f) => f.id !== bite.id), hook };
    } else if (y >= BOTTOM) {
      next = { ...next, hook: { y: BOTTOM, going: 'up', carrying: null } };
    } else {
      next = { ...next, hook: { ...hook, y } };
    }
    return next;
  }

  if (hook.going === 'up') {
    const y = hook.y - RISE * dt;
    if (y > SURFACE) return { ...next, hook: { ...hook, y } };
    const up: Hook = { y: SURFACE, going: null, carrying: null };
    const caught = hook.carrying;
    if (!caught) return { ...next, hook: up };
    // Back into the sea: the fish caught, or one like it, swims in again
    // from the far side, so the sea never runs short.
    const back = (kind: number): Fish => ({
      id: next.nextId,
      lane: caught.lane,
      x: state.laneSpeed[caught.lane] > 0 ? -FISH_HALF_LENGTH * 2 : LOOP - FISH_HALF_LENGTH * 2 - 1,
      kind,
    });
    if (caught.kind === state.wanted) {
      const catches = state.catches + 1;
      const done = { ...next, hook: up, catches, said: 'got' as const, saidFor: SHOW };
      if (catches >= CATCHES) return { ...done, complete: true };
      const refilled = { ...done, fish: [...next.fish, back(randInt(rng, 0, state.kinds - 1))], nextId: next.nextId + 1 };
      return chooseWanted(refilled, rng);
    }
    return {
      ...next,
      hook: up,
      slips: state.slips + 1,
      said: 'back',
      saidFor: SHOW,
      fish: [...next.fish, back(caught.kind)],
      nextId: next.nextId + 1,
    };
  }
  return next;
}

/** What a cast now would bring up: a fish's kind, or null for nothing. For
 *  the screen's hint and for tests, it plays the drop through. */
export function wouldCatch(state: DeepSeaState): number | null {
  if (state.hook.going) return null;
  let s = cast(state);
  const noRng = () => 0;
  for (let i = 0; i < 240 * 3 && s.hook.going === 'down'; i += 1) s = tick(s, 1 / 240, noRng);
  return s.hook.carrying ? s.hook.carrying.kind : null;
}

/** All eight first time is three stars; a couple back, two; more, one. */
export function starsForSlips(slips: number): number {
  if (slips === 0) return 3;
  if (slips <= 2) return 2;
  return 1;
}
