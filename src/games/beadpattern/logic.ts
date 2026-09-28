import { pick, sample, shuffle, type Rng } from '../../util/random';
import type { ColorKind, ShapeKind } from '../shapes/logic';

/**
 * Bead Patterns.
 *
 * A string of beads that follows a pattern — round, square, round, square —
 * with the end of the string still bare. Tap the bead that comes next.
 *
 * It practises spotting a repeating pattern and carrying it on: the kind of
 * thinking counting, reading and music are all built on. It grows with the
 * player: longer patterns, more beads to choose from, two beads to add
 * instead of one, and beads that differ only by their shape.
 *
 * Kind like everything else: a wrong bead just isn't threaded. Eight strings
 * is the round, fixed before the first bead. There's no score: the stars
 * come from how few wrong beads.
 */

export const STRINGS = 8;
/** Beads shown before the bare end of the string. */
export const SHOWN = 8;

export type Bead = { readonly shape: ShapeKind; readonly color: ColorKind };

export type BeadString = {
  /** The whole string, the missing beads last. */
  readonly beads: readonly Bead[];
  readonly missing: number;
  readonly choices: readonly Bead[];
};

export type BeadPatternState = {
  readonly strings: readonly BeadString[];
  readonly index: number;
  /** Beads threaded onto the bare end of this string so far. */
  readonly threaded: number;
  readonly ruledOut: readonly number[];
  readonly mistakes: number;
  readonly complete: boolean;
};

type LevelSpec = {
  /** The repeating units that can come up, as letters for beads. */
  readonly units: readonly string[];
  readonly choices: number;
  readonly missing: number;
  /** Every bead the same colour, told apart by shape alone. */
  readonly lookAlike: boolean;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { units: ['AB'], choices: 3, missing: 1, lookAlike: false },
  { units: ['AB', 'AAB', 'ABB'], choices: 3, missing: 1, lookAlike: false },
  { units: ['ABC', 'AAB', 'ABB'], choices: 4, missing: 1, lookAlike: false },
  { units: ['AABB', 'ABC', 'ABAC'], choices: 4, missing: 1, lookAlike: false },
  { units: ['AABB', 'ABAC', 'ABCD', 'ABBC'], choices: 4, missing: 2, lookAlike: false },
  { units: ['ABCD', 'ABBC', 'AABC', 'ABCB'], choices: 4, missing: 2, lookAlike: true },
];

export function specForLevel(level: number): LevelSpec & { readonly longest: number } {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  const spec = LEVELS[index];
  return { ...spec, longest: Math.max(...spec.units.map((u) => u.length)) };
}

const SHAPES: readonly ShapeKind[] = ['circle', 'square', 'triangle', 'star', 'diamond', 'heart'];
const COLORS: readonly ColorKind[] = ['berry', 'sky', 'leaf', 'sun', 'grape'];

export const same = (a: Bead, b: Bead) => a.shape === b.shape && a.color === b.color;

function makeString(rng: Rng, spec: LevelSpec): BeadString {
  const unit = pick(rng, spec.units);
  const letters = [...new Set(unit)];
  // Beads from outside the pattern too, as wrong choices: at least one,
  // and as many as it takes to fill the choices.
  const extra = Math.max(1, spec.choices - letters.length);
  const shapes = sample(rng, SHAPES, letters.length + extra);
  const oneColour = pick(rng, COLORS);
  const colors = spec.lookAlike ? shapes.map(() => oneColour) : sample(rng, COLORS, Math.min(COLORS.length, letters.length + extra));
  const bead: Record<string, Bead> = {};
  letters.forEach((l, i) => {
    bead[l] = { shape: shapes[i], color: colors[i % colors.length] };
  });
  const outsiders: Bead[] = Array.from({ length: extra }, (_, i) => ({ shape: shapes[letters.length + i], color: colors[(letters.length + i) % colors.length] }));
  const beads = Array.from({ length: SHOWN + spec.missing }, (_, i) => bead[unit[i % unit.length]]);
  const pool = [...letters.map((l) => bead[l]), ...outsiders];
  const choices = shuffle(rng, pool).slice(0, spec.choices);
  // Every bead the string still needs is among the choices.
  for (const needed of beads.slice(SHOWN)) {
    if (!choices.some((c) => same(c, needed))) choices[choices.findIndex((c) => !beads.slice(SHOWN).some((n) => same(n, c)))] = needed;
  }
  return { beads, missing: spec.missing, choices: shuffle(rng, choices) };
}

export function createGame(rng: Rng, level: number): BeadPatternState {
  const spec = specForLevel(level);
  const strings = Array.from({ length: STRINGS }, () => makeString(rng, spec));
  return { strings, index: 0, threaded: 0, ruledOut: [], mistakes: 0, complete: false };
}

export function stringNow(state: BeadPatternState): BeadString {
  return state.strings[Math.min(state.index, state.strings.length - 1)];
}

/** A bead tapped: threaded if it's the one that comes next, ruled out if
 *  not. The string's last bead threaded, on to the next string. */
export function choose(state: BeadPatternState, choice: number): BeadPatternState {
  if (state.complete || state.ruledOut.includes(choice)) return state;
  const str = stringNow(state);
  const wanted = str.beads[SHOWN + state.threaded];
  if (!same(str.choices[choice], wanted)) return { ...state, ruledOut: [...state.ruledOut, choice], mistakes: state.mistakes + 1 };
  const threaded = state.threaded + 1;
  if (threaded < str.missing) return { ...state, threaded, ruledOut: [] };
  const index = state.index + 1;
  return { ...state, index, threaded: 0, ruledOut: [], complete: index >= state.strings.length };
}
