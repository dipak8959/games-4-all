import { randInt, type Rng } from '../../util/random';

/**
 * Fruit Catch.
 *
 * Fruit falls down the screen, in columns. Tap a column and the basket
 * slides under it. Catch the fruit; let the spiky pine cones fall past.
 * Twenty things fall in a round, and when the last one lands the round is
 * over.
 *
 * It practises hand-eye coordination — tracking something as it moves and
 * getting there in time — the same thing a small child does catching a ball,
 * and it grows the way that does: more places things can fall, falling
 * faster and closer together, and from level 3 things you must *not* catch,
 * so it's no longer enough to be under everything.
 *
 * Fair and forgiving:
 *   - The whole round is laid out before it starts, and every thing is
 *     reachable: the basket gets anywhere in `BASKET_TIME`, and nothing
 *     lands closer after the last than `spawnGap` allows.
 *   - A miss only costs stars. It never ends the round, and there is no
 *     count of catches on screen — the progress bar shows how much of the
 *     round is left, and that's all.
 *
 * Everything here is pure: `step` advances time, `moveTo` moves the basket.
 */

export const THINGS_PER_ROUND = 20;

/** The field, in its own units: things fall from y = 0 to the basket at
 *  y = FIELD_HEIGHT. The screen scales it. */
export const FIELD_WIDTH = 320;
export const FIELD_HEIGHT = 480;

/** How long the basket takes to get to any column — a column away or three. */
export const BASKET_TIME = 0.15;

/** A beat before the first thing falls, and after the last one lands. */
const LEAD_IN = 0.8;
const RUN_OUT = 0.7;

export type FruitKind = 'apple' | 'orange' | 'plum' | 'lime';
export type ThingKind = FruitKind | 'cone';

export type Landing =
  /** A fruit in the basket. */
  | 'caught'
  /** A fruit on the ground. */
  | 'missed'
  /** A pine cone in the basket. */
  | 'bumped'
  /** A pine cone on the ground, where it belongs. */
  | 'dodged';

export type Thing = {
  readonly kind: ThingKind;
  readonly column: number;
  /** Seconds after the start that it appears at the top. */
  readonly dropAt: number;
  readonly landing: Landing | null;
};

export type FruitCatchState = {
  readonly columns: number;
  /** Seconds a thing takes to fall. */
  readonly fallTime: number;
  readonly things: readonly Thing[];
  readonly elapsed: number;
  /** The column the basket is going to, and where it is across, in columns. */
  readonly basket: number;
  readonly basketX: number;
  /** Where the basket was when last sent, so any move takes BASKET_TIME. */
  readonly basketFrom: number;
  readonly started: boolean;
  /** Fruit missed plus pine cones caught. */
  readonly misses: number;
  readonly complete: boolean;
};

type LevelSpec = {
  readonly columns: number;
  readonly fallTime: number;
  /** Seconds between one thing and the next. */
  readonly spawnGap: number;
  /** Share of things that are pine cones. */
  readonly cones: number;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { columns: 2, fallTime: 3.2, spawnGap: 2.4, cones: 0 },
  { columns: 3, fallTime: 2.9, spawnGap: 2.1, cones: 0 },
  { columns: 3, fallTime: 2.6, spawnGap: 1.8, cones: 0.2 },
  { columns: 4, fallTime: 2.3, spawnGap: 1.5, cones: 0.25 },
  { columns: 4, fallTime: 2.0, spawnGap: 1.2, cones: 0.3 },
  { columns: 4, fallTime: 1.7, spawnGap: 0.95, cones: 0.35 },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

const FRUIT: readonly FruitKind[] = ['apple', 'orange', 'plum', 'lime'];

export function createGame(rng: Rng, level: number): FruitCatchState {
  const spec = specForLevel(level);
  const coneCount = Math.round(THINGS_PER_ROUND * spec.cones);
  // The first three are always fruit, so every round opens with the idea
  // before the twist; the cones are spread through the rest.
  const kinds: ThingKind[] = Array.from({ length: THINGS_PER_ROUND }, () => FRUIT[randInt(rng, 0, FRUIT.length - 1)]);
  const slots = Array.from({ length: THINGS_PER_ROUND - 3 }, (_, i) => i + 3);
  for (let c = 0; c < coneCount; c += 1) {
    const at = slots.splice(randInt(rng, 0, slots.length - 1), 1)[0];
    kinds[at] = 'cone';
  }

  let t = LEAD_IN;
  const columns: number[] = [];
  const things: Thing[] = kinds.map((kind, i) => {
    // Never three in the same column running — that would be one tap for
    // three catches — and a little give in the spacing, never below it.
    let column = randInt(rng, 0, spec.columns - 1);
    if (i >= 2 && columns[i - 1] === column && columns[i - 2] === column) {
      column = (column + 1 + randInt(rng, 0, spec.columns - 2)) % spec.columns;
    }
    columns.push(column);
    const thing: Thing = { kind, column, dropAt: t, landing: null };
    t += spec.spawnGap * (1 + rng() * 0.2);
    return thing;
  });

  const start = Math.floor(spec.columns / 2);
  return {
    columns: spec.columns,
    fallTime: spec.fallTime,
    things,
    elapsed: 0,
    basket: start,
    basketX: start,
    basketFrom: start,
    started: false,
    misses: 0,
    complete: false,
  };
}

/** A tap on a column. The first tap starts the round and moves nothing. */
export function moveTo(state: FruitCatchState, column: number): FruitCatchState {
  if (state.complete) return state;
  if (!state.started) return { ...state, started: true };
  const to = Math.max(0, Math.min(state.columns - 1, Math.round(column)));
  return to === state.basket ? state : { ...state, basket: to, basketFrom: state.basketX };
}

/** How far down a thing is, 0 at the top to FIELD_HEIGHT at the basket, or
 *  null if it hasn't appeared yet. */
export function heightOf(state: FruitCatchState, thing: Thing): number | null {
  const t = state.elapsed - thing.dropAt;
  if (t < 0) return null;
  return Math.min(FIELD_HEIGHT, (t / state.fallTime) * FIELD_HEIGHT);
}

/** When the last thing lands: the round's fixed end, known at the start. */
export function roundLength(state: FruitCatchState): number {
  return state.things[state.things.length - 1].dropAt + state.fallTime + RUN_OUT;
}

export function step(state: FruitCatchState, seconds: number): FruitCatchState {
  let next = state;
  let left = Math.min(seconds, 0.25);
  while (left > 0 && !next.complete) {
    const dt = Math.min(left, 1 / 120);
    next = tick(next, dt);
    left -= dt;
  }
  return next;
}

function tick(state: FruitCatchState, dt: number): FruitCatchState {
  if (!state.started || state.complete) return state;
  const elapsed = state.elapsed + dt;

  const move = (Math.max(1, Math.abs(state.basket - state.basketFrom)) / BASKET_TIME) * dt;
  const gap = state.basket - state.basketX;
  const basketX = Math.abs(gap) <= move ? state.basket : state.basketX + Math.sign(gap) * move;

  let misses = state.misses;
  let changed = false;
  const things = state.things.map((thing) => {
    if (thing.landing !== null || elapsed < thing.dropAt + state.fallTime) return thing;
    changed = true;
    // In the basket if the basket is more than half over its column.
    const inBasket = Math.abs(basketX - thing.column) < 0.5;
    const landing: Landing =
      thing.kind === 'cone' ? (inBasket ? 'bumped' : 'dodged') : inBasket ? 'caught' : 'missed';
    if (landing === 'missed' || landing === 'bumped') misses += 1;
    return { ...thing, landing };
  });

  return {
    ...state,
    elapsed,
    basketX,
    things: changed ? things : state.things,
    misses,
    complete: elapsed >= roundLength(state),
  };
}

/** One miss is still three stars — it's a lot of things to catch. */
export function starsForMisses(misses: number): number {
  if (misses <= 1) return 3;
  if (misses <= 4) return 2;
  return 1;
}
