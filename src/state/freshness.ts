/**
 * "What did this game just show?" — one small, opaque record per game, kept
 * only so the next round can avoid repeating it (see `sampleFresh`/`pickFresh`
 * in `src/util/random.ts`).
 *
 * Deliberately generic: this module doesn't know or care what a "memory
 * picture set" or a "shapes history" looks like, only that each game owns a
 * JSON-serialisable value it can hand back to itself later. That keeps this
 * store decoupled from game-specific types, the same way `progress.ts` stays
 * decoupled from what a "round" means to any particular game.
 *
 * Contains no identifying information — just recently-shown content, the
 * same content already visible in the game itself.
 */

export type Freshness = Readonly<Record<string, unknown>>;

export const EMPTY_FRESHNESS: Freshness = {};

export function freshnessFor(freshness: Freshness, gameId: string): unknown {
  return freshness[gameId];
}

export function withFreshness(freshness: Freshness, gameId: string, value: unknown): Freshness {
  return { ...freshness, [gameId]: value };
}
