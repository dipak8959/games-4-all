import { shuffle, type Rng } from '../../util/random';

/**
 * Sudoku.
 *
 * A grown-up-recognisable logic puzzle, sized to the child: 4x4 to start,
 * growing to 6x6 and then a generously-clued 9x9 as adaptive level rises.
 * Every puzzle is generated fresh (full solve + hole-digging, both below),
 * so unlike the pooled-content games there's no fixed set to exhaust and no
 * "avoid the last one" bookkeeping needed — procedural generation already
 * gives effectively unlimited variety on its own.
 *
 * Entry follows the same forgiving rule as every other game: a wrong number
 * costs a mistake and nothing else. The cell stays empty, the correct answer
 * is still whatever it was, and the child just tries again — no way to see a
 * wrong value sitting in the grid, so there's nothing to "clean up" or feel
 * bad about.
 */

export type SudokuSize = 4 | 6 | 9;

export type SudokuCell = {
  readonly value: number | null;
  readonly given: boolean;
};

export type SudokuState = {
  readonly size: SudokuSize;
  readonly boxHeight: number;
  readonly boxWidth: number;
  readonly solution: readonly number[];
  readonly cells: readonly SudokuCell[];
  readonly selected: number | null;
  readonly mistakes: number;
  readonly complete: boolean;
};

function boxDimsFor(size: SudokuSize): { readonly boxHeight: number; readonly boxWidth: number } {
  if (size === 4) return { boxHeight: 2, boxWidth: 2 };
  if (size === 6) return { boxHeight: 2, boxWidth: 3 };
  return { boxHeight: 3, boxWidth: 3 };
}

/** Grid size grows with level: 4x4, then 6x6, then a full 9x9. */
export function sizeForLevel(level: number): SudokuSize {
  if (level <= 2) return 4;
  if (level <= 4) return 6;
  return 9;
}

/** How many cells stay filled in as "givens", per grid size — generous on
 *  purpose. This is a forgiving kids' variant, not a minimal-clue puzzle for
 *  Sudoku enthusiasts, so every tier leans toward "clearly solvable with a
 *  bit of patience" rather than maximum difficulty for its size. */
function givensFor(size: SudokuSize): number {
  if (size === 4) return 8; // half of 16
  if (size === 6) return 20; // just over half of 36
  return 38; // easy-to-medium for a 9x9's 81 cells
}

const cellIndex = (row: number, col: number, size: number): number => row * size + col;

function hasConflict(
  grid: readonly number[],
  size: SudokuSize,
  boxHeight: number,
  boxWidth: number,
  row: number,
  col: number,
  value: number,
): boolean {
  for (let c = 0; c < size; c++) if (grid[cellIndex(row, c, size)] === value) return true;
  for (let r = 0; r < size; r++) if (grid[cellIndex(r, col, size)] === value) return true;

  const boxRow = Math.floor(row / boxHeight) * boxHeight;
  const boxCol = Math.floor(col / boxWidth) * boxWidth;
  for (let r = boxRow; r < boxRow + boxHeight; r++) {
    for (let c = boxCol; c < boxCol + boxWidth; c++) {
      if (grid[cellIndex(r, c, size)] === value) return true;
    }
  }
  return false;
}

/** Fills an empty grid into one complete, valid solution via randomised
 *  backtracking. These grid sizes (4/6/9) make this reliably fast. */
function generateSolution(rng: Rng, size: SudokuSize): number[] {
  const { boxHeight, boxWidth } = boxDimsFor(size);
  const grid = new Array<number>(size * size).fill(0);
  const digits = Array.from({ length: size }, (_, i) => i + 1);

  function fill(position: number): boolean {
    if (position >= size * size) return true;
    const row = Math.floor(position / size);
    const col = position % size;

    for (const value of shuffle(rng, digits)) {
      if (!hasConflict(grid, size, boxHeight, boxWidth, row, col, value)) {
        grid[cellIndex(row, col, size)] = value;
        if (fill(position + 1)) return true;
        grid[cellIndex(row, col, size)] = 0;
      }
    }
    return false;
  }

  fill(0);
  return grid;
}

/** Counts solutions to a partially-filled grid, stopping as soon as `cap` is
 *  reached — used only to confirm a puzzle-in-progress still has exactly one
 *  solution before a cell is removed for good. */
function countSolutions(grid: readonly number[], size: SudokuSize, cap: number): number {
  const { boxHeight, boxWidth } = boxDimsFor(size);
  const working = grid.slice();
  let count = 0;

  function solve(position: number): boolean {
    if (position >= size * size) {
      count++;
      return count >= cap;
    }
    const row = Math.floor(position / size);
    const col = position % size;
    if (working[cellIndex(row, col, size)] !== 0) return solve(position + 1);

    for (let value = 1; value <= size; value++) {
      if (!hasConflict(working, size, boxHeight, boxWidth, row, col, value)) {
        working[cellIndex(row, col, size)] = value;
        if (solve(position + 1)) return true;
        working[cellIndex(row, col, size)] = 0;
      }
    }
    return false;
  }

  solve(0);
  return count;
}

/**
 * Removes cells from a full solution one at a time, in random order, keeping
 * each removal only if the puzzle still has exactly one solution afterward —
 * otherwise it's put back. Stops once `targetGivens` remain (or no more
 * cells can be safely removed, whichever comes first), so the result is
 * always uniquely solvable.
 */
function digHoles(rng: Rng, solution: readonly number[], size: SudokuSize, targetGivens: number): boolean[] {
  const total = size * size;
  const given = new Array<boolean>(total).fill(true);
  const order = shuffle(rng, Array.from({ length: total }, (_, i) => i));
  let remaining = total;

  for (const index of order) {
    if (remaining <= targetGivens) break;

    given[index] = false;
    const trial = solution.map((value, i) => (given[i] ? value : 0));

    if (countSolutions(trial, size, 2) === 1) {
      remaining--;
    } else {
      given[index] = true; // removing this one made the puzzle ambiguous; keep it
    }
  }

  return given;
}

export function createGame(rng: Rng, level: number): SudokuState {
  const size = sizeForLevel(level);
  const { boxHeight, boxWidth } = boxDimsFor(size);
  const solution = generateSolution(rng, size);
  const given = digHoles(rng, solution, size, givensFor(size));

  const cells: SudokuCell[] = solution.map((value, i) => ({
    value: given[i] ? value : null,
    given: given[i],
  }));

  return { size, boxHeight, boxWidth, solution, cells, selected: null, mistakes: 0, complete: false };
}

/** Selects an empty cell to fill. Given cells (and any tap once the puzzle
 *  is complete) are a no-op — nothing to edit there. */
export function selectCell(state: SudokuState, index: number): SudokuState {
  if (state.complete) return state;
  const cell = state.cells[index];
  if (!cell || cell.given) return state;
  return { ...state, selected: index };
}

/**
 * Enters a value into the selected cell.
 *
 * A wrong value never touches the grid — it costs a mistake and leaves the
 * selected cell exactly as it was, so there is never a wrong number visible
 * to second-guess or "clean up".
 */
export function enterNumber(state: SudokuState, value: number): SudokuState {
  if (state.complete || state.selected == null) return state;
  const index = state.selected;
  const cell = state.cells[index];
  if (!cell || cell.given || cell.value != null) return state;

  if (value !== state.solution[index]) {
    return { ...state, mistakes: state.mistakes + 1 };
  }

  const cells = state.cells.map((c, i) => (i === index ? { ...c, value } : c));
  return { ...state, cells, selected: null, complete: cells.every((c) => c.value != null) };
}

export function filledCount(state: SudokuState): number {
  return state.cells.filter((c) => c.value != null).length;
}
