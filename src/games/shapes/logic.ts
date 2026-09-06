import { sample, shuffle, type Rng } from '../../util/random';

/**
 * Shape & colour sorting.
 *
 * An item appears and the child taps the basket it belongs in. Each round sorts
 * by exactly one property — shape *or* colour, announced by the baskets
 * themselves — so the rule is never ambiguous.
 *
 * Baskets carry both a shape outline and a colour even when only one of them is
 * the sorting rule, so a colour-blind child is never asked to distinguish
 * baskets by colour alone.
 */

export type SortBy = 'shape' | 'color';

export type ShapeKind = 'circle' | 'square' | 'triangle' | 'star';

export type ColorKind = 'berry' | 'sky' | 'leaf' | 'sun';

export type Item = {
  readonly shape: ShapeKind;
  readonly color: ColorKind;
};

export type Basket = {
  /** The value this basket accepts, under the round's `sortBy` rule. */
  readonly key: ShapeKind | ColorKind;
  readonly shape: ShapeKind;
  readonly color: ColorKind;
};

export type ShapesState = {
  readonly sortBy: SortBy;
  readonly baskets: readonly Basket[];
  readonly queue: readonly Item[];
  readonly placed: number;
  readonly mistakes: number;
  readonly complete: boolean;
};

const SHAPES: readonly ShapeKind[] = ['circle', 'square', 'triangle', 'star'];
const COLORS: readonly ColorKind[] = ['berry', 'sky', 'leaf', 'sun'];

export const ITEMS_PER_ROUND = 6;

/** Basket count for a level: two to start, up to four. */
export function basketsForLevel(level: number): number {
  return Math.min(2 + Math.floor(level / 2), 4);
}

export function createGame(rng: Rng, level: number): ShapesState {
  // Level 1 always sorts by shape: it is the more concrete rule to grasp first.
  const sortBy: SortBy = level <= 1 ? 'shape' : rng() < 0.5 ? 'shape' : 'color';
  const count = basketsForLevel(level);

  const shapes = sample(rng, SHAPES, count);
  const colors = sample(rng, COLORS, count);

  const baskets: Basket[] = shapes.map((shape, i) => ({
    key: sortBy === 'shape' ? shape : colors[i],
    shape,
    color: colors[i],
  }));

  // Every item must belong to exactly one basket, and each basket should see at
  // least one item so no basket sits unused for the whole round.
  const items: Item[] = [];
  for (let i = 0; i < ITEMS_PER_ROUND; i++) {
    const basket = baskets[i % baskets.length];
    items.push(
      sortBy === 'shape'
        ? { shape: basket.shape, color: sample(rng, COLORS, 1)[0] }
        : { shape: sample(rng, SHAPES, 1)[0], color: basket.color },
    );
  }

  return {
    sortBy,
    baskets,
    queue: shuffle(rng, items),
    placed: 0,
    mistakes: 0,
    complete: false,
  };
}

export function currentItem(state: ShapesState): Item | null {
  return state.queue[state.placed] ?? null;
}

export function isMatch(state: ShapesState, item: Item, basket: Basket): boolean {
  return state.sortBy === 'shape' ? item.shape === basket.key : item.color === basket.key;
}

/**
 * Drops the current item into a basket.
 *
 * A wrong basket costs nothing but a nudge — the same item stays up until it
 * lands in the right place.
 */
export function place(state: ShapesState, basketIndex: number): ShapesState {
  if (state.complete) return state;

  const item = currentItem(state);
  const basket = state.baskets[basketIndex];
  if (!item || !basket) return state;

  if (!isMatch(state, item, basket)) {
    return { ...state, mistakes: state.mistakes + 1 };
  }

  const placed = state.placed + 1;
  return { ...state, placed, complete: placed >= state.queue.length };
}
