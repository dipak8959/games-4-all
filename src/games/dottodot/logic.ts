import { shuffle, type Rng } from '../../util/random';

/**
 * Dot to Dot.
 *
 * Numbered dots, scattered round the edge of a hidden picture. Tap them in
 * order — 1, 2, 3 — and a line joins each to the last. Join the last dot to
 * the first and the picture shows.
 *
 * It practises number order: finding what comes next, and knowing a number
 * by sight wherever it is on the page. It grows with the player: more dots,
 * then no ring round the next one, then counting in twos, and in fives.
 *
 * Kind like everything else: a wrong dot is just a nudge; the line waits at
 * the right one. Five pictures is the round, fixed before the first dot.
 * There's no score: the stars come from how few wrong dots.
 */

export const FIELD_WIDTH = 320;
export const FIELD_HEIGHT = 440;
export const PICTURES_PER_ROUND = 5;
/** A tap this close to a dot is on it. */
export const REACH = 44;

type Outline = { readonly name: string; readonly points: readonly (readonly [number, number])[] };

const star = (): [number, number][] =>
  Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 0.25 : 0.47;
    return [0.5 + Math.cos(a) * r, 0.52 + Math.sin(a) * r];
  });
const heart = (): [number, number][] =>
  Array.from({ length: 40 }, (_, i) => {
    const t = (i / 40) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return [0.5 + x / 36, 0.46 - y / 36];
  });

/** The pictures, each one closed line round its edge, in a 1-by-1 box. */
export const OUTLINES: readonly Outline[] = [
  { name: 'star', points: star() },
  { name: 'heart', points: heart() },
  { name: 'house', points: [[0.18, 0.92], [0.18, 0.46], [0.5, 0.12], [0.82, 0.46], [0.82, 0.92]] },
  { name: 'fish', points: [[0.08, 0.5], [0.3, 0.28], [0.58, 0.26], [0.74, 0.42], [0.94, 0.26], [0.94, 0.74], [0.74, 0.58], [0.58, 0.74], [0.3, 0.72]] },
  { name: 'boat', points: [[0.08, 0.62], [0.46, 0.62], [0.46, 0.1], [0.84, 0.56], [0.54, 0.56], [0.54, 0.62], [0.92, 0.62], [0.76, 0.86], [0.24, 0.86]] },
  { name: 'tree', points: [[0.5, 0.06], [0.76, 0.38], [0.62, 0.38], [0.84, 0.68], [0.6, 0.68], [0.6, 0.94], [0.4, 0.94], [0.4, 0.68], [0.16, 0.68], [0.38, 0.38], [0.24, 0.38]] },
  { name: 'rocket', points: [[0.5, 0.04], [0.66, 0.26], [0.66, 0.66], [0.82, 0.88], [0.6, 0.82], [0.5, 0.94], [0.4, 0.82], [0.18, 0.88], [0.34, 0.66], [0.34, 0.26]] },
  { name: 'kite', points: [[0.5, 0.06], [0.84, 0.4], [0.5, 0.94], [0.16, 0.4]] },
  { name: 'cat', points: [[0.16, 0.9], [0.16, 0.32], [0.26, 0.06], [0.42, 0.28], [0.58, 0.28], [0.74, 0.06], [0.84, 0.32], [0.84, 0.9]] },
  { name: 'crown', points: [[0.12, 0.82], [0.12, 0.26], [0.32, 0.5], [0.5, 0.16], [0.68, 0.5], [0.88, 0.26], [0.88, 0.82]] },
];

export type Dot = { readonly x: number; readonly y: number; readonly label: number };

export type DotToDotState = {
  readonly hint: boolean;
  readonly pictures: readonly { readonly name: string; readonly dots: readonly Dot[] }[];
  readonly index: number;
  /** Dots joined so far on this picture. */
  readonly joined: number;
  readonly mistakes: number;
  readonly done: boolean;
  readonly complete: boolean;
};

type LevelSpec = {
  readonly dots: number;
  /** The numbers count up in these steps. */
  readonly step: number;
  /** The next dot to join has a ring round it. */
  readonly hint: boolean;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { dots: 5, step: 1, hint: true },
  { dots: 7, step: 1, hint: true },
  { dots: 9, step: 1, hint: false },
  { dots: 10, step: 1, hint: false },
  { dots: 10, step: 2, hint: false },
  { dots: 12, step: 5, hint: false },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

/** Evenly spaced points round a closed outline, starting `from` of the way
 *  round. */
export function resample(points: readonly (readonly [number, number])[], count: number, from = 0): [number, number][] {
  const closed = [...points, points[0]];
  const lengths = closed.slice(1).map((p, i) => Math.hypot(p[0] - closed[i][0], p[1] - closed[i][1]));
  const total = lengths.reduce((a, b) => a + b, 0);
  const out: [number, number][] = [];
  let seg = 0;
  let before = 0;
  for (let i = 0; i < count; i += 1) {
    const want = (total * ((i + from) % count)) / count;
    while (before + lengths[seg] < want) before += lengths[seg++];
    const t = lengths[seg] ? (want - before) / lengths[seg] : 0;
    const [a, b] = [closed[seg], closed[seg + 1]];
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}

/** The outline in the field: kept square, and in from the edges. */
function place(u: number, v: number): { x: number; y: number } {
  const side = FIELD_WIDTH - 50;
  return { x: 25 + u * side, y: (FIELD_HEIGHT - side) / 2 + v * side };
}

/** Dots round an outline, slid round it to wherever they sit furthest
 *  apart, so no two crowd a finger. */
function spread(points: readonly (readonly [number, number])[], count: number): { x: number; y: number }[] {
  let best: { x: number; y: number }[] = [];
  let bestGap = -1;
  for (let k = 0; k < 20; k += 1) {
    const dots = resample(points, count, k / 20).map(([u, v]) => place(u, v));
    let least = Infinity;
    for (let i = 0; i < dots.length; i += 1) {
      for (let j = i + 1; j < dots.length; j += 1) least = Math.min(least, Math.hypot(dots[i].x - dots[j].x, dots[i].y - dots[j].y));
    }
    if (least > bestGap) {
      bestGap = least;
      best = dots;
    }
  }
  return best;
}

export function createGame(rng: Rng, level: number): DotToDotState {
  const spec = specForLevel(level);
  const pictures = shuffle(rng, OUTLINES)
    .slice(0, PICTURES_PER_ROUND)
    .map((o) => ({ name: o.name, dots: spread(o.points, spec.dots).map((p, i) => ({ ...p, label: spec.step * (i + 1) })) }));
  return { hint: spec.hint, pictures, index: 0, joined: 0, mistakes: 0, done: false, complete: false };
}

/** The dot nearest a tap, if the tap is near enough to any. */
export function dotAt(state: DotToDotState, x: number, y: number): number | null {
  const dots = state.pictures[state.index].dots;
  let best: number | null = null;
  let bestD = REACH;
  dots.forEach((d, i) => {
    const dist = Math.hypot(d.x - x, d.y - y);
    if (dist < bestD) {
      best = i;
      bestD = dist;
    }
  });
  return best;
}

/** A dot tapped: joined if it's next, a nudge if not. Joining the first
 *  dot again, after the last, closes the picture. */
export function tapDot(state: DotToDotState, dot: number): DotToDotState {
  if (state.complete || state.done) return state;
  const count = state.pictures[state.index].dots.length;
  const next = state.joined % count;
  if (dot < state.joined && !(state.joined === count && dot === 0)) return state;
  if (dot !== next) return { ...state, mistakes: state.mistakes + 1 };
  const joined = state.joined + 1;
  return { ...state, joined, done: joined > count };
}

/** On to the next picture, once one is finished. */
export function nextPicture(state: DotToDotState): DotToDotState {
  if (!state.done || state.complete) return state;
  const index = state.index + 1;
  if (index >= state.pictures.length) return { ...state, complete: true };
  return { ...state, index, joined: 0, done: false };
}
