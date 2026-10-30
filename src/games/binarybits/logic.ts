import { randInt, type Rng } from '../../util/random';

/**
 * Binary Bits.
 *
 * A number to make, and a row of switches — bits — each worth twice the one
 * to its right: 1, 2, 4, 8 and on. Switch bits on until the ones that are on
 * add up to the number.
 *
 * It practises place value in binary, the way computers count: breaking a
 * number into the powers of two that make it. It grows with the player: more
 * bits and bigger numbers, then the running total hidden, then bits already
 * switched on at the start, some of which have to go off.
 *
 * Kind like everything else: a bit switched by mistake just switches back.
 * Ten numbers is the round, fixed before the first. There's no score: the
 * stars come from how few extra switches it took.
 */

export const NUMBERS = 10;
/** Switches a number needs at most, and then some: past this many extra on
 *  one number, it's made for you and the round goes on. */
export const MOST_EXTRA = 12;

export type BinaryBitsState = {
  readonly bits: number;
  readonly showTotal: boolean;
  readonly targets: readonly number[];
  /** Where each number's switches start. */
  readonly starts: readonly number[];
  readonly index: number;
  /** The switches now, as a number: bit i on is 2^i. */
  readonly value: number;
  readonly taps: number;
  /** Switches beyond the fewest that would have done, all round. */
  readonly extra: number;
  readonly made: boolean;
  readonly complete: boolean;
};

type LevelSpec = {
  readonly bits: number;
  /** The total of the switches that are on, written out. */
  readonly showTotal: boolean;
  /** Some switches already on at the start of each number. */
  readonly startOn: boolean;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { bits: 3, showTotal: true, startOn: false },
  { bits: 4, showTotal: true, startOn: false },
  { bits: 5, showTotal: true, startOn: false },
  { bits: 6, showTotal: false, startOn: false },
  { bits: 7, showTotal: false, startOn: true },
  { bits: 8, showTotal: false, startOn: true },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

/** How many bits are on in a number. */
export function ones(n: number): number {
  let count = 0;
  for (let m = n; m > 0; m >>= 1) count += m & 1;
  return count;
}

export function createGame(rng: Rng, level: number): BinaryBitsState {
  const spec = specForLevel(level);
  const top = 2 ** spec.bits - 1;
  const targets: number[] = [];
  const starts: number[] = [];
  for (let i = 0; i < NUMBERS; i += 1) {
    let t = randInt(rng, 1, top);
    // Numbers big enough that most switches matter; no repeats where there
    // are numbers enough, and never the same one twice running.
    const roomy = top >= NUMBERS * 2;
    const clash = (n: number) => (roomy ? targets.includes(n) || n < 2 ** (spec.bits - 2) : targets[targets.length - 1] === n);
    for (let tries = 0; clash(t) && tries < 100; tries += 1) t = randInt(rng, 1, top);
    targets.push(t);
    let start = spec.startOn ? randInt(rng, 1, top) : 0;
    if (start === t) start ^= 1;
    starts.push(start);
  }
  return {
    bits: spec.bits,
    showTotal: spec.showTotal,
    targets,
    starts,
    index: 0,
    value: starts[0],
    taps: 0,
    extra: 0,
    made: false,
    complete: false,
  };
}

/** The fewest switches from where a number starts to the number itself. */
export function fewest(state: Pick<BinaryBitsState, 'targets' | 'starts' | 'index'>): number {
  return ones(state.targets[state.index] ^ state.starts[state.index]);
}

/** A bit switched: on if it was off, off if it was on. Made, the number
 *  shows as done until `next`. */
export function toggle(state: BinaryBitsState, bit: number): BinaryBitsState {
  if (state.complete || state.made || bit < 0 || bit >= state.bits) return state;
  const value = state.value ^ (1 << bit);
  const taps = state.taps + 1;
  const over = taps - fewest(state);
  if (value === state.targets[state.index]) return { ...state, value, taps, made: true, extra: state.extra + Math.max(0, over) };
  // Well past the fewest: made for you, so a number can't go on for ever.
  if (over >= MOST_EXTRA) return { ...state, value: state.targets[state.index], taps, made: true, extra: state.extra + over };
  return { ...state, value, taps };
}

/** On to the next number, once one is made. */
export function next(state: BinaryBitsState): BinaryBitsState {
  if (!state.made || state.complete) return state;
  const index = state.index + 1;
  if (index >= state.targets.length) return { ...state, complete: true };
  return { ...state, index, value: state.starts[index], taps: 0, made: false };
}

/** No extra switches is three stars; a few, two; more, one. */
export function starsForExtra(extra: number): number {
  if (extra === 0) return 3;
  if (extra <= 6) return 2;
  return 1;
}
