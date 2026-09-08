import { randInt, type Rng } from '../../util/random';

/**
 * Pattern Play.
 *
 * A classic "watch and repeat" sequence game: a run of tiles lights up, then
 * the child taps them back in the same order. Both the sequence length and
 * the number of tiles on the board grow with level, which is what keeps this
 * genuinely testing at any age — unlike a fixed picture-matching game, there
 * is no ceiling where the mechanic itself stops being a real challenge.
 *
 * No freshness bookkeeping: every sequence is freshly randomised, so like
 * Sudoku there's no fixed pool to exhaust and nothing to avoid repeating.
 *
 * Entry follows the app's forgiving rule: tapping the wrong tile costs a
 * mistake and nothing else — the child stays exactly where they were in the
 * sequence and tries that step again, so there's no way to "lose" a round
 * partway through.
 */

export type PatternPlayState = {
  readonly tileCount: number;
  readonly sequence: readonly number[];
  /** How many correct taps in a row so far. Equals `sequence.length` once
   *  the whole sequence has been repeated back correctly. */
  readonly inputIndex: number;
  readonly mistakes: number;
  readonly complete: boolean;
  /** True while the sequence is still being shown to the child — taps don't
   *  count yet. The screen flips this to `false` once its reveal animation
   *  finishes; kept here (not purely in the screen) so `tapTile` has a
   *  single source of truth for whether input is currently accepted. */
  readonly revealing: boolean;
};

/** More tiles on the board as level rises, alongside a longer sequence —
 *  together these are what make higher levels a real step up rather than
 *  just a longer version of the same board. */
export function tileCountForLevel(level: number): number {
  if (level <= 2) return 4;
  if (level <= 4) return 6;
  return 9;
}

/** Sequence length for a level: 3 at the easiest, growing by one per level
 *  up to 8 at the hardest — comfortably within what's memorable to repeat
 *  back, at every tier. */
export function sequenceLengthForLevel(level: number): number {
  return 3 + Math.max(0, Math.min(5, level - 1));
}

export function createGame(rng: Rng, level: number): PatternPlayState {
  const tileCount = tileCountForLevel(level);
  const length = sequenceLengthForLevel(level);
  const sequence = Array.from({ length }, () => randInt(rng, 0, tileCount - 1));
  return { tileCount, sequence, inputIndex: 0, mistakes: 0, complete: false, revealing: true };
}

/** Called once the screen's reveal animation has finished playing the whole
 *  sequence, so taps start counting. */
export function startInput(state: PatternPlayState): PatternPlayState {
  return { ...state, revealing: false };
}

export function tapTile(state: PatternPlayState, tileIndex: number): PatternPlayState {
  if (state.complete || state.revealing) return state;

  const expected = state.sequence[state.inputIndex];
  if (tileIndex !== expected) {
    return { ...state, mistakes: state.mistakes + 1 };
  }

  const inputIndex = state.inputIndex + 1;
  return { ...state, inputIndex, complete: inputIndex >= state.sequence.length };
}
