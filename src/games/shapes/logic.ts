import { pick, sample, shuffle, type Rng } from '../../util/random';

/**
 * Shape, colour & size sorting.
 *
 * An item appears and the child taps the basket it belongs in. Each round
 * sorts by exactly one property — shape, colour, *or* size — announced by the
 * baskets themselves, so the rule is never ambiguous.
 *
 * Every item and basket always carries all three attributes, even though only
 * one is the sorting rule for a given round: the two that don't matter are
 * still picked randomly, so a colour-blind (or size-indifferent) child is
 * never asked to distinguish baskets by the one property they can't use.
 */

export type SortBy = 'shape' | 'color' | 'size';

export type ShapeKind = 'circle' | 'square' | 'triangle' | 'star' | 'diamond' | 'heart';

export type ColorKind = 'berry' | 'sky' | 'leaf' | 'sun' | 'grape';

export type SizeKind = 'small' | 'big';

export type Item = {
  readonly shape: ShapeKind;
  readonly color: ColorKind;
  readonly size: SizeKind;
};

export type Basket = {
  /** The value this basket accepts, under the round's `sortBy` rule. */
  readonly key: ShapeKind | ColorKind | SizeKind;
  /** Decorative when `sortBy` isn't 'shape'/'color': still shown, so the
   *  basket always reads as a real object rather than a bare label. */
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

const SHAPES: readonly ShapeKind[] = ['circle', 'square', 'triangle', 'star', 'diamond', 'heart'];
const COLORS: readonly ColorKind[] = ['berry', 'sky', 'leaf', 'sun', 'grape'];
const SIZES: readonly SizeKind[] = ['small', 'big'];

export const ITEMS_PER_ROUND = 6;

/**
 * Which rule a round uses.
 *
 * Level 1 always sorts by shape — the most concrete rule to grasp first. Size
 * only appears from level 3 on, once a child has shown they can handle two
 * baskets reliably; it is a harder discrimination than shape or colour
 * because the *irrelevant* shape and colour actively compete for attention.
 */
export function sortRuleForLevel(rng: Rng, level: number): SortBy {
  if (level <= 1) return 'shape';
  if (level === 2) return rng() < 0.5 ? 'shape' : 'color';
  const roll = rng();
  if (roll < 0.4) return 'shape';
  if (roll < 0.8) return 'color';
  return 'size';
}

/** Basket count for shape/colour rounds: two to start, growing with level, but
 *  never more than the pool for that attribute (so baskets stay distinct).
 *  Size rounds always use exactly two baskets — small and big are the only
 *  two values there ever are. */
export function basketsForLevel(sortBy: 'shape' | 'color', level: number): number {
  const pool = sortBy === 'shape' ? SHAPES.length : COLORS.length;
  return Math.min(2 + Math.floor(level / 2), pool);
}

export function createGame(rng: Rng, level: number): ShapesState {
  const sortBy = sortRuleForLevel(rng, level);

  if (sortBy === 'size') {
    const baskets: Basket[] = SIZES.map((size) => ({
      key: size,
      shape: pick(rng, SHAPES),
      color: pick(rng, COLORS),
    }));

    const items: Item[] = [];
    for (let i = 0; i < ITEMS_PER_ROUND; i++) {
      items.push({ shape: pick(rng, SHAPES), color: pick(rng, COLORS), size: SIZES[i % SIZES.length] });
    }

    return { sortBy, baskets, queue: shuffle(rng, items), placed: 0, mistakes: 0, complete: false };
  }

  const count = basketsForLevel(sortBy, level);
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
        ? { shape: basket.shape, color: pick(rng, COLORS), size: pick(rng, SIZES) }
        : { shape: pick(rng, SHAPES), color: basket.color, size: pick(rng, SIZES) },
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
  if (state.sortBy === 'shape') return item.shape === basket.key;
  if (state.sortBy === 'color') return item.color === basket.key;
  return item.size === basket.key;
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
