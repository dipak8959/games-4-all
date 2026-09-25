import { randInt, type Rng } from '../../util/random';
import type { ColorKind, ShapeKind } from '../shapes/logic';

/**
 * Odd One Out.
 *
 * A group of shapes, all alike but one. Tap the one that's different. Six
 * groups make a round, and the round is over.
 *
 * It scales from a three-year-old to an adult without changing what the
 * game is: at the start it's three shapes and the odd one is a different
 * shape *and* colour; at the top it's sixteen shapes in a jumble of colours,
 * and the odd one is only a little smaller, or upside down. That is a real
 * visual search for anybody.
 *
 * Colour is never the difference on its own. A child who can't tell red
 * from green must always be able to find the odd one out, so it differs by
 * shape, size or which way up it is — colour only ever *adds* to a
 * difference the shape already shows (at the easiest levels), or is noise
 * to look past (at the hardest).
 *
 * Forgiving like everything else: a wrong tap costs a mistake and dims that
 * shape, and the child looks again.
 */

export const QUESTIONS_PER_ROUND = 6;

const SHAPES: readonly ShapeKind[] = ['circle', 'square', 'triangle', 'star', 'diamond', 'heart'];
const COLORS: readonly ColorKind[] = ['berry', 'sky', 'leaf', 'sun', 'grape'];

/** Shapes that look different upside down. A circle, square or diamond
 *  turned over is the same shape, so it can't be the odd one by turning. */
export const TURNABLE: readonly ShapeKind[] = ['triangle', 'heart', 'star'];

/** How the odd one differs. Never colour alone. */
export type Difference = 'shape-and-colour' | 'shape' | 'size' | 'turn';

export type Look = {
  readonly shape: ShapeKind;
  readonly color: ColorKind;
  /** 1 for the usual size; less for the odd one in a size question. */
  readonly scale: number;
  /** Upside down. */
  readonly turned: boolean;
};

export type OddQuestion = {
  readonly items: readonly Look[];
  readonly odd: number;
  readonly difference: Difference;
};

export type OddOneOutState = {
  readonly question: OddQuestion;
  /** Items already tapped wrongly this question — dimmed, not removed. */
  readonly ruledOut: readonly number[];
  readonly questionIndex: number;
  readonly mistakes: number;
  readonly complete: boolean;
};

type LevelSpec = {
  readonly items: number;
  readonly differences: readonly Difference[];
  /** How much smaller the odd one is in a size question. Closer to 1 is
   *  harder to see. */
  readonly sizeRatio: number;
  /** Everyone gets a random colour, so colour is noise to look past. */
  readonly colourNoise: boolean;
};

/**
 * One entry per level, 1-6. More shapes to search through, more kinds of
 * difference to look for, a smaller difference, and from level 5 a jumble of
 * colours hiding it.
 */
const LEVELS: readonly LevelSpec[] = [
  { items: 3, differences: ['shape-and-colour'], sizeRatio: 0.55, colourNoise: false },
  { items: 4, differences: ['shape-and-colour', 'shape'], sizeRatio: 0.55, colourNoise: false },
  { items: 6, differences: ['shape', 'size'], sizeRatio: 0.6, colourNoise: false },
  { items: 9, differences: ['shape', 'size', 'turn'], sizeRatio: 0.7, colourNoise: false },
  { items: 12, differences: ['shape', 'size', 'turn'], sizeRatio: 0.78, colourNoise: true },
  { items: 16, differences: ['shape', 'size', 'turn'], sizeRatio: 0.85, colourNoise: true },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

const pickFrom = <T>(rng: Rng, items: readonly T[], not?: T): T => {
  const pool = not === undefined ? items : items.filter((i) => i !== not);
  return pool[randInt(rng, 0, pool.length - 1)];
};

/** A different difference from last time where there's a choice, so two
 *  "find the small one" questions don't run back to back. */
export function createQuestion(rng: Rng, level: number, avoid: Difference | null = null): OddQuestion {
  const spec = specForLevel(level);
  const options = spec.differences.filter((d) => d !== avoid);
  const difference = pickFrom(rng, options.length > 0 ? options : spec.differences);

  const base: ShapeKind = difference === 'turn' ? pickFrom(rng, TURNABLE) : pickFrom(rng, SHAPES);
  const baseColor = pickFrom(rng, COLORS);
  const colorFor = () => (spec.colourNoise ? pickFrom(rng, COLORS) : baseColor);

  const items: Look[] = Array.from({ length: spec.items }, () => ({
    shape: base,
    color: colorFor(),
    scale: 1,
    turned: false,
  }));

  const odd = randInt(rng, 0, spec.items - 1);
  const same = items[odd];
  let oddLook: Look;
  switch (difference) {
    case 'shape-and-colour':
      oddLook = { ...same, shape: pickFrom(rng, SHAPES, base), color: pickFrom(rng, COLORS, baseColor) };
      break;
    case 'shape':
      oddLook = { ...same, shape: pickFrom(rng, SHAPES, base) };
      break;
    case 'size':
      oddLook = { ...same, scale: spec.sizeRatio };
      break;
    case 'turn':
      oddLook = { ...same, turned: true };
      break;
  }
  items[odd] = oddLook;

  return { items, odd, difference };
}

export function createGame(rng: Rng, level: number): OddOneOutState {
  return {
    question: createQuestion(rng, level),
    ruledOut: [],
    questionIndex: 0,
    mistakes: 0,
    complete: false,
  };
}

/** A tap. The odd one moves on to the next group, or ends the round after
 *  the sixth; anything else is a mistake and is dimmed. */
export function choose(state: OddOneOutState, index: number, rng: Rng, level: number): OddOneOutState {
  if (state.complete || state.ruledOut.includes(index)) return state;
  if (index !== state.question.odd) {
    return { ...state, ruledOut: [...state.ruledOut, index], mistakes: state.mistakes + 1 };
  }
  const questionIndex = state.questionIndex + 1;
  if (questionIndex >= QUESTIONS_PER_ROUND) {
    return { ...state, questionIndex, complete: true };
  }
  return {
    ...state,
    question: createQuestion(rng, level, state.question.difference),
    ruledOut: [],
    questionIndex,
  };
}

/** Everything in the group that isn't the odd one really is identical, bar
 *  the colour noise at the top levels. Exposed for the tests. */
export function sameExceptColour(a: Look, b: Look): boolean {
  return a.shape === b.shape && a.scale === b.scale && a.turned === b.turned;
}
