import { pick, randInt, shuffle, type Rng } from '../../util/random';

/**
 * Number Crunch.
 *
 * Straightforward mental arithmetic across all four operations — real
 * headroom rather than topping out at what a young child needs, which is
 * what keeps this worth playing well past the age other numeracy games in
 * this app are built for.
 *
 * Operators are gated by *level*, not age directly, in the order most
 * children actually meet them at school: addition, then subtraction, then
 * multiplication, then division. A profile's age seeds where the level
 * starts (`startingLevelForAge`) — so a grown-up opens straight into all
 * four operations rather than warming up on "6 + 7" — and from there the
 * level adapts to how the player is actually doing (`nextLevel`), so a
 * confident young player can climb and an adult who'd rather take it gently
 * can drop back. Division only ever appears once multiplication is already
 * in play, and is always constructed to divide evenly — no fractions, no
 * rounding, so an answer is never ambiguous.
 */

export type Operator = '+' | '-' | '×' | '÷';

export type NumberCrunchQuestion = {
  readonly a: number;
  readonly b: number;
  readonly operator: Operator;
  readonly answer: number;
  /** Numerals offered, always including `answer`. */
  readonly choices: readonly number[];
};

export type NumberCrunchState = {
  readonly question: NumberCrunchQuestion;
  readonly questionIndex: number;
  readonly mistakes: number;
  /** Choices ruled out by a wrong tap, so they can be shown as unavailable. */
  readonly ruledOut: readonly number[];
  readonly complete: boolean;
};

export const QUESTIONS_PER_ROUND = 6;

/** Which operators are in play at a level — the school order: addition,
 *  then subtraction joins, then multiplication, then division once
 *  multiplication is established. */
export function operatorsForLevel(level: number): readonly Operator[] {
  if (level <= 2) return ['+'];
  if (level === 3) return ['+', '-'];
  if (level === 4) return ['+', '-', '×'];
  return ['+', '-', '×', '÷'];
}

function questionKey(a: number, operator: Operator, b: number): string {
  return `${a}${operator}${b}`;
}

/**
 * Builds one question with three near-miss choices.
 *
 * `avoidKey` keeps the exact same question from appearing twice in a row,
 * across both questions within a round and the seam between one round and
 * the next — the same freshness idea `counting/logic.ts` uses for pictures.
 */
export function createQuestion(
  rng: Rng,
  level: number,
  avoidKey: string | null = null,
): NumberCrunchQuestion {
  const operators = operatorsForLevel(level);
  let a = 0;
  let b = 0;
  let operator: Operator = operators[0];
  let key = '';

  do {
    operator = pick(rng, operators);
    if (operator === '+') {
      const max = level <= 1 ? 5 : level <= 2 ? 9 : level <= 4 ? 15 : 20;
      a = randInt(rng, 1, max);
      b = randInt(rng, 1, max);
    } else if (operator === '-') {
      const max = level <= 4 ? 15 : 20;
      a = randInt(rng, 1, max);
      // b never exceeds a, so the result is never negative.
      b = randInt(rng, 0, a);
    } else if (operator === '×') {
      const max = level <= 4 ? 10 : 12;
      a = randInt(rng, 2, max);
      b = randInt(rng, 2, max);
    } else {
      // Division is built from its own answer outward — pick the divisor and
      // quotient first, then multiply back up to the dividend — so it always
      // divides evenly. There is never a fraction to round or a remainder to
      // explain away.
      const max = level <= 5 ? 10 : 12;
      b = randInt(rng, 2, max);
      const quotient = randInt(rng, 1, max);
      a = b * quotient;
    }
    key = questionKey(a, operator, b);
  } while (key === avoidKey);

  const answer =
    operator === '+' ? a + b : operator === '-' ? a - b : operator === '×' ? a * b : a / b;

  const choices = new Set<number>([answer]);
  let spread = 1;
  while (choices.size < 3) {
    for (const candidate of [answer - spread, answer + spread]) {
      if (choices.size >= 3) break;
      if (candidate >= 0 && candidate !== answer) choices.add(candidate);
    }
    spread += 1;
  }

  return { a, b, operator, answer, choices: shuffle(rng, [...choices]) };
}

export function createGame(rng: Rng, level: number, avoidKey: string | null = null): NumberCrunchState {
  return {
    question: createQuestion(rng, level, avoidKey),
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
 * greyed out and the child tries again until they get it. Progress only
 * ever moves forward.
 */
export function answer(state: NumberCrunchState, choice: number, rng: Rng, level: number): NumberCrunchState {
  if (state.complete) return state;

  if (choice !== state.question.answer) {
    if (state.ruledOut.includes(choice)) return state;
    return { ...state, mistakes: state.mistakes + 1, ruledOut: [...state.ruledOut, choice] };
  }

  const nextIndex = state.questionIndex + 1;
  const key = questionKey(state.question.a, state.question.operator, state.question.b);
  if (nextIndex >= QUESTIONS_PER_ROUND) {
    return { ...state, questionIndex: nextIndex, ruledOut: [], complete: true };
  }

  return {
    ...state,
    question: createQuestion(rng, level, key),
    questionIndex: nextIndex,
    ruledOut: [],
  };
}
