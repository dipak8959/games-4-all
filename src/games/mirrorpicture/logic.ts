import { type Rng } from '../../util/random';

/**
 * Mirror Picture.
 *
 * A picture made of squares, with a mirror line down the middle. One side
 * is drawn; the other is blank. Tap squares on the blank side to fill them
 * in, so the picture is the same both sides of the line.
 *
 * It practises symmetry: seeing that a square one away from the line on one
 * side is one away on the other, and so on outwards — the start of reflection
 * in geometry. It grows with the player: taller pictures with more squares,
 * then the mirror line across the middle instead of down it.
 *
 * Kind like everything else: a square filled by mistake just taps off again.
 * Six pictures is the round, fixed before the first. There's no score: the
 * stars come from how few squares were filled by mistake.
 */

export const PICTURES = 6;

export type MirrorPictureState = {
  /** The mirror line runs across (the given half on top) instead of down. */
  readonly across: boolean;
  /** The fill-in half's size, in squares. */
  readonly rows: number;
  readonly cols: number;
  /** Each picture's given half, row by row. */
  readonly givens: readonly (readonly boolean[])[];
  readonly index: number;
  /** The fill-in half as it is now. */
  readonly filled: readonly boolean[];
  readonly slips: number;
  readonly done: boolean;
  readonly complete: boolean;
};

type LevelSpec = { readonly across: boolean; readonly rows: number; readonly cols: number };

/** One entry per level, 1-6: the size of each half. */
const LEVELS: readonly LevelSpec[] = [
  { across: false, rows: 2, cols: 2 },
  { across: false, rows: 3, cols: 2 },
  { across: false, rows: 4, cols: 2 },
  { across: false, rows: 5, cols: 2 },
  { across: true, rows: 3, cols: 4 },
  { across: true, rows: 4, cols: 4 },
];

export function specForLevel(level: number): LevelSpec & { readonly cells: number } {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  const spec = LEVELS[index];
  return { ...spec, cells: spec.rows * spec.cols };
}

/** What the fill-in half must be: the given half, reflected in the line. */
export function mirrored(state: Pick<MirrorPictureState, 'across' | 'rows' | 'cols'>, given: readonly boolean[]): boolean[] {
  const { rows, cols } = state;
  return Array.from({ length: rows * cols }, (_, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    return state.across ? given[(rows - 1 - r) * cols + c] : given[r * cols + (cols - 1 - c)];
  });
}

export function createGame(rng: Rng, level: number): MirrorPictureState {
  const spec = specForLevel(level);
  const cells = spec.cells;
  const givens: boolean[][] = [];
  for (let i = 0; i < PICTURES; i += 1) {
    let given: boolean[] = [];
    // Around half filled; never empty, never full, and never the same twice.
    for (let tries = 0; tries < 50; tries += 1) {
      given = Array.from({ length: cells }, () => rng() < 0.5);
      const on = given.filter(Boolean).length;
      if (on >= Math.max(1, Math.floor(cells * 0.3)) && on <= Math.ceil(cells * 0.7) && on < cells && !givens.some((g) => g.every((v, n) => v === given[n]))) break;
    }
    givens.push(given);
  }
  return {
    across: spec.across,
    rows: spec.rows,
    cols: spec.cols,
    givens,
    index: 0,
    filled: Array.from({ length: cells }, () => false),
    slips: 0,
    done: false,
    complete: false,
  };
}

/** A square on the fill-in side tapped: filled, or emptied again. Filling
 *  one that shouldn't be is a slip. */
export function tapSquare(state: MirrorPictureState, cell: number): MirrorPictureState {
  if (state.complete || state.done || cell < 0 || cell >= state.filled.length) return state;
  const want = mirrored(state, state.givens[state.index]);
  const filled = state.filled.map((v, i) => (i === cell ? !v : v));
  const slips = state.slips + (filled[cell] && !want[cell] ? 1 : 0);
  const done = filled.every((v, i) => v === want[i]);
  return { ...state, filled, slips, done };
}

/** On to the next picture, once one matches. */
export function nextPicture(state: MirrorPictureState): MirrorPictureState {
  if (!state.done || state.complete) return state;
  const index = state.index + 1;
  if (index >= state.givens.length) return { ...state, complete: true };
  return { ...state, index, filled: state.filled.map(() => false), done: false };
}
