/**
 * Small seedable PRNG.
 *
 * Games take a `Rng` rather than calling `Math.random` directly so that every
 * round-generation rule (no duplicate answers, difficulty bounds, solvability)
 * can be asserted deterministically in tests.
 */
export type Rng = () => number;

/** mulberry32 — fast, tiny, and adequate for shuffling puzzle pieces. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const systemRng: Rng = () => Math.random();

/** Integer in [min, max] inclusive. */
export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[randInt(rng, 0, items.length - 1)];
}

/** Fisher-Yates. Returns a new array; never mutates the input. */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** `count` distinct items, or all of them if the pool is smaller. */
export function sample<T>(rng: Rng, items: readonly T[], count: number): T[] {
  return shuffle(rng, items).slice(0, Math.min(count, items.length));
}

/**
 * Picks one item while preferring anything other than `avoid`, so the same
 * round never quietly repeats what the child just saw. Falls back to the full
 * pool only when avoiding would leave nothing to choose from (e.g. a
 * single-item pool), so it can never fail to return a value.
 */
export function pickFresh<T>(rng: Rng, items: readonly T[], avoid: T | null): T {
  const fresh = avoid == null ? items : items.filter((item) => item !== avoid);
  return pick(rng, fresh.length > 0 ? fresh : items);
}

/**
 * Samples `count` items while preferring ones outside `avoid`, so a new round
 * doesn't draw the same set the previous round just used. If avoiding leaves
 * too few items to fill the round, tops up from the avoided ones rather than
 * shrinking the round — freshness never comes at the cost of a broken round.
 */
export function sampleFresh<T>(
  rng: Rng,
  items: readonly T[],
  count: number,
  avoid: ReadonlySet<T>,
): T[] {
  if (avoid.size === 0) return sample(rng, items, count);

  const fresh = items.filter((item) => !avoid.has(item));
  if (fresh.length >= count) return sample(rng, fresh, count);

  const stale = items.filter((item) => avoid.has(item));
  const topUp = sample(rng, stale, count - fresh.length);
  return shuffle(rng, [...fresh, ...topUp]);
}
