import { randInt, shuffle, type Rng } from '../../util/random';

/**
 * Code Cracker.
 *
 * A row of shapes is hidden. Build a guess from the shapes on offer and
 * check it: pegs say how close it was — a filled peg for each shape in the
 * right place, a hollow one for each right shape in the wrong place. Use
 * what every guess tells you to work the code out.
 *
 * It practises deduction: keeping several clues in mind at once and making
 * the next guess one that fits them all. At the gentlest levels the marks
 * sit under each shape, so a child sees exactly which one was right; from
 * level 3 they're just a count, and working out *which* is the puzzle.
 * Then the code gets longer, there are more shapes to choose from, and a
 * shape can appear twice.
 *
 * Ten guesses at most, then the code is shown. It is the classic
 * pencil-and-paper game Bulls and Cows, played with shapes.
 */

export const MAX_GUESSES = 10;
/** How many shapes there are in all. A level uses the first few. */
export const SYMBOL_COUNT = 6;

/** Under each shape (the gentlest levels): right here, somewhere else, or
 *  not in the code at all. */
export type Mark = 'here' | 'elsewhere' | 'none';

export type Guess = {
  readonly symbols: readonly number[];
  /** Right shape, right place. */
  readonly exact: number;
  /** Right shape, wrong place. */
  readonly near: number;
  readonly marks: readonly Mark[];
};

export type CodeCrackerState = {
  readonly length: number;
  readonly symbols: number;
  readonly repeats: boolean;
  /** Marks under each shape, rather than a count. */
  readonly perSlot: boolean;
  readonly par: number;
  readonly code: readonly number[];
  readonly guesses: readonly Guess[];
  readonly current: readonly number[];
  readonly cracked: boolean;
  readonly complete: boolean;
};

type LevelSpec = {
  readonly length: number;
  readonly symbols: number;
  readonly repeats: boolean;
  readonly perSlot: boolean;
  /** Cracked in this many guesses or fewer is three stars. */
  readonly par: number;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { length: 3, symbols: 4, repeats: false, perSlot: true, par: 5 },
  { length: 3, symbols: 5, repeats: false, perSlot: true, par: 5 },
  { length: 3, symbols: 5, repeats: false, perSlot: false, par: 6 },
  { length: 4, symbols: 6, repeats: false, perSlot: false, par: 7 },
  { length: 4, symbols: 6, repeats: true, perSlot: false, par: 7 },
  { length: 5, symbols: 6, repeats: true, perSlot: false, par: 8 },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

export function createGame(rng: Rng, level: number): CodeCrackerState {
  const spec = specForLevel(level);
  const pool = Array.from({ length: spec.symbols }, (_, i) => i);
  const code = spec.repeats
    ? Array.from({ length: spec.length }, () => randInt(rng, 0, spec.symbols - 1))
    : shuffle(rng, pool).slice(0, spec.length);
  return { ...spec, code, guesses: [], current: [], cracked: false, complete: false };
}

/** How a guess scores against a code. */
export function score(code: readonly number[], guess: readonly number[]): Omit<Guess, 'symbols'> {
  const marks: Mark[] = guess.map((g, i) => (g === code[i] ? 'here' : 'none'));
  // What's left of the code once the exact matches are taken out, so a
  // shape is never counted twice.
  const left = new Map<number, number>();
  code.forEach((c, i) => {
    if (guess[i] !== c) left.set(c, (left.get(c) ?? 0) + 1);
  });
  guess.forEach((g, i) => {
    if (marks[i] === 'here') return;
    const n = left.get(g) ?? 0;
    if (n > 0) {
      marks[i] = 'elsewhere';
      left.set(g, n - 1);
    }
  });
  return {
    exact: marks.filter((m) => m === 'here').length,
    near: marks.filter((m) => m === 'elsewhere').length,
    marks,
  };
}

/** Adds a shape to the guess being built. */
export function add(state: CodeCrackerState, symbol: number): CodeCrackerState {
  if (state.complete || state.current.length >= state.length || symbol < 0 || symbol >= state.symbols) return state;
  return { ...state, current: [...state.current, symbol] };
}

/** Takes the last shape back off. */
export function undo(state: CodeCrackerState): CodeCrackerState {
  if (state.complete || state.current.length === 0) return state;
  return { ...state, current: state.current.slice(0, -1) };
}

/** Checks a full guess. */
export function check(state: CodeCrackerState): CodeCrackerState {
  if (state.complete || state.current.length !== state.length) return state;
  const guess: Guess = { symbols: state.current, ...score(state.code, state.current) };
  const guesses = [...state.guesses, guess];
  const cracked = guess.exact === state.length;
  return { ...state, guesses, current: [], cracked, complete: cracked || guesses.length >= MAX_GUESSES };
}

/** Cracked within the level's par is three stars; cracked at all, two. */
export function starsForCode(state: CodeCrackerState): number {
  if (state.cracked && state.guesses.length <= state.par) return 3;
  if (state.cracked) return 2;
  return 1;
}
