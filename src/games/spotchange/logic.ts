import { pick, randInt, sample, shuffle, type Rng } from '../../util/random';
import type { ColorKind, ShapeKind } from '../shapes/logic';

/**
 * Spot the Change.
 *
 * Two little pictures of shapes, one above the other. Something in the
 * bottom one is different: a shape gone, a shape added, a shape swapped for
 * another, or one moved. Tap where it changed.
 *
 * It practises careful looking — checking place by place rather than
 * glancing — and, at the top, remembering: the top picture is covered after
 * a few seconds. It grows with the player: bigger pictures, more kinds of
 * change, and the top picture hidden sooner.
 *
 * Kind like everything else: a wrong place is just crossed off. Eight pairs
 * is the round, fixed before the first. There's no score: the stars come
 * from how few wrong places.
 */

export const PAIRS = 8;

export type Item = { readonly shape: ShapeKind; readonly color: ColorKind } | null;
export type Change = 'missing' | 'added' | 'shape' | 'moved';
export const CHANGES: readonly Change[] = ['missing', 'added', 'shape', 'moved'];

export type Pair = {
  readonly rows: number;
  readonly cols: number;
  readonly before: readonly Item[];
  readonly after: readonly Item[];
  readonly change: Change;
  /** The places that changed: one, or two for a move. */
  readonly changed: readonly number[];
};

export type SpotChangeState = {
  readonly pairs: readonly Pair[];
  readonly index: number;
  /** Seconds the top picture shows before it's covered (Infinity: never). */
  readonly showFor: number;
  readonly ruledOut: readonly number[];
  readonly mistakes: number;
  readonly complete: boolean;
};

type LevelSpec = {
  readonly rows: number;
  readonly cols: number;
  /** How many of `CHANGES`, from the start, can happen. */
  readonly kinds: number;
  readonly showFor: number;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { rows: 2, cols: 2, kinds: 1, showFor: Infinity },
  { rows: 2, cols: 3, kinds: 2, showFor: Infinity },
  { rows: 3, cols: 3, kinds: 3, showFor: Infinity },
  { rows: 3, cols: 3, kinds: 4, showFor: Infinity },
  { rows: 3, cols: 4, kinds: 4, showFor: 6 },
  { rows: 4, cols: 4, kinds: 4, showFor: 4 },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

const SHAPES: readonly ShapeKind[] = ['circle', 'square', 'triangle', 'star', 'diamond', 'heart'];
const COLORS: readonly ColorKind[] = ['berry', 'sky', 'leaf', 'sun', 'grape'];

function makePair(rng: Rng, spec: LevelSpec, change: Change): Pair {
  const cells = spec.rows * spec.cols;
  // Most places filled, a few empty so things can be added or moved there.
  const filled = Math.max(2, Math.min(cells - 1, Math.round(cells * 0.66)));
  const where = sample(
    rng,
    Array.from({ length: cells }, (_, i) => i),
    filled,
  );
  const before: Item[] = Array.from({ length: cells }, (_, i) => (where.includes(i) ? { shape: pick(rng, SHAPES), color: pick(rng, COLORS) } : null));
  const after = [...before];
  const full = before.flatMap((it, i) => (it ? [i] : []));
  const empty = before.flatMap((it, i) => (it ? [] : [i]));
  let changed: number[];
  if (change === 'missing') {
    const at = pick(rng, full);
    after[at] = null;
    changed = [at];
  } else if (change === 'added') {
    const at = pick(rng, empty);
    after[at] = { shape: pick(rng, SHAPES), color: pick(rng, COLORS) };
    changed = [at];
  } else if (change === 'shape') {
    const at = pick(rng, full);
    const was = before[at] as NonNullable<Item>;
    after[at] = { shape: pick(rng, SHAPES.filter((s) => s !== was.shape)), color: was.color };
    changed = [at];
  } else {
    const from = pick(rng, full);
    const to = pick(rng, empty);
    after[to] = before[from];
    after[from] = null;
    changed = [from, to];
  }
  return { rows: spec.rows, cols: spec.cols, before, after, change, changed };
}

export function createGame(rng: Rng, level: number): SpotChangeState {
  const spec = specForLevel(level);
  const kinds = CHANGES.slice(0, spec.kinds);
  // Every kind of change the level has comes up, the rest at random.
  const changes = shuffle(rng, Array.from({ length: PAIRS }, (_, i) => (i < kinds.length ? kinds[i] : kinds[randInt(rng, 0, kinds.length - 1)])));
  return { pairs: changes.map((c) => makePair(rng, spec, c)), index: 0, showFor: spec.showFor, ruledOut: [], mistakes: 0, complete: false };
}

export function pairNow(state: SpotChangeState): Pair {
  return state.pairs[Math.min(state.index, state.pairs.length - 1)];
}

/** A place tapped in the bottom picture: found, or crossed off. */
export function tapPlace(state: SpotChangeState, place: number): SpotChangeState {
  if (state.complete || state.ruledOut.includes(place)) return state;
  const pair = pairNow(state);
  if (!pair.changed.includes(place)) return { ...state, ruledOut: [...state.ruledOut, place], mistakes: state.mistakes + 1 };
  const index = state.index + 1;
  return { ...state, index, ruledOut: [], complete: index >= state.pairs.length };
}

/** Whether two places hold the same thing. */
export function sameItem(a: Item, b: Item): boolean {
  if (!a || !b) return a === b;
  return a.shape === b.shape && a.color === b.color;
}
