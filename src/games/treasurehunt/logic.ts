import { randInt, type Rng } from '../../util/random';

/**
 * Treasure Hunt.
 *
 * Treasure is buried under one square of a map. Tap a square to dig it: if
 * the treasure isn't there, the hole shows a clue to where it is. Find it,
 * and the next map comes. Three treasures make a round.
 *
 * It practises deduction — putting clues together to work out what must be
 * true — and grows by making each clue say less:
 *
 *   - At first each hole shows an arrow pointing towards the treasure, and
 *     one or two digs are enough to see where it is.
 *   - From level 4 a hole shows only how many steps away the treasure is,
 *     walking up, down and across. One clue is a ring of squares it could
 *     be; two or three clues, put together, leave only one.
 *
 * There is no limit on digging, and nothing to lose. A dig is only counted
 * as a mistake when the clues already dug had ruled that square out — so
 * guessing is never punished, only ignoring what the map has said.
 */

export const MAPS_PER_ROUND = 3;

export type ClueKind = 'arrow' | 'steps';

/** Which way the treasure lies from a square: -1, 0 or 1 across and down. */
export type Arrow = { readonly dx: -1 | 0 | 1; readonly dy: -1 | 0 | 1 };

export type TreasureMap = {
  readonly cols: number;
  readonly rows: number;
  readonly treasure: number;
  readonly clue: ClueKind;
};

export type TreasureHuntState = {
  readonly map: TreasureMap;
  /** Squares dug on this map, in order. */
  readonly dug: readonly number[];
  readonly found: boolean;
  readonly mapIndex: number;
  readonly mistakes: number;
  readonly complete: boolean;
};

type LevelSpec = {
  readonly cols: number;
  readonly rows: number;
  readonly clue: ClueKind;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { cols: 3, rows: 3, clue: 'arrow' },
  { cols: 3, rows: 4, clue: 'arrow' },
  { cols: 4, rows: 5, clue: 'arrow' },
  { cols: 4, rows: 5, clue: 'steps' },
  { cols: 4, rows: 6, clue: 'steps' },
  { cols: 4, rows: 7, clue: 'steps' },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

const colOf = (map: TreasureMap, cell: number) => cell % map.cols;
const rowOf = (map: TreasureMap, cell: number) => Math.floor(cell / map.cols);

/** The arrow a hole at `cell` shows if the treasure is at `treasure`. */
export function arrowFrom(map: TreasureMap, cell: number, treasure: number = map.treasure): Arrow {
  return {
    dx: Math.sign(colOf(map, treasure) - colOf(map, cell)) as -1 | 0 | 1,
    dy: Math.sign(rowOf(map, treasure) - rowOf(map, cell)) as -1 | 0 | 1,
  };
}

/** Steps from `cell` to the treasure, walking up, down and across. */
export function stepsFrom(map: TreasureMap, cell: number, treasure: number = map.treasure): number {
  return Math.abs(colOf(map, treasure) - colOf(map, cell)) + Math.abs(rowOf(map, treasure) - rowOf(map, cell));
}

function sameClue(map: TreasureMap, dug: number, a: number, b: number): boolean {
  if (map.clue === 'steps') return stepsFrom(map, dug, a) === stepsFrom(map, dug, b);
  const x = arrowFrom(map, dug, a);
  const y = arrowFrom(map, dug, b);
  return x.dx === y.dx && x.dy === y.dy;
}

/** Squares the treasure could still be under, given what's been dug. */
export function stillPossible(map: TreasureMap, dug: readonly number[]): number[] {
  return Array.from({ length: map.cols * map.rows }, (_, c) => c).filter(
    (c) => !dug.includes(c) && dug.every((d) => sameClue(map, d, c, map.treasure)),
  );
}

export function createMap(rng: Rng, level: number): TreasureMap {
  const spec = specForLevel(level);
  return { cols: spec.cols, rows: spec.rows, clue: spec.clue, treasure: randInt(rng, 0, spec.cols * spec.rows - 1) };
}

export function createGame(rng: Rng, level: number): TreasureHuntState {
  return { map: createMap(rng, level), dug: [], found: false, mapIndex: 0, mistakes: 0, complete: false };
}

export function dig(state: TreasureHuntState, cell: number): TreasureHuntState {
  if (state.found || state.complete || state.dug.includes(cell)) return state;
  if (cell < 0 || cell >= state.map.cols * state.map.rows) return state;
  const ruledOut = !stillPossible(state.map, state.dug).includes(cell);
  return {
    ...state,
    dug: [...state.dug, cell],
    found: cell === state.map.treasure,
    mistakes: state.mistakes + (ruledOut ? 1 : 0),
  };
}

/** After a found treasure has been seen: the next map, or the end. */
export function nextMap(state: TreasureHuntState, rng: Rng, level: number): TreasureHuntState {
  if (!state.found) return state;
  const mapIndex = state.mapIndex + 1;
  if (mapIndex >= MAPS_PER_ROUND) return { ...state, mapIndex, found: false, complete: true };
  let map = createMap(rng, level);
  // Never under the same square twice running.
  for (let tries = 0; tries < 10 && map.treasure === state.map.treasure; tries += 1) map = createMap(rng, level);
  return { ...state, map, dug: [], found: false, mapIndex };
}
