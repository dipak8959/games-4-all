import { sample, type Rng } from '../../util/random';

/**
 * Flip It.
 *
 * A grid of tiles, some lit and some dark. Tap a tile and it flips — and so
 * do the tiles above, below and either side of it. Light every tile.
 *
 * It practises logical planning: every tap changes five tiles at once, so
 * the way to a lit board has to be worked out, not stumbled on. It grows
 * with the player: bigger boards, and boards that take more taps.
 *
 * Kind like everything else: there's no wrong tap, only a longer way round,
 * and a board that has taken far too many taps lights itself. Six boards is
 * the round, fixed before the first tap. There's no score: the stars come
 * from taps against the fewest each board could take.
 */

export const BOARDS = 6;

export type FlipItState = {
  readonly size: number;
  readonly boards: readonly (readonly boolean[])[];
  /** The taps each board was made from: a way to light it. */
  readonly pars: readonly number[];
  readonly index: number;
  readonly lit: readonly boolean[];
  readonly taps: number;
  /** Taps on every board so far, and the par of those boards. */
  readonly totalTaps: number;
  readonly totalPar: number;
  readonly done: boolean;
  readonly complete: boolean;
};

type LevelSpec = {
  readonly size: number;
  /** Taps it takes to light each board. */
  readonly moves: number;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { size: 3, moves: 1 },
  { size: 3, moves: 2 },
  { size: 3, moves: 3 },
  { size: 4, moves: 3 },
  { size: 4, moves: 4 },
  { size: 4, moves: 5 },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

/** A tap at a cell: it and its neighbours flip. */
export function press(board: readonly boolean[], size: number, cell: number): boolean[] {
  const out = [...board];
  const r = Math.floor(cell / size);
  const c = cell % size;
  for (const [dr, dc] of [
    [0, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const rr = r + dr;
    const cc = c + dc;
    if (rr >= 0 && rr < size && cc >= 0 && cc < size) out[rr * size + cc] = !out[rr * size + cc];
  }
  return out;
}

/** The fewest taps that light a board, and which: tries every set of taps
 *  on the top row, then the rest are forced row by row. */
export function solve(board: readonly boolean[], size: number): number[] {
  let best: number[] | null = null;
  for (let mask = 0; mask < 1 << size; mask += 1) {
    let b = [...board];
    const taps: number[] = [];
    for (let c = 0; c < size; c += 1) {
      if ((mask >> c) & 1) {
        b = press(b, size, c);
        taps.push(c);
      }
    }
    // A dark tile in one row can only be lit by the tile below it now.
    for (let r = 1; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        if (!b[(r - 1) * size + c]) {
          b = press(b, size, r * size + c);
          taps.push(r * size + c);
        }
      }
    }
    if (b.every(Boolean) && (!best || taps.length < best.length)) best = taps;
  }
  return best ?? [];
}

export function createGame(rng: Rng, level: number): FlipItState {
  const spec = specForLevel(level);
  const cells = spec.size * spec.size;
  const boards: boolean[][] = [];
  const pars: number[] = [];
  for (let i = 0; i < BOARDS; i += 1) {
    // Tapped from lit, so it can be lit again — and no quicker than the
    // level says, so every board is the work it claims to be.
    let board: boolean[] = [];
    let par = 0;
    for (let tries = 0; tries < 200; tries += 1) {
      board = Array.from({ length: cells }, () => true);
      for (const cell of sample(rng, Array.from({ length: cells }, (_, n) => n), spec.moves)) board = press(board, spec.size, cell);
      par = solve(board, spec.size).length;
      if (par === spec.moves && !boards.some((b) => b.every((v, n) => v === board[n]))) break;
    }
    boards.push(board);
    pars.push(par);
  }
  return {
    size: spec.size,
    boards,
    pars,
    index: 0,
    lit: boards[0],
    taps: 0,
    totalTaps: 0,
    totalPar: 0,
    done: false,
    complete: false,
  };
}

/** Past this many taps on a board, it lights itself. */
export function mostTaps(par: number): number {
  return par * 4 + 8;
}

export function tapTile(state: FlipItState, cell: number): FlipItState {
  if (state.complete || state.done || cell < 0 || cell >= state.lit.length) return state;
  const lit = press(state.lit, state.size, cell);
  const taps = state.taps + 1;
  const par = state.pars[state.index];
  if (lit.every(Boolean) || taps >= mostTaps(par)) {
    return { ...state, lit: lit.map(() => true), taps, done: true, totalTaps: state.totalTaps + taps, totalPar: state.totalPar + par };
  }
  return { ...state, lit, taps };
}

/** On to the next board, once one is lit. */
export function nextBoard(state: FlipItState): FlipItState {
  if (!state.done || state.complete) return state;
  const index = state.index + 1;
  if (index >= state.boards.length) return { ...state, complete: true };
  return { ...state, index, lit: state.boards[index], taps: 0, done: false };
}

/** Every board in its fewest taps is three stars; half as many again, two. */
export function starsForTaps(taps: number, par: number): number {
  if (taps <= par) return 3;
  if (taps <= par * 1.5 + 2) return 2;
  return 1;
}
