import { pick, randInt, shuffle, type Rng } from '../../util/random';

/**
 * Number Crunch.
 *
 * Mental arithmetic across all four operations, with the difficulty ladder
 * anchored to how numerical cognition actually develops rather than to
 * round numbers that felt about right.
 *
 * What the research says, and what it changed here:
 *
 * - **Curriculum milestones.** Addition/subtraction within 20 is a ~6-7
 *   skill, within 100 a ~7-8 skill, and the full times table plus division
 *   within 100 arrives at ~8-9. `LEVELS` follows that order and those
 *   magnitudes instead of inventing its own.
 * - **Working memory.** Digit span runs ~3 items at age 4, ~6 by 10-12, and
 *   plateaus around 7-8 by 16. Carrying a two-digit sum costs span, which is
 *   why two-digit terms only appear from level 3 and both-sides-two-digit
 *   only at the top.
 * - **Problem-size effect.** Large single-digit facts (8 × 7) are slower and
 *   more error-prone than small ones (2 × 3) because they resist direct
 *   retrieval. So higher levels raise the *floor* on factors, not just the
 *   ceiling — an adult should not be handed 2 × 3.
 * - **Error structure.** Around 88% of adults' multiplication errors are
 *   "operand-related": a number from one of the operands' tables (7 × 4 →
 *   24). Wrong answers here are built from those real confusions, so a
 *   question can't be solved by eliminating implausible options —
 *   see `plausibleWrongAnswers`.
 * - **Aging.** Processing speed declines with age but arithmetic knowledge
 *   holds up, and this game has no timer to punish speed, so content is
 *   never softened for older players.
 *
 * Level is only *seeded* from age (`startingLevelForAge`); from the first
 * completed round it is driven purely by measured performance
 * (`nextLevel`).
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
export const CHOICES_PER_QUESTION = 3;

type LevelSpec = {
  readonly operators: readonly Operator[];
  /** Range for the terms of + and −. */
  readonly termMin: number;
  readonly termMax: number;
  /** Range for the factors of × and ÷. A rising `factorMin` is what keeps
   *  the problem-size effect working for the player: at the top level the
   *  easy, instantly-retrieved facts are simply not drawn. */
  readonly factorMin: number;
  readonly factorMax: number;
};

/** One entry per level, 1-6. See the module comment for what anchors each. */
const LEVELS: readonly LevelSpec[] = [
  // Sums within 10 — the first addition children meet, around age 5.
  { operators: ['+'], termMin: 1, termMax: 5, factorMin: 2, factorMax: 5 },
  // Add and subtract within 20 — the Grade 1 (~6-7) benchmark.
  { operators: ['+', '-'], termMin: 1, termMax: 10, factorMin: 2, factorMax: 5 },
  // Within 100, so two-digit terms and carrying appear — Grade 2 (~7-8).
  { operators: ['+', '-'], termMin: 2, termMax: 50, factorMin: 2, factorMax: 10 },
  // Times tables to 10 join — Grade 3 (~8-9).
  { operators: ['+', '-', '×'], termMin: 5, termMax: 50, factorMin: 2, factorMax: 10 },
  // Division and the full table to 12 — Grade 3-5 fluency (~9-11). The
  // factor floor lifts off 2 here: by this point 2 × 3 is retrieved, not
  // worked out, so it is no longer a question.
  { operators: ['+', '-', '×', '÷'], termMin: 10, termMax: 99, factorMin: 3, factorMax: 12 },
  // Adult: two-digit on both sides, and only the large, hard-to-retrieve
  // facts (6-12) for × and ÷.
  { operators: ['+', '-', '×', '÷'], termMin: 25, termMax: 99, factorMin: 6, factorMax: 12 },
];

function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

/** Which operators are in play at a level — the school order: addition,
 *  then subtraction, then multiplication, then division. */
export function operatorsForLevel(level: number): readonly Operator[] {
  return specForLevel(level).operators;
}

function questionKey(a: number, operator: Operator, b: number): string {
  return `${a}${operator}${b}`;
}

/**
 * Wrong answers that look like real mistakes.
 *
 * Around 88% of adults' multiplication errors (and ~76% of children's) are
 * operand-related — a value from the times table of one of the operands,
 * like answering 24 to 7 × 4. Multi-digit addition fails instead on carry
 * and place-value slips, which land ten off. Mixing up the operation itself
 * is the other classic.
 *
 * Building the wrong choices from those families is what makes a question
 * actually require the arithmetic: 8 × 7 offered against 48 and 63 is a real
 * question; offered against 55 and 57 it is a formatting exercise, because
 * no times table ever lands there.
 */
function plausibleWrongAnswers(
  rng: Rng,
  operator: Operator,
  a: number,
  b: number,
  answer: number,
  count: number,
  level: number,
): number[] {
  const candidates: number[] = [];

  // Mixing up the operation itself is a real error, but only for a learner
  // still assembling the facts: children's errors are ~76% operand-related
  // against adults' ~88%, the rest being confusions like this. Offer it only
  // at the lower levels, and only while the numbers stay small — answering
  // 191 to "98 − 93", or 13 to "6 × 7" at adult level, isn't a confusion
  // anyone actually has, it's a decoy that eliminates itself and hands back
  // a free question.
  const confusable = level <= 4 && a < 10 && b < 10;

  if (operator === '×') {
    // Neighbours within each operand's own table.
    for (const delta of [1, -1, 2, -2]) {
      candidates.push(a * (b + delta), (a + delta) * b);
    }
    if (confusable) candidates.push(a + b); // adding instead of multiplying
  } else if (operator === '÷') {
    // Adjacent quotients are the same table confusion seen from the other
    // direction: answering 7 to 72 ÷ 8 means reaching for 8 × 7 = 56.
    for (const delta of [1, -1, 2, -2]) candidates.push(answer + delta);
    if (confusable) candidates.push(a - b); // subtracting instead of dividing
  } else {
    const twoDigit = a >= 10 || b >= 10;
    // A dropped or spurious carry lands exactly ten away; single-digit work
    // slips by one or two instead.
    if (twoDigit) candidates.push(answer + 10, answer - 10, answer + 1, answer - 1);
    else candidates.push(answer + 1, answer - 1, answer + 2, answer - 2);
    if (confusable) candidates.push(operator === '+' ? a - b : a + b);
  }

  const seen = new Set<number>([answer]);
  const multiplicative = operator === '×' || operator === '÷';
  const chosen: number[] = [];

  for (const candidate of shuffle(rng, candidates)) {
    if (chosen.length >= count) break;
    if (!Number.isInteger(candidate) || candidate < 0) continue;
    // Zero is a fine answer for + and −, but never a believable one for a
    // times table, so it is not offered as a decoy there.
    if (multiplicative && candidate === 0) continue;
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    chosen.push(candidate);
  }

  // Top up with near neighbours if the plausible families came up short
  // (small answers have few valid ones), so a question is never malformed.
  let spread = 1;
  while (chosen.length < count) {
    for (const candidate of [answer - spread, answer + spread]) {
      if (chosen.length >= count) break;
      if (candidate < 0 || seen.has(candidate)) continue;
      seen.add(candidate);
      chosen.push(candidate);
    }
    spread += 1;
  }

  return chosen;
}

/**
 * Builds one question with plausible wrong choices.
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
  const spec = specForLevel(level);
  let a = 0;
  let b = 0;
  let operator: Operator = spec.operators[0];
  let key = '';

  do {
    operator = pick(rng, spec.operators);
    if (operator === '+') {
      a = randInt(rng, spec.termMin, spec.termMax);
      b = randInt(rng, spec.termMin, spec.termMax);
    } else if (operator === '-') {
      // Built from its answer outward, like division: draw the subtrahend
      // and the difference, then add up to the minuend. Drawing the minuend
      // first and the subtrahend under it clusters them together and yields
      // throwaway questions like "43 − 41" at adult level. This way the
      // result is never negative *and* never trivially small, and the
      // minuend reaches the same ceiling this level's sums do.
      b = randInt(rng, spec.termMin, spec.termMax);
      a = b + randInt(rng, spec.termMin, spec.termMax);
    } else if (operator === '×') {
      a = randInt(rng, spec.factorMin, spec.factorMax);
      b = randInt(rng, spec.factorMin, spec.factorMax);
    } else {
      // Division is built from its own answer outward — pick the divisor and
      // quotient first, then multiply back up to the dividend — so it always
      // divides evenly. There is never a fraction to round or a remainder to
      // explain away.
      b = randInt(rng, spec.factorMin, spec.factorMax);
      const quotient = randInt(rng, spec.factorMin, spec.factorMax);
      a = b * quotient;
    }
    key = questionKey(a, operator, b);
  } while (key === avoidKey);

  const answer =
    operator === '+' ? a + b : operator === '-' ? a - b : operator === '×' ? a * b : a / b;

  const wrong = plausibleWrongAnswers(rng, operator, a, b, answer, CHOICES_PER_QUESTION - 1, level);
  return { a, b, operator, answer, choices: shuffle(rng, [answer, ...wrong]) };
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
 * greyed out and the player tries again until they get it. Progress only
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
