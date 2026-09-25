import { randInt, shuffle, type Rng } from '../../util/random';

/**
 * Shape Builder.
 *
 * An outline sits on a grid; a tray below holds a handful of flat pieces made
 * of square blocks. Pick a piece, turn it if it needs turning, and tap where
 * it goes. The round ends when the outline is completely filled — a fixed,
 * visible amount of work, and nothing after it.
 *
 * Dissection puzzles like this are centuries old and owned by nobody. The
 * pieces here are generated fresh every round by cutting a random outline
 * into parts, so there is no puzzle pack, no named set of pieces and no
 * borrowed layout — and because the outline is made *from* the pieces, every
 * puzzle is solvable by construction.
 *
 * Forgiving in the same way as every other game:
 *   - A piece that doesn't fit where it's tapped costs a mistake and nothing
 *     else. It stays selected, so the child just tries somewhere else.
 *   - A placed piece can always be picked back up by tapping it. Any fill of
 *     the outline counts, not only the one it was cut from, so there is no
 *     wrong-but-permanent move and no way to get stuck.
 *
 * Everything is tap-only. Dragging is harder for small hands, needs a gesture
 * library this app deliberately doesn't carry, and gains nothing here.
 */

/** A block's position, as [row, column]. */
export type Cell = readonly [number, number];

export type Piece = {
  readonly id: number;
  /** The blocks in the piece's *current* orientation, normalised so the
   *  top-most row and left-most column are both 0. */
  readonly cells: readonly Cell[];
  /** Where the piece's own [0, 0] sits on the board, or null in the tray. */
  readonly at: Cell | null;
};

export type ShapeBuilderState = {
  /** The board is `rows` x `cols`; only `outline` cells are part of it. */
  readonly rows: number;
  readonly cols: number;
  readonly outline: readonly Cell[];
  readonly pieces: readonly Piece[];
  readonly selected: number | null;
  /** Whether pieces can (and may need to) be turned at this level. */
  readonly rotation: boolean;
  readonly mistakes: number;
  readonly complete: boolean;
};

/**
 * The board never grows past this. Four columns of full-size (72dp) cells
 * fit a phone's width with the gutters either side, so unlike Sudoku this
 * game needs no exception to the app's minimum touch-target size.
 */
export const BOARD_COLS = 4;
export const BOARD_ROWS = 5;

type LevelSpec = {
  readonly pieces: number;
  /** Blocks in the outline — the total work in a round. */
  readonly blocks: number;
  /** Largest piece allowed. Every piece is at least two blocks. */
  readonly maxPiece: number;
  readonly rotation: boolean;
};

/**
 * One entry per level, 1-6. Every level adds work over the one below, so no
 * promotion repeats a puzzle: more pieces and more blocks, and from level 3
 * pieces arrive turned, so fitting one means picturing it rotated first —
 * the spatial skill this game exists for.
 */
const LEVELS: readonly LevelSpec[] = [
  { pieces: 2, blocks: 5, maxPiece: 3, rotation: false },
  { pieces: 3, blocks: 8, maxPiece: 3, rotation: false },
  { pieces: 3, blocks: 9, maxPiece: 4, rotation: true },
  { pieces: 4, blocks: 12, maxPiece: 4, rotation: true },
  { pieces: 5, blocks: 15, maxPiece: 4, rotation: true },
  { pieces: 5, blocks: 18, maxPiece: 5, rotation: true },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

const key = ([row, col]: Cell): string => `${row},${col}`;

const NEIGHBOURS: readonly Cell[] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

function neighbours([row, col]: Cell): Cell[] {
  return NEIGHBOURS.map(([dr, dc]) => [row + dr, col + dc] as Cell).filter(
    ([r, c]) => r >= 0 && r < BOARD_ROWS && c >= 0 && c < BOARD_COLS,
  );
}

/** Shifts cells so the top-most row and left-most column are 0, and puts
 *  them in reading order, so two equal shapes compare equal. */
export function normalise(cells: readonly Cell[]): Cell[] {
  const minRow = Math.min(...cells.map(([r]) => r));
  const minCol = Math.min(...cells.map(([, c]) => c));
  return cells
    .map(([r, c]) => [r - minRow, c - minCol] as Cell)
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

/** A quarter turn clockwise. Turning only, never flipping: a flat piece on a
 *  table can be spun but not turned over into its mirror image. */
export function rotate(cells: readonly Cell[]): Cell[] {
  return normalise(cells.map(([r, c]) => [c, -r] as Cell));
}

export function sameShape(a: readonly Cell[], b: readonly Cell[]): boolean {
  const na = normalise(a);
  const nb = normalise(b);
  return na.length === nb.length && na.every((cell, i) => key(cell) === key(nb[i]));
}

/** Splits `total` into `parts` sizes, each between 2 and `max`. */
function pieceSizes(rng: Rng, total: number, parts: number, max: number): number[] {
  const sizes = Array.from({ length: parts }, () => 2);
  let left = total - parts * 2;
  while (left > 0) {
    const open = sizes.map((s, i) => (s < max ? i : -1)).filter((i) => i >= 0);
    sizes[open[randInt(rng, 0, open.length - 1)]] += 1;
    left -= 1;
  }
  return shuffle(rng, sizes);
}

/**
 * Cuts one piece of `size` blocks out of `free`, starting from `start` and
 * growing through free neighbours. Returns null if it runs out of room.
 */
function growPiece(rng: Rng, free: Set<string>, start: Cell, size: number): Cell[] | null {
  const piece: Cell[] = [start];
  const taken = new Set([key(start)]);
  while (piece.length < size) {
    const frontier = piece
      .flatMap(neighbours)
      .filter((cell) => free.has(key(cell)) && !taken.has(key(cell)));
    if (frontier.length === 0) return null;
    const next = frontier[randInt(rng, 0, frontier.length - 1)];
    piece.push(next);
    taken.add(key(next));
  }
  return piece;
}

/**
 * Builds the puzzle backwards: lay the pieces down one against the next
 * until they make a single connected outline, then hand them to the child
 * loose. The outline is whatever shape that produces — never a plain
 * rectangle unless chance makes one — and it is guaranteed fillable, because
 * it was filled to make it.
 */
function cutPuzzle(rng: Rng, spec: LevelSpec): { outline: Cell[]; solution: Cell[][] } {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    const sizes = pieceSizes(rng, spec.blocks, spec.pieces, spec.maxPiece);
    const free = new Set<string>();
    for (let r = 0; r < BOARD_ROWS; r += 1) for (let c = 0; c < BOARD_COLS; c += 1) free.add(key([r, c]));

    const solution: Cell[][] = [];
    const used = new Set<string>();
    let ok = true;

    for (const size of sizes) {
      // The first piece goes anywhere; every later one must start touching
      // what is already down, so the outline stays in one piece.
      const starts =
        solution.length === 0
          ? [...free].map((k) => k.split(',').map(Number) as unknown as Cell)
          : [...used]
              .flatMap((k) => neighbours(k.split(',').map(Number) as unknown as Cell))
              .filter((cell) => free.has(key(cell)));
      if (starts.length === 0) {
        ok = false;
        break;
      }
      const piece = growPiece(rng, free, starts[randInt(rng, 0, starts.length - 1)], size);
      if (!piece) {
        ok = false;
        break;
      }
      for (const cell of piece) {
        free.delete(key(cell));
        used.add(key(cell));
      }
      solution.push(piece);
    }

    // Two pieces of the same shape are fine; but a round where every piece
    // is identical has nothing to decide, so ask for at least two shapes.
    if (ok && spec.pieces > 1) {
      const first = solution[0];
      if (solution.every((p) => sameShape(p, first))) ok = false;
    }
    if (ok) return { outline: solution.flat(), solution };
  }
  // Unreachable in practice: the largest level uses 18 of the board's 20
  // cells and is cut first time on almost every seed (the tests check a few
  // hundred). Failing loudly beats quietly dealing a puzzle that isn't one.
  throw new Error('Shape Builder could not cut a puzzle');
}

/** The ways a piece can be turned that actually look different. */
function distinctTurns(cells: readonly Cell[]): Cell[][] {
  const turns: Cell[][] = [];
  let current = normalise(cells);
  for (let i = 0; i < 4; i += 1) {
    if (!turns.some((t) => sameShape(t, current))) turns.push(current);
    current = rotate(current);
  }
  return turns;
}

export function createGame(rng: Rng, level: number): ShapeBuilderState {
  const spec = specForLevel(level);
  const { outline, solution } = cutPuzzle(rng, spec);

  const pieces: Piece[] = shuffle(rng, solution).map((cells, id) => {
    if (!spec.rotation) return { id, cells: normalise(cells), at: null };
    // At rotation levels a piece arrives turned away from how it fits
    // whenever it has another way to face — otherwise the turn button would
    // be decoration. A square, which looks the same every way up, is fine.
    const turns = distinctTurns(cells);
    const others = turns.filter((t) => !sameShape(t, cells) || turns.length === 1);
    return { id, cells: others[randInt(rng, 0, others.length - 1)], at: null };
  });

  return {
    rows: BOARD_ROWS,
    cols: BOARD_COLS,
    outline,
    pieces,
    selected: null,
    rotation: spec.rotation,
    mistakes: 0,
    complete: false,
  };
}

/** Board cells a piece would cover if its [0, 0] sat at `at`. */
export function footprint(piece: Pick<Piece, 'cells'>, at: Cell): Cell[] {
  return piece.cells.map(([r, c]) => [r + at[0], c + at[1]] as Cell);
}

/** Which placed piece covers a board cell, if any. */
export function pieceAt(state: ShapeBuilderState, cell: Cell): Piece | undefined {
  return state.pieces.find(
    (p) => p.at != null && footprint(p, p.at).some((c) => key(c) === key(cell)),
  );
}

function fits(state: ShapeBuilderState, piece: Piece, at: Cell): boolean {
  const inOutline = new Set(state.outline.map(key));
  const occupied = new Set(
    state.pieces
      .filter((p) => p.id !== piece.id && p.at != null)
      .flatMap((p) => footprint(p, p.at as Cell))
      .map(key),
  );
  return footprint(piece, at).every((cell) => inOutline.has(key(cell)) && !occupied.has(key(cell)));
}

/** Picks a piece up from the tray. Tapping the selected piece again puts it
 *  down. */
export function selectPiece(state: ShapeBuilderState, id: number): ShapeBuilderState {
  if (state.complete) return state;
  const piece = state.pieces.find((p) => p.id === id);
  if (!piece || piece.at != null) return state;
  return { ...state, selected: state.selected === id ? null : id };
}

/** Turns the selected piece a quarter clockwise. */
export function turnSelected(state: ShapeBuilderState): ShapeBuilderState {
  if (state.complete || !state.rotation || state.selected == null) return state;
  return {
    ...state,
    pieces: state.pieces.map((p) => (p.id === state.selected ? { ...p, cells: rotate(p.cells) } : p)),
  };
}

/**
 * A tap on the board.
 *
 * On a placed piece: pick it back up, ready to go somewhere else — never a
 * mistake. On an empty cell with a piece selected: put it down so it covers
 * the tapped cell. The piece's first block is tried on the tap first, since
 * that is the reading a child most often means; if that doesn't fit, the
 * other ways of covering that cell are tried in turn, so a tap anywhere
 * inside the right gap is enough. Only if no way fits is it a mistake.
 */
export function tapCell(state: ShapeBuilderState, cell: Cell): ShapeBuilderState {
  if (state.complete) return state;

  const placed = pieceAt(state, cell);
  if (placed) {
    return {
      ...state,
      pieces: state.pieces.map((p) => (p.id === placed.id ? { ...p, at: null } : p)),
      selected: placed.id,
    };
  }

  if (state.selected == null) return state;
  if (!state.outline.some((c) => key(c) === key(cell))) return state;

  const piece = state.pieces.find((p) => p.id === state.selected) as Piece;
  const anchors = piece.cells.map(([r, c]) => [cell[0] - r, cell[1] - c] as Cell);
  const at = anchors.find((anchor) => fits(state, piece, anchor));
  if (!at) return { ...state, mistakes: state.mistakes + 1 };

  const pieces = state.pieces.map((p) => (p.id === piece.id ? { ...p, at } : p));
  const complete = pieces.every((p) => p.at != null);
  return { ...state, pieces, selected: null, complete };
}

/** How many outline blocks are covered, for the progress bar. */
export function filledBlocks(state: ShapeBuilderState): number {
  return state.pieces.filter((p) => p.at != null).reduce((n, p) => n + p.cells.length, 0);
}
