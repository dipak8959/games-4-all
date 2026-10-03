import { randInt, shuffle, type Rng } from '../../util/random';

/**
 * Balloon Count.
 *
 * A bunch of balloons, each with a number on it. Pop them in counting
 * order, and each one pops into its place on the string at the top. Four
 * bunches make a round.
 *
 * It practises number order, and grows the way counting does in the early
 * years:
 *
 *   - three balloons with dots on, one to three — counting by looking;
 *   - numerals to five, then counting on from somewhere other than one;
 *   - counting back down;
 *   - counting in twos, and at the top in fives and tens as well;
 *   - and from level 3, balloons that don't belong in the count at all, so
 *     it's no longer enough to put everything in order.
 *
 * Where the count doesn't start at one or go up in ones, the string at the
 * top shows how it starts — the first number, or the first two, already in
 * place — so the pattern is there to be seen without anything to read. And
 * the string has exactly as many places as the count, so a child can see
 * where it ends.
 *
 * Forgiving like everything else: a balloon popped out of turn wobbles and
 * costs a mistake, once, and stays for later if it belongs.
 */

export const BUNCHES_PER_ROUND = 4;

export type Balloon = {
  readonly value: number;
  /** Part of the count, or a balloon that doesn't belong. */
  readonly member: boolean;
};

export type Bunch = {
  /** The whole count, in order, prefilled places included. */
  readonly count: readonly number[];
  /** How many of the count are already on the string. */
  readonly prefilled: number;
  readonly step: number;
  /** In the order they're laid out. */
  readonly balloons: readonly Balloon[];
  /** Dots rather than numerals, for the youngest. */
  readonly dots: boolean;
};

export type BalloonCountState = {
  readonly bunch: Bunch;
  /** Balloons popped, by index, in the order popped. */
  readonly popped: readonly number[];
  /** Balloons tapped out of turn since the last pop — charged once. */
  readonly missed: readonly number[];
  readonly done: boolean;
  readonly bunchIndex: number;
  readonly mistakes: number;
  readonly complete: boolean;
};

type LevelSpec = {
  /** Numbers in the count, prefilled ones included. */
  readonly members: number;
  readonly prefilled: number;
  readonly decoys: number;
  /** The biggest number that can appear. */
  readonly max: number;
  readonly steps: readonly number[];
  readonly down: boolean;
  readonly dots: boolean;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { members: 3, prefilled: 0, decoys: 0, max: 3, steps: [1], down: false, dots: true },
  { members: 5, prefilled: 0, decoys: 0, max: 5, steps: [1], down: false, dots: false },
  { members: 6, prefilled: 1, decoys: 1, max: 12, steps: [1], down: false, dots: false },
  { members: 8, prefilled: 2, decoys: 1, max: 20, steps: [1], down: true, dots: false },
  { members: 8, prefilled: 2, decoys: 2, max: 30, steps: [1, 2], down: true, dots: false },
  { members: 8, prefilled: 2, decoys: 3, max: 100, steps: [1, 2, 5, 10], down: true, dots: false },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

/** Balloons to pop, prefilled ones left out. */
export const balloonsForLevel = (level: number): number => {
  const spec = specForLevel(level);
  return spec.members - spec.prefilled + spec.decoys;
};

export function createBunch(rng: Rng, level: number): Bunch {
  const spec = specForLevel(level);
  // Only as big a step as the level's numbers leave room for.
  const steps = spec.steps.filter((s) => s * (spec.members - 1) + 1 <= spec.max);
  const step = steps[randInt(rng, 0, steps.length - 1)];
  const down = spec.down && rng() < 0.5;
  const span = step * (spec.members - 1);
  // Counts in fives and tens start on a multiple, the way they're said.
  const low =
    spec.prefilled === 0
      ? 1
      : step >= 5
        ? step * randInt(rng, 1, Math.floor((spec.max - span) / step))
        : randInt(rng, 1, spec.max - span);
  const up = Array.from({ length: spec.members }, (_, i) => low + i * step);
  const count = down ? [...up].reverse() : up;

  // Balloons that don't belong: numbers near the count but not in it, so
  // they tempt — the next one past the end, or an odd one among twos.
  // Widened a step at a time until there are enough to choose from.
  let near: number[] = [];
  for (let reach = step; near.length < spec.decoys && reach <= spec.max; reach += step) {
    near = [];
    for (let v = Math.max(1, low - reach); v <= Math.min(spec.max, low + span + reach); v += 1) {
      if (!count.includes(v)) near.push(v);
    }
  }
  const decoys = shuffle(rng, near).slice(0, spec.decoys);

  const balloons = shuffle(rng, [
    ...count.slice(spec.prefilled).map((value) => ({ value, member: true })),
    ...decoys.map((value) => ({ value, member: false })),
  ]);
  return { count, prefilled: spec.prefilled, step, balloons, dots: spec.dots };
}

export function createGame(rng: Rng, level: number): BalloonCountState {
  return {
    bunch: createBunch(rng, level),
    popped: [],
    missed: [],
    done: false,
    bunchIndex: 0,
    mistakes: 0,
    complete: false,
  };
}

/** The number that comes next, or null once the string is full. */
export function nextNumber(state: BalloonCountState): number | null {
  const at = state.bunch.prefilled + state.popped.length;
  return at < state.bunch.count.length ? state.bunch.count[at] : null;
}

export function pop(state: BalloonCountState, index: number): BalloonCountState {
  if (state.done || state.complete || state.popped.includes(index)) return state;
  const balloon = state.bunch.balloons[index];
  if (balloon === undefined) return state;
  if (balloon.value !== nextNumber(state)) {
    if (state.missed.includes(index)) return state;
    return { ...state, missed: [...state.missed, index], mistakes: state.mistakes + 1 };
  }
  const popped = [...state.popped, index];
  const full = state.bunch.prefilled + popped.length === state.bunch.count.length;
  return { ...state, popped, missed: [], done: full };
}

/** After a finished string has been seen: the next bunch, or the end. */
export function nextBunch(state: BalloonCountState, rng: Rng, level: number): BalloonCountState {
  if (!state.done) return state;
  const bunchIndex = state.bunchIndex + 1;
  if (bunchIndex >= BUNCHES_PER_ROUND) return { ...state, bunchIndex, done: false, complete: true };
  return { ...state, bunch: createBunch(rng, level), popped: [], missed: [], done: false, bunchIndex };
}
