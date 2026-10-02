import { sampleFresh, shuffle, type Rng } from '../../util/random';

/**
 * Memory match.
 *
 * Find pairs of matching pictures on a face-down grid. No timer and no move
 * limit — the round ends only when every pair is found, so the game cannot be
 * lost, only finished.
 */

export type Card = {
  readonly id: number;
  readonly symbol: string;
  readonly colorIndex: number;
  readonly matched: boolean;
  readonly faceUp: boolean;
};

export type MemoryState = {
  readonly cards: readonly Card[];
  /** Indices currently face up and not yet resolved (0, 1, or 2 entries). */
  readonly revealed: readonly number[];
  /** Indices of cards that have been face up before, so the child could
   *  know them. */
  readonly seen: readonly number[];
  /** Mismatches the child could have avoided — see `resolvePair`. A first
   *  look at an unknown card is a guess, not a mistake. */
  readonly mistakes: number;
  readonly complete: boolean;
};

/** Concrete, nameable objects a pre-reader recognises at a glance. A pool
 *  bigger than any single round needs, combined with `createGame`'s
 *  `avoidSymbols` parameter, means a new round actively avoids the pictures
 *  the last one just used rather than merely being free to. */
const SYMBOLS = [
  '🐰', '🐸', '🐼', '🦋', '🐟', '🐝',
  '🍎', '🍌', '🍓', '⭐', '🌙', '🌻',
  '🐶', '🐱', '🐷', '🐵', '🍇', '🍊',
  '🥕', '🚗',
] as const;

/** Pairs per level. Grows gently; capped so the grid always fits a phone. */
export function pairsForLevel(level: number): number {
  return Math.min(2 + level, 8);
}

export function createGame(
  rng: Rng,
  level: number,
  avoidSymbols: ReadonlySet<string> = new Set(),
): MemoryState {
  const pairCount = pairsForLevel(level);
  const chosen = sampleFresh(rng, SYMBOLS, pairCount, avoidSymbols);

  const deck = chosen.flatMap((symbol, colorIndex) => [
    { symbol, colorIndex },
    { symbol, colorIndex },
  ]);

  return {
    cards: shuffle(rng, deck).map((card, id) => ({
      id,
      symbol: card.symbol,
      colorIndex: card.colorIndex,
      matched: false,
      faceUp: false,
    })),
    revealed: [],
    seen: [],
    mistakes: 0,
    complete: false,
  };
}

/**
 * Turns a card face up.
 *
 * Taps on an already-revealed card, a matched card, or while two cards are
 * still being compared are ignored rather than penalised — an impatient child
 * should not lose progress for tapping twice.
 */
export function flip(state: MemoryState, index: number): MemoryState {
  if (state.complete) return state;
  if (state.revealed.length >= 2) return state;

  const card = state.cards[index];
  if (!card || card.matched || card.faceUp) return state;

  const cards = state.cards.map((c, i) => (i === index ? { ...c, faceUp: true } : c));
  return { ...state, cards, revealed: [...state.revealed, index] };
}

/** True once two cards are face up and waiting to be judged. */
export function hasPendingPair(state: MemoryState): boolean {
  return state.revealed.length === 2;
}

/**
 * Resolves the two revealed cards: keeps them if they match, turns them back
 * over if they do not. Called after a short delay so the child sees both.
 *
 * A mismatch is a mistake only when memory could have prevented it: the
 * second card had been seen before (so it was known not to match), or the
 * first card's partner had been seen before (so the child could have gone
 * straight to it). Turning up two cards nobody has seen is the only way to
 * learn the board, so that costs nothing — otherwise even a child who
 * forgets nothing would lose stars to luck and the game could never step up.
 */
export function resolvePair(state: MemoryState): MemoryState {
  if (state.revealed.length !== 2) return state;

  const [a, b] = state.revealed;
  const isMatch = state.cards[a].symbol === state.cards[b].symbol;
  const known = new Set(state.seen);
  const partnerOfA = state.cards.findIndex((c, i) => i !== a && c.symbol === state.cards[a].symbol);
  const avoidable = !isMatch && (known.has(b) || known.has(partnerOfA));

  const cards = state.cards.map((card, i) => {
    if (i !== a && i !== b) return card;
    return isMatch ? { ...card, matched: true, faceUp: true } : { ...card, faceUp: false };
  });

  return {
    cards,
    revealed: [],
    seen: [...known.add(a).add(b)],
    mistakes: state.mistakes + (avoidable ? 1 : 0),
    complete: cards.every((c) => c.matched),
  };
}
