import { randInt, sample, shuffle, type Rng } from '../../util/random';
import type { ColorKind } from '../shapes/logic';
import { FAMILIES, FIGURES, type Figure } from './figures';

/**
 * Shadow Match.
 *
 * A thing, in colour, and a row of dark shadows. Tap the one that is its
 * shadow. Six make a round.
 *
 * Every shadow is the same ink colour, so colour can't give the answer away:
 * the only way to it is the outline. That makes it a pure shape-recognition
 * task, and it grows the way that skill does:
 *
 *   - two shadows of very different things (a house, a fish), then three;
 *   - then shadows of near misses from the same family — the house, but
 *     with a chimney — so the whole outline has to be checked, not just
 *     its rough size;
 *   - then shadows turned on their side, so the outline has to be turned
 *     in the head before it can be matched;
 *   - and at the top, six shadows, each turned a different way.
 *
 * Forgiving like everything else: a wrong shadow costs a mistake and dims,
 * and the child looks again.
 */

export const QUESTIONS_PER_ROUND = 6;

const COLOURS: readonly ColorKind[] = ['berry', 'sky', 'leaf', 'sun', 'grape'];

/** Quarter turns, clockwise. */
export type Turn = 0 | 90 | 180 | 270;

export type Shadow = {
  readonly figure: Figure;
  readonly turn: Turn;
};

export type ShadowQuestion = {
  readonly thing: Figure;
  readonly color: ColorKind;
  readonly shadows: readonly Shadow[];
  readonly answer: number;
};

export type ShadowMatchState = {
  readonly question: ShadowQuestion;
  readonly ruledOut: readonly number[];
  readonly questionIndex: number;
  readonly mistakes: number;
  readonly complete: boolean;
};

type LevelSpec = {
  /** Shadows to choose from. */
  readonly choices: number;
  /** How many of the wrong shadows are near misses from the thing's own
   *  family; the rest come from other families. */
  readonly near: number;
  /** 0: every shadow upright. 1: every shadow turned the same way. 2: each
   *  shadow turned its own way. */
  readonly turn: 0 | 1 | 2;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { choices: 2, near: 0, turn: 0 },
  { choices: 3, near: 0, turn: 0 },
  { choices: 3, near: 1, turn: 0 },
  { choices: 4, near: 2, turn: 0 },
  { choices: 4, near: 2, turn: 1 },
  { choices: 6, near: 2, turn: 2 },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

const TURNS: readonly Turn[] = [90, 180, 270];

/** A new thing to match, never the one just seen. */
export function createQuestion(rng: Rng, level: number, avoid: string | null = null): ShadowQuestion {
  const spec = specForLevel(level);
  const pool = FIGURES.filter((f) => f.id !== avoid);
  const thing = pool[randInt(rng, 0, pool.length - 1)];

  const family = FIGURES.filter((f) => f.family === thing.family && f.id !== thing.id);
  const near = sample(rng, family, spec.near);
  // Easy decoys come one from each of the other families, so no two of them
  // are near misses of each other either.
  const others = sample(
    rng,
    FAMILIES.filter((f) => f !== thing.family),
    spec.choices - 1 - near.length,
  ).map((fam) => {
    const members = FIGURES.filter((f) => f.family === fam);
    return members[randInt(rng, 0, members.length - 1)];
  });

  const figures = shuffle(rng, [thing, ...near, ...others]);
  const shared = TURNS[randInt(rng, 0, TURNS.length - 1)];
  const shadows = figures.map((figure): Shadow => {
    if (spec.turn === 0) return { figure, turn: 0 };
    if (spec.turn === 1) return { figure, turn: shared };
    return { figure, turn: TURNS[randInt(rng, 0, TURNS.length - 1)] };
  });

  return {
    thing,
    color: COLOURS[randInt(rng, 0, COLOURS.length - 1)],
    shadows,
    answer: figures.indexOf(thing),
  };
}

export function createGame(rng: Rng, level: number): ShadowMatchState {
  return {
    question: createQuestion(rng, level),
    ruledOut: [],
    questionIndex: 0,
    mistakes: 0,
    complete: false,
  };
}

export function choose(state: ShadowMatchState, index: number, rng: Rng, level: number): ShadowMatchState {
  if (state.complete || state.ruledOut.includes(index)) return state;

  if (index !== state.question.answer) {
    return { ...state, ruledOut: [...state.ruledOut, index], mistakes: state.mistakes + 1 };
  }

  const questionIndex = state.questionIndex + 1;
  if (questionIndex >= QUESTIONS_PER_ROUND) {
    return { ...state, questionIndex, complete: true };
  }
  return {
    ...state,
    question: createQuestion(rng, level, state.question.thing.id),
    ruledOut: [],
    questionIndex,
  };
}
