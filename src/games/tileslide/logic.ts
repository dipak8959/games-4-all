import { randInt, type Rng } from '../../util/random';

/**
 * Tile Slide.
 *
 * Numbered tiles in a square frame with one gap. Tap a tile in line with
 * the gap and it slides into it, pushing any tiles between along with it.
 * Put the numbers back in order, 1 in the top left and the gap in the
 * bottom right, and the round is over.
 *
 * The sliding fifteen puzzle has been around since the 1880s and belongs to
 * nobody. It practises planning: a tile rarely goes straight home, so the
 * player has to see a few moves ahead — move this one out of the way so that
 * one can come round. It replaces Nonogram, whose cells could not be made
 * big enough for a child's finger on a phone; every tile here is full size.
 *
 * It grows from a two-by-two square four moves from done, which a
 * seven-year-old solves by poking at it, to a four-by-four mixed by sixty
 * moves, which asks an adult to plan.
 *
 * Every puzzle is mixed by sliding tiles from the solved position, so every
 * puzzle can be solved — half of all random arrangements of a sliding
 * puzzle cannot, which is not a lesson anyone needs to learn here.
 */

/** Tiles by position, row by row. `0` is the gap. */
export type Board = readonly number[];

export type TileSlideState = {
  readonly size: number;
  readonly board: Board;
  /** How many moves mixed it — an upper bound on how many it takes. */
  readonly par: number;
  /** Tiles moved so far. Never shown: it only decides the stars. */
  readonly moves: number;
  readonly complete: boolean;
};

type LevelSpec = {
  readonly size: number;
  /** How many slides mix the puzzle. */
  readonly mix: number;
};

/** One entry per level, 1-6: a bigger square, and more thoroughly mixed. */
const LEVELS: readonly LevelSpec[] = [
  { size: 2, mix: 4 },
  { size: 3, mix: 8 },
  { size: 3, mix: 14 },
  { size: 3, mix: 24 },
  { size: 4, mix: 36 },
  { size: 4, mix: 60 },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

export function solvedBoard(size: number): Board {
  return Array.from({ length: size * size }, (_, i) => (i === size * size - 1 ? 0 : i + 1));
}

export function isSolved(board: Board): boolean {
  return board.every((tile, i) => tile === (i === board.length - 1 ? 0 : i + 1));
}

const neighbours = (size: number, cell: number): number[] => {
  const row = Math.floor(cell / size);
  const col = cell % size;
  const out: number[] = [];
  if (row > 0) out.push(cell - size);
  if (row < size - 1) out.push(cell + size);
  if (col > 0) out.push(cell - 1);
  if (col < size - 1) out.push(cell + 1);
  return out;
};

/**
 * Mixes a solved board by moving the gap `mix` times, never straight back
 * where it just came from. Always solvable, since every step can be undone.
 */
export function mixBoard(rng: Rng, size: number, mix: number): Board {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const board = [...solvedBoard(size)];
    let gap = board.length - 1;
    let from = -1;
    for (let i = 0; i < mix; i += 1) {
      const options = neighbours(size, gap).filter((c) => c !== from);
      const to = options[randInt(rng, 0, options.length - 1)];
      [board[gap], board[to]] = [board[to], board[gap]];
      from = gap;
      gap = to;
    }
    if (!isSolved(board)) return board;
  }
  // Unreachable in practice; one slide from solved is still a puzzle.
  const board = [...solvedBoard(size)];
  [board[board.length - 1], board[board.length - 2]] = [board[board.length - 2], board[board.length - 1]];
  return board;
}

export function createGame(rng: Rng, level: number): TileSlideState {
  const spec = specForLevel(level);
  return { size: spec.size, board: mixBoard(rng, spec.size, spec.mix), par: spec.mix, moves: 0, complete: false };
}

/** Whether the tile at `cell` is in line with the gap, and so can slide. */
export function canSlide(state: TileSlideState, cell: number): boolean {
  const gap = state.board.indexOf(0);
  if (cell === gap) return false;
  const { size } = state;
  return Math.floor(cell / size) === Math.floor(gap / size) || cell % size === gap % size;
}

/** Slide the tile at `cell` towards the gap, with any tiles between it and
 *  the gap going along too. */
export function slide(state: TileSlideState, cell: number): TileSlideState {
  if (state.complete || !canSlide(state, cell)) return state;
  const board = [...state.board];
  const { size } = state;
  let gap = board.indexOf(0);
  const step = Math.floor(cell / size) === Math.floor(gap / size) ? (cell > gap ? 1 : -1) : cell > gap ? size : -size;
  let moved = 0;
  while (gap !== cell) {
    board[gap] = board[gap + step];
    board[gap + step] = 0;
    gap += step;
    moved += 1;
  }
  return { ...state, board, moves: state.moves + moved, complete: isSolved(board) };
}

/**
 * Stars from how directly it was solved, against the moves that mixed it —
 * which is more than the fewest possible, so three stars never asks for a
 * perfect solve. Twice the mix earns three, four times two.
 */
export function starsForMoves(moves: number, par: number): number {
  if (moves <= par * 2) return 3;
  if (moves <= par * 4) return 2;
  return 1;
}
