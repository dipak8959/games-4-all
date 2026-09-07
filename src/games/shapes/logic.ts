import { pick, sampleFresh, shuffle, type Rng } from '../../util/random';

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
 *
 * `avoidSortBy` keeps the same rule from ever running twice in a row: the
 * usual weighted roll happens first (so the overall mix of rules is
 * unchanged), and only a roll that lands on the previous round's rule gets
 * re-picked, uniformly, from whatever else is available at this level.
 */
export function sortRuleForLevel(rng: Rng, level: number, avoidSortBy: SortBy | null = null): SortBy {
  const roll = (): SortBy => {
    if (level <= 1) return 'shape';
    if (level === 2) return rng() < 0.5 ? 'shape' : 'color';
    const r = rng();
    if (r < 0.4) return 'shape';
    if (r < 0.8) return 'color';
    return 'size';
  };

  const first = roll();
  if (first !== avoidSortBy) return first;

  const options: readonly SortBy[] = level <= 1 ? ['shape'] : level === 2 ? ['shape', 'color'] : ['shape', 'color', 'size'];
  const rest = options.filter((o) => o !== avoidSortBy);
  // If the only option at this level is the one being avoided (level 1),
  // the pedagogical rule wins: stay on 'shape' rather than force a repeat.
  return rest.length > 0 ? pick(rng, rest) : first;
}

/** Basket count for shape/colour rounds: two to start, growing with level, but
 *  never more than the pool for that attribute (so baskets stay distinct).
 *  Size rounds always use exactly two baskets — small and big are the only
 *  two values there ever are. */
export function basketsForLevel(sortBy: 'shape' | 'color', level: number): number {
  const pool = sortBy === 'shape' ? SHAPES.length : COLORS.length;
  return Math.min(2 + Math.floor(level / 2), pool);
}

/** What the previous round used, so the next one can avoid repeating it and
 *  feel fresh rather than reusing the same rule or the same set of shapes or
 *  colours two rounds running. Every field defaults to "nothing to avoid",
 *  so a game's very first round is unaffected. */
export type ShapesHistory = {
  readonly sortBy: SortBy | null;
  readonly shapes: ReadonlySet<ShapeKind>;
  readonly colors: ReadonlySet<ColorKind>;
};

export const EMPTY_SHAPES_HISTORY: ShapesHistory = {
  sortBy: null,
  shapes: new Set(),
  colors: new Set(),
};

/** JSON-safe form of `ShapesHistory`, for persisting it (a `Set` doesn't
 *  survive `JSON.stringify`). */
export type SerializedShapesHistory = {
  readonly sortBy: SortBy | null;
  readonly shapes: readonly ShapeKind[];
  readonly colors: readonly ColorKind[];
};

export function serializeHistory(history: ShapesHistory): SerializedShapesHistory {
  return { sortBy: history.sortBy, shapes: [...history.shapes], colors: [...history.colors] };
}

/** Accepts whatever a storage read hands back — including `undefined` for a
 *  game that has never been played, or a shape that doesn't match if storage
 *  ever changed format — and always returns a usable history. */
export function deserializeHistory(data: unknown): ShapesHistory {
  if (!data || typeof data !== 'object') return EMPTY_SHAPES_HISTORY;
  const { sortBy, shapes, colors } = data as Partial<SerializedShapesHistory>;
  return {
    sortBy: sortBy === 'shape' || sortBy === 'color' || sortBy === 'size' ? sortBy : null,
    shapes: new Set(Array.isArray(shapes) ? shapes : []),
    colors: new Set(Array.isArray(colors) ? colors : []),
  };
}

export function createGame(rng: Rng, level: number, avoid: ShapesHistory = EMPTY_SHAPES_HISTORY): ShapesState {
  const sortBy = sortRuleForLevel(rng, level, avoid.sortBy);

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
  // Only the attribute that actually matters this round is kept fresh — the
  // other one is decorative regardless, so staleness there isn't noticeable.
  const shapes =
    sortBy === 'shape' ? sampleFresh(rng, SHAPES, count, avoid.shapes) : sampleFresh(rng, SHAPES, count, new Set());
  const colors =
    sortBy === 'color' ? sampleFresh(rng, COLORS, count, avoid.colors) : sampleFresh(rng, COLORS, count, new Set());

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

/** Builds the `avoid` history for the *next* round from the round that just
 *  finished, so `ShapesScreen` doesn't need to know which fields matter. */
export function historyFrom(state: ShapesState): ShapesHistory {
  return {
    sortBy: state.sortBy,
    shapes: new Set(state.baskets.map((b) => b.shape)),
    colors: new Set(state.baskets.map((b) => b.color)),
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
