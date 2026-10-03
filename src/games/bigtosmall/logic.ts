import { randInt, shuffle, type Rng } from '../../util/random';
import type { ColorKind, ShapeKind } from '../shapes/logic';

/**
 * Big to Small.
 *
 * A handful of the same shape in different sizes, jumbled. Tap them biggest
 * first, down to the smallest, and each one steps up into a line. Four sets
 * in order make a round.
 *
 * Putting things in order of size — seriation — is one of the ideas a young
 * child builds before counting makes sense: it is the same idea as "more"
 * and "less". It grows along the two things that make it hard:
 *
 *   - more things to order, from three to seven;
 *   - smaller steps between them, from each one being little more than half
 *     the size of the last to each one nine-tenths of it;
 *
 * and then along what makes size hard to *see*: from level 4 each shape is
 * turned its own way, so two sizes can't be compared by lining up edges,
 * and from level 5 the colours are mixed too, as noise to look past.
 *
 * Colour and shape never give the order away. Every shape in a set is the
 * same shape, and colours are dealt at random.
 *
 * Forgiving like everything else: tapping one out of turn costs a mistake,
 * once, and the child looks again. It stays where it is until its turn.
 */

export const SETS_PER_ROUND = 4;

const SHAPES: readonly ShapeKind[] = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond'];
/** A circle turned is the same circle, so a turned set is never circles. */
const TURNABLE: readonly ShapeKind[] = ['square', 'triangle', 'star', 'heart', 'diamond'];
const COLOURS: readonly ColorKind[] = ['berry', 'sky', 'leaf', 'sun', 'grape'];

export type Item = {
  /** 1 for the biggest, smaller for the rest. */
  readonly scale: number;
  /** 0 is the biggest, and the one to tap first. */
  readonly rank: number;
  readonly color: ColorKind;
  /** Degrees. */
  readonly turn: number;
};

export type SizeSet = {
  readonly shape: ShapeKind;
  /** In the jumbled order they're laid out in. */
  readonly items: readonly Item[];
};

export type BigToSmallState = {
  readonly set: SizeSet;
  /** Indices into `set.items`, in the order they were put in line. */
  readonly placed: readonly number[];
  /** Items tapped out of turn since the last one placed — charged once. */
  readonly missed: readonly number[];
  /** Every item in this set is in line; it stays on show for a moment. */
  readonly done: boolean;
  readonly setIndex: number;
  readonly mistakes: number;
  readonly complete: boolean;
};

type LevelSpec = {
  readonly items: number;
  /** Each item's size as a share of the one before. Closer to 1 is harder. */
  readonly ratio: number;
  /** Each item turned its own way. */
  readonly turned: boolean;
  /** Colours mixed across the set. */
  readonly mixedColours: boolean;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { items: 3, ratio: 0.6, turned: false, mixedColours: false },
  { items: 4, ratio: 0.7, turned: false, mixedColours: false },
  { items: 5, ratio: 0.78, turned: false, mixedColours: false },
  { items: 5, ratio: 0.84, turned: true, mixedColours: false },
  { items: 6, ratio: 0.87, turned: true, mixedColours: true },
  { items: 7, ratio: 0.9, turned: true, mixedColours: true },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

const TURNS = [30, 45, 60, 90, 135, 180, 225, 270, 315];

/** A new set, never the same shape as the one just done. */
export function createSet(rng: Rng, level: number, avoid: ShapeKind | null = null): SizeSet {
  const spec = specForLevel(level);
  const shapes = (spec.turned ? TURNABLE : SHAPES).filter((s) => s !== avoid);
  const shape = shapes[randInt(rng, 0, shapes.length - 1)];
  const colour = COLOURS[randInt(rng, 0, COLOURS.length - 1)];

  const items = Array.from({ length: spec.items }, (_, rank): Item => ({
    scale: spec.ratio ** rank,
    rank,
    color: spec.mixedColours ? COLOURS[randInt(rng, 0, COLOURS.length - 1)] : colour,
    turn: spec.turned ? TURNS[randInt(rng, 0, TURNS.length - 1)] : 0,
  }));

  // Jumbled, and never already in order either way round.
  let order = shuffle(rng, items);
  for (let tries = 0; tries < 20 && inOrder(order); tries += 1) order = shuffle(rng, items);
  if (inOrder(order)) order = [...order.slice(1), order[0]];
  return { shape, items: order };
}

function inOrder(items: readonly Item[]): boolean {
  const ranks = items.map((i) => i.rank);
  const up = ranks.every((r, i) => i === 0 || r > ranks[i - 1]);
  const down = ranks.every((r, i) => i === 0 || r < ranks[i - 1]);
  return up || down;
}

export function createGame(rng: Rng, level: number): BigToSmallState {
  return {
    set: createSet(rng, level),
    placed: [],
    missed: [],
    done: false,
    setIndex: 0,
    mistakes: 0,
    complete: false,
  };
}

/** The item that should be tapped next. */
export function wanted(state: BigToSmallState): number {
  return state.set.items.findIndex((item) => item.rank === state.placed.length);
}

export function tapItem(state: BigToSmallState, index: number): BigToSmallState {
  if (state.complete || state.done || state.placed.includes(index)) return state;

  if (index !== wanted(state)) {
    if (state.missed.includes(index)) return state;
    return { ...state, missed: [...state.missed, index], mistakes: state.mistakes + 1 };
  }

  const placed = [...state.placed, index];
  return { ...state, placed, missed: [], done: placed.length === state.set.items.length };
}

/** After a finished line has been seen: the next set, or the end. */
export function nextSet(state: BigToSmallState, rng: Rng, level: number): BigToSmallState {
  if (!state.done) return state;
  const setIndex = state.setIndex + 1;
  if (setIndex >= SETS_PER_ROUND) return { ...state, setIndex, done: false, complete: true };
  return { ...state, set: createSet(rng, level, state.set.shape), placed: [], missed: [], done: false, setIndex };
}
