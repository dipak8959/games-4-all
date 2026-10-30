import { randInt, shuffle, type Rng } from '../../util/random';

/**
 * Water Works.
 *
 * A tap on the left, a flower on the right, and a grid of pipe pieces
 * between them, all turned the wrong way. Tap a piece to turn it a quarter
 * round. Water runs from the tap as far as the pipes join up — so the child
 * sees exactly how far they've got — and when it reaches the flower, the
 * flower drinks and the next puzzle comes. Three flowers make a round.
 *
 * It practises spatial reasoning: seeing which way a piece has to face to
 * join its neighbours, and planning a route through pieces that could each
 * go several ways. It grows from three straight pipes in a row to a
 * four-by-six grid with T-pieces and crossings as well as bends, most of
 * them leading nowhere.
 *
 * Every puzzle is made by laying a route from the tap to the flower first,
 * fitting the pieces that route needs, filling the rest of the grid, and
 * only then turning everything — so there is always a way, and it's never
 * already done when the puzzle appears. Any route that gets the water there
 * counts, not only the one it was built around.
 */

export const PUZZLES_PER_ROUND = 3;

/** Open sides, as flags. */
export const UP = 1;
export const RIGHT = 2;
export const DOWN = 4;
export const LEFT = 8;

export type PieceKind = 'straight' | 'bend' | 'tee' | 'cross';

/** Each kind's open sides when unturned. */
const SHAPE: Record<PieceKind, number> = {
  straight: UP | DOWN,
  bend: UP | RIGHT,
  tee: UP | RIGHT | DOWN,
  cross: UP | RIGHT | DOWN | LEFT,
};

export type Piece = {
  readonly kind: PieceKind;
  /** Quarter turns clockwise, 0-3. */
  readonly turn: number;
};

export type Puzzle = {
  readonly cols: number;
  readonly rows: number;
  readonly pieces: readonly Piece[];
  /** Rows the tap (on the left) and the flower (on the right) are on. */
  readonly tapRow: number;
  readonly flowerRow: number;
  /** The route it was built around — one way through, never shown. */
  readonly route: readonly number[];
  /** The fewest quarter turns that get water to the flower, by any route. */
  readonly fewestTurns: number;
};

export type WaterWorksState = {
  readonly puzzle: Puzzle;
  readonly taps: number;
  /** Across the round, for the stars. */
  readonly roundTaps: number;
  readonly roundFewest: number;
  readonly solved: boolean;
  readonly puzzleIndex: number;
  readonly complete: boolean;
};

type LevelSpec = {
  readonly cols: number;
  readonly rows: number;
  /** Kinds used to fill squares off the route. */
  readonly kinds: readonly PieceKind[];
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { cols: 3, rows: 1, kinds: ['straight'] },
  { cols: 3, rows: 2, kinds: ['straight', 'bend'] },
  { cols: 3, rows: 3, kinds: ['straight', 'bend'] },
  { cols: 4, rows: 3, kinds: ['straight', 'bend', 'tee'] },
  { cols: 4, rows: 4, kinds: ['straight', 'bend', 'tee', 'cross'] },
  { cols: 4, rows: 6, kinds: ['straight', 'bend', 'tee', 'cross'] },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

/** Turns a set of open sides a quarter clockwise, `times` times. */
function rotate(sides: number, times: number): number {
  let s = sides;
  for (let i = 0; i < ((times % 4) + 4) % 4; i += 1) s = ((s << 1) | (s >> 3)) & 15;
  return s;
}

export const openSides = (piece: Piece): number => rotate(SHAPE[piece.kind], piece.turn);

const OPPOSITE: Record<number, number> = { [UP]: DOWN, [RIGHT]: LEFT, [DOWN]: UP, [LEFT]: RIGHT };

function step(cols: number, rows: number, cell: number, side: number): number | null {
  const r = Math.floor(cell / cols);
  const c = cell % cols;
  if (side === UP) return r > 0 ? cell - cols : null;
  if (side === DOWN) return r < rows - 1 ? cell + cols : null;
  if (side === LEFT) return c > 0 ? cell - 1 : null;
  return c < cols - 1 ? cell + 1 : null;
}

/** Squares the water reaches from the tap, through joined pipes. */
export function wet(puzzle: Puzzle): number[] {
  const first = puzzle.tapRow * puzzle.cols;
  if ((openSides(puzzle.pieces[first]) & LEFT) === 0) return [];
  const seen = new Set([first]);
  let frontier = [first];
  while (frontier.length) {
    const next: number[] = [];
    for (const cell of frontier) {
      const open = openSides(puzzle.pieces[cell]);
      for (const side of [UP, RIGHT, DOWN, LEFT]) {
        if ((open & side) === 0) continue;
        const to = step(puzzle.cols, puzzle.rows, cell, side);
        if (to === null || seen.has(to)) continue;
        if ((openSides(puzzle.pieces[to]) & OPPOSITE[side]) === 0) continue;
        seen.add(to);
        next.push(to);
      }
    }
    frontier = next;
  }
  return [...seen];
}

export function isSolved(puzzle: Puzzle): boolean {
  const last = puzzle.flowerRow * puzzle.cols + puzzle.cols - 1;
  return wet(puzzle).includes(last) && (openSides(puzzle.pieces[last]) & RIGHT) !== 0;
}

/** A route of squares from the tap's square to the flower's, never crossing
 *  itself, by a random walk that backs up out of dead ends. */
function layRoute(rng: Rng, cols: number, rows: number, from: number, to: number): number[] {
  const path = [from];
  const seen = new Set([from]);
  const tried = new Map<number, number[]>();
  while (path[path.length - 1] !== to) {
    const here = path[path.length - 1];
    if (!tried.has(here)) {
      tried.set(
        here,
        shuffle(rng, [UP, RIGHT, DOWN, LEFT])
          .map((s) => step(cols, rows, here, s))
          .filter((n): n is number => n !== null),
      );
    }
    const options = (tried.get(here) as number[]).filter((n) => !seen.has(n));
    if (options.length === 0) {
      path.pop();
      tried.delete(here);
      seen.delete(here);
      continue;
    }
    const next = options[0];
    (tried.get(here) as number[]).splice((tried.get(here) as number[]).indexOf(next), 1);
    path.push(next);
    seen.add(next);
  }
  return path;
}

/** The side of `a` that faces `b`, for neighbouring squares. */
export function sideTowards(cols: number, a: number, b: number): number {
  if (b === a - cols) return UP;
  if (b === a + cols) return DOWN;
  if (b === a - 1) return LEFT;
  return RIGHT;
}

/** The piece and turn that opens exactly these sides. */
function pieceFor(sides: number): Piece {
  for (const kind of ['straight', 'bend', 'tee', 'cross'] as PieceKind[]) {
    for (let turn = 0; turn < 4; turn += 1) {
      if (rotate(SHAPE[kind], turn) === sides) return { kind, turn };
    }
  }
  throw new Error(`No piece opens ${sides}`);
}

/** Quarter turns clockwise from `turn` until the piece opens at least `need`. */
export function turnsToFit(piece: Piece, need: number): number {
  for (let t = 0; t < 4; t += 1) {
    if ((rotate(SHAPE[piece.kind], piece.turn + t) & need) === need) return t;
  }
  return 0;
}

/**
 * The cheapest way to get water from the tap to the flower, by any route: a
 * cheapest-path search over squares, where passing through a square costs
 * the quarter turns its piece needs to open where the water comes in and
 * where it goes out. Returns each square on the way with the sides it needs
 * open, and the total turns.
 */
export function cheapestWay(
  puzzle: Omit<Puzzle, 'fewestTurns'>,
): { readonly turns: number; readonly steps: readonly { cell: number; sides: number }[] } | null {
  const { cols, rows, pieces } = puzzle;
  const goal = puzzle.flowerRow * cols + cols - 1;
  // `used` is the squares the way has passed through, as bits: a way never
  // passes the same square twice, since one piece can only face one way.
  type Node = { cost: number; cell: number; from: number; used: number; back: Node | null; sides: number };
  const best = new Map<string, number>();
  const first = puzzle.tapRow * cols;
  const queue: Node[] = [{ cost: 0, cell: first, from: LEFT, used: 1 << first, back: null, sides: 0 }];
  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost);
    const node = queue.shift() as Node;
    // Out through the flower's side: the cheapest arrival, now it's the
    // cheapest thing left in the queue.
    if (node.cell === -1) {
      const steps: { cell: number; sides: number }[] = [];
      for (let n = node.back; n; n = n.back) steps.unshift({ cell: n.cell, sides: n.sides });
      return { turns: node.cost, steps };
    }
    const key = `${node.cell}:${node.from}:${node.used}`;
    if ((best.get(key) ?? Infinity) <= node.cost) continue;
    best.set(key, node.cost);
    for (const out of [UP, RIGHT, DOWN, LEFT]) {
      if (out === node.from) continue;
      const need = node.from | out;
      // Only a piece that can open both sides at once can carry the water.
      if ([0, 1, 2, 3].every((t) => (rotate(SHAPE[pieces[node.cell].kind], t) & need) !== need)) continue;
      const cost = node.cost + turnsToFit(pieces[node.cell], need);
      const here: Node = { ...node, cost, sides: need };
      if (node.cell === goal && out === RIGHT) {
        queue.push({ cost, cell: -1, from: 0, used: 0, back: here, sides: 0 });
        continue;
      }
      const next = step(cols, rows, node.cell, out);
      if (next === null || (node.used & (1 << next)) !== 0) continue;
      queue.push({ cost, cell: next, from: OPPOSITE[out], used: node.used | (1 << next), back: here, sides: 0 });
    }
  }
  return null;
}

export function createPuzzle(rng: Rng, level: number): Puzzle {
  const spec = specForLevel(level);
  const { cols, rows } = spec;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const tapRow = randInt(rng, 0, rows - 1);
    const flowerRow = randInt(rng, 0, rows - 1);
    const route = layRoute(rng, cols, rows, tapRow * cols, flowerRow * cols + cols - 1);
    const needs = new Map<number, number>();
    route.forEach((cell, i) => {
      const inSide = i === 0 ? LEFT : sideTowards(cols, cell, route[i - 1]);
      const outSide = i === route.length - 1 ? RIGHT : sideTowards(cols, cell, route[i + 1]);
      needs.set(cell, inSide | outSide);
    });

    const solvedPieces: Piece[] = Array.from({ length: cols * rows }, (_, cell) => {
      const need = needs.get(cell);
      if (need !== undefined) return pieceFor(need);
      return { kind: spec.kinds[randInt(rng, 0, spec.kinds.length - 1)], turn: 0 };
    });
    // Everything turned at random; route pieces turned away from fitting.
    const pieces = solvedPieces.map((piece, cell) => {
      const need = needs.get(cell);
      if (need === undefined) return { ...piece, turn: randInt(rng, 0, 3) };
      const wrong = [0, 1, 2, 3].filter((t) => (rotate(SHAPE[piece.kind], t) & need) !== need);
      return { ...piece, turn: wrong.length ? wrong[randInt(rng, 0, wrong.length - 1)] : piece.turn };
    });
    const laid = { cols, rows, pieces, tapRow, flowerRow, route };
    const puzzle: Puzzle = { ...laid, fewestTurns: cheapestWay(laid)?.turns ?? Infinity };
    // Not already done, and no shortcut through the other pieces that makes
    // it trivial: at least a turn for every four squares of grid.
    if (!isSolved(puzzle) && puzzle.fewestTurns >= Math.ceil((cols * rows) / 4)) return puzzle;
  }
  throw new Error(`No puzzle for level ${level}`);
}

function fresh(rng: Rng, level: number, prev?: WaterWorksState): WaterWorksState {
  const puzzle = createPuzzle(rng, level);
  return {
    puzzle,
    taps: 0,
    roundTaps: prev?.roundTaps ?? 0,
    roundFewest: (prev?.roundFewest ?? 0) + puzzle.fewestTurns,
    solved: false,
    puzzleIndex: prev ? prev.puzzleIndex + 1 : 0,
    complete: false,
  };
}

export function createGame(rng: Rng, level: number): WaterWorksState {
  return fresh(rng, level);
}

/** A tap on a piece: a quarter turn clockwise. */
export function turnPiece(state: WaterWorksState, cell: number): WaterWorksState {
  if (state.solved || state.complete) return state;
  const piece = state.puzzle.pieces[cell];
  if (piece === undefined) return state;
  const pieces = state.puzzle.pieces.map((p, i) => (i === cell ? { ...p, turn: (p.turn + 1) % 4 } : p));
  const puzzle = { ...state.puzzle, pieces };
  return { ...state, puzzle, taps: state.taps + 1, roundTaps: state.roundTaps + 1, solved: isSolved(puzzle) };
}

/** After a watered flower has been seen: the next puzzle, or the end. */
export function nextPuzzle(state: WaterWorksState, rng: Rng, level: number): WaterWorksState {
  if (!state.solved) return state;
  if (state.puzzleIndex + 1 >= PUZZLES_PER_ROUND) return { ...state, solved: false, complete: true };
  return fresh(rng, level, state);
}

/**
 * Stars from how directly it was solved. Half again the fewest turns, and a
 * couple spare, is three stars — trying a piece round to see is part of it —
 * three times is two.
 */
export function starsForTurns(taps: number, fewest: number): number {
  if (taps <= Math.ceil(fewest * 1.5) + 2) return 3;
  if (taps <= fewest * 3 + 4) return 2;
  return 1;
}
