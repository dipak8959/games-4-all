import { shuffle, type Rng } from '../../util/random';

/**
 * Memory Grid.
 *
 * Some squares on a grid light up together, for a moment, and go dark. Tap
 * the ones that were lit. Five patterns make a round.
 *
 * It is a different memory from the other two memory games. Find the Pairs
 * is remembering what was where, one card at a time; Pattern Play is
 * remembering an order. This is holding a whole layout at once — spatial
 * memory, the same thing block-tapping tasks have measured in child
 * development research for decades — and it grows the way that memory does,
 * from two squares on a small grid to seven on a big one.
 *
 * Forgiving like everything else:
 *   - A wrong square costs a mistake and is marked, so it isn't tapped twice.
 *   - A found square stays lit, so the child only ever has to remember
 *     what's left.
 *   - The pattern can be shown again (`replay`) for free, as in Pattern Play.
 *     Squares already found stay found.
 */

export const PATTERNS_PER_ROUND = 5;

export type MemoryGridState = {
  /** The grid is `size` x `size`. */
  readonly size: number;
  /** Cell indices lit in this pattern. */
  readonly lit: readonly number[];
  /** Lit cells found so far. */
  readonly found: readonly number[];
  /** Cells tapped wrongly this pattern. */
  readonly missed: readonly number[];
  /** True while the pattern is on show and taps don't count. */
  readonly showing: boolean;
  readonly patternIndex: number;
  readonly mistakes: number;
  readonly complete: boolean;
};

type LevelSpec = {
  readonly size: number;
  readonly lit: number;
  /** How long the pattern stays up, in milliseconds. */
  readonly showMs: number;
};

/**
 * One entry per level, 1-6: more squares to hold every level, on a bigger
 * grid from level 3, with a little less time to look. Spatial memory span
 * runs from about two items at four years old to six or seven in adults,
 * which is where these start and end.
 */
const LEVELS: readonly LevelSpec[] = [
  { size: 3, lit: 2, showMs: 2000 },
  { size: 3, lit: 3, showMs: 1900 },
  { size: 4, lit: 4, showMs: 1800 },
  { size: 4, lit: 5, showMs: 1700 },
  { size: 4, lit: 6, showMs: 1600 },
  { size: 4, lit: 7, showMs: 1500 },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

/** A fresh pattern: `lit` different squares, never the same set as last
 *  time, so "play again" is never a repeat. */
function newPattern(rng: Rng, spec: LevelSpec, avoid: readonly number[] = []): number[] {
  const all = Array.from({ length: spec.size * spec.size }, (_, i) => i);
  for (let tries = 0; tries < 20; tries += 1) {
    const lit = shuffle(rng, all).slice(0, spec.lit).sort((a, b) => a - b);
    if (lit.join() !== [...avoid].sort((a, b) => a - b).join()) return lit;
  }
  return shuffle(rng, all).slice(0, spec.lit).sort((a, b) => a - b);
}

export function createGame(rng: Rng, level: number): MemoryGridState {
  const spec = specForLevel(level);
  return {
    size: spec.size,
    lit: newPattern(rng, spec),
    found: [],
    missed: [],
    showing: true,
    patternIndex: 0,
    mistakes: 0,
    complete: false,
  };
}

/** The screen calls this once the pattern has been shown. */
export function startInput(state: MemoryGridState): MemoryGridState {
  return state.showing ? { ...state, showing: false } : state;
}

/** Show the same pattern again. Free, and what's been found stays found. */
export function replay(state: MemoryGridState): MemoryGridState {
  if (state.complete || state.showing) return state;
  return { ...state, showing: true };
}

export function tapCell(state: MemoryGridState, cell: number, rng: Rng, level: number): MemoryGridState {
  if (state.complete || state.showing) return state;
  if (state.found.includes(cell) || state.missed.includes(cell)) return state;

  if (!state.lit.includes(cell)) {
    return { ...state, missed: [...state.missed, cell], mistakes: state.mistakes + 1 };
  }

  const found = [...state.found, cell];
  if (found.length < state.lit.length) return { ...state, found };

  // This pattern's done: on to the next, or the round is over.
  const patternIndex = state.patternIndex + 1;
  if (patternIndex >= PATTERNS_PER_ROUND) {
    return { ...state, found, patternIndex, complete: true };
  }
  return {
    ...state,
    lit: newPattern(rng, specForLevel(level), state.lit),
    found: [],
    missed: [],
    showing: true,
    patternIndex,
  };
}
