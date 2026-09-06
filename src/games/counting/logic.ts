import { pickFresh, randInt, shuffle, type Rng } from '../../util/random';

/**
 * Counting.
 *
 * A cluster of objects appears; the child taps the numeral that says how many.
 * Counting the objects out loud is the point, so nothing is timed.
 */

export type CountingQuestion = {
  /** How many objects to draw. */
  readonly count: number;
  readonly symbol: string;
  /** Numerals offered, always including `count`. */
  readonly choices: readonly number[];
};

export type CountingState = {
  readonly question: CountingQuestion;
  readonly questionIndex: number;
  readonly mistakes: number;
  /** Choices ruled out by a wrong tap, so they can be shown as unavailable. */
  readonly ruledOut: readonly number[];
  readonly complete: boolean;
};

/** `createQuestion`'s `avoidSymbol` keeps the same picture from appearing on
 *  two consecutive questions, so a bigger pool here means more variety across
 *  a round rather than just across replays. */
const SYMBOLS = [
  '🍎', '⭐', '🐟', '🌻', '🐝', '🍓', '🎈', '🐸',
  '🍊', '🍇', '🥕', '🦋', '🐶', '🍌',
] as const;

export const QUESTIONS_PER_ROUND = 5;

/** Counting range for a level. Kept inside what a child can subitise and count
 *  reliably before the numerals get large. */
export function rangeForLevel(level: number): { min: number; max: number } {
  if (level <= 1) return { min: 1, max: 5 };
  if (level === 2) return { min: 2, max: 8 };
  if (level === 3) return { min: 3, max: 10 };
  return { min: 5, max: 12 };
}

/**
 * Builds one question with three near-miss choices.
 *
 * Distractors sit adjacent to the answer so the child has to actually count
 * rather than eyeball "the big one" or "the small one". `avoidSymbol` keeps
 * the same picture from ever appearing twice in a row, across both questions
 * within a round and the seam between one round and the next.
 */
export function createQuestion(rng: Rng, level: number, avoidSymbol: string | null = null): CountingQuestion {
  const { min, max } = rangeForLevel(level);
  const count = randInt(rng, min, max);

  const choices = new Set<number>([count]);
  let spread = 1;
  while (choices.size < 3) {
    for (const candidate of [count - spread, count + spread]) {
      if (choices.size >= 3) break;
      if (candidate >= 1 && candidate !== count) choices.add(candidate);
    }
    spread += 1;
  }

  return {
    count,
    symbol: pickFresh(rng, SYMBOLS, avoidSymbol),
    choices: shuffle(rng, [...choices]),
  };
}

export function createGame(rng: Rng, level: number, avoidSymbol: string | null = null): CountingState {
  return {
    question: createQuestion(rng, level, avoidSymbol),
    questionIndex: 0,
    mistakes: 0,
    ruledOut: [],
    complete: false,
  };
}

/**
 * Applies a tapped numeral.
 *
 * A wrong answer does not advance and does not end anything: the choice is
 * greyed out and the child tries again until they get it. Progress only ever
 * moves forward.
 */
export function answer(state: CountingState, choice: number, rng: Rng, level: number): CountingState {
  if (state.complete) return state;

  if (choice !== state.question.count) {
    if (state.ruledOut.includes(choice)) return state;
    return { ...state, mistakes: state.mistakes + 1, ruledOut: [...state.ruledOut, choice] };
  }

  const nextIndex = state.questionIndex + 1;
  if (nextIndex >= QUESTIONS_PER_ROUND) {
    return { ...state, questionIndex: nextIndex, ruledOut: [], complete: true };
  }

  return {
    ...state,
    question: createQuestion(rng, level, state.question.symbol),
    questionIndex: nextIndex,
    ruledOut: [],
  };
}
