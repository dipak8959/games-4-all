import { pick, randInt, shuffle, type Rng } from '../../util/random';

/**
 * Number Patterns.
 *
 * A row of numbers with one missing. Work out the rule that makes each
 * number from the one before, and tap the number that fills the gap.
 *
 * It practises spotting a rule: adding the same each time, then taking
 * away, times-ing, differences that grow, square numbers, and each number
 * being the two before added up. It grows with the player: more kinds of
 * rule, the gap anywhere in the row rather than at the end, and more
 * numbers to choose from.
 *
 * Kind like everything else: a wrong number is ruled out, and the row stays
 * until it's filled. Ten rows is the round, fixed before the first one.
 * There's no score: the stars come from how few numbers were ruled out.
 */

export const ROWS = 10;
export const TERMS = 5;

export type Rule = 'add' | 'take' | 'times' | 'growing' | 'squares' | 'twoBefore' | 'alternate';
/** Easier to harder: the order they arrive in. */
export const RULES: readonly Rule[] = ['add', 'take', 'times', 'growing', 'squares', 'twoBefore', 'alternate'];

export type Row = {
  readonly rule: Rule;
  readonly terms: readonly number[];
  /** Which term is the gap. */
  readonly gap: number;
  readonly choices: readonly number[];
};

export type NumberPatternsState = {
  readonly rows: readonly Row[];
  readonly index: number;
  readonly ruledOut: readonly number[];
  readonly mistakes: number;
  readonly complete: boolean;
};

type LevelSpec = {
  /** How many of `RULES`, from the start, can come up. */
  readonly rules: number;
  /** The gap anywhere in the row, not only at the end. */
  readonly anywhere: boolean;
  readonly choices: number;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { rules: 1, anywhere: false, choices: 3 },
  { rules: 2, anywhere: false, choices: 4 },
  { rules: 2, anywhere: true, choices: 4 },
  { rules: 3, anywhere: true, choices: 4 },
  { rules: 5, anywhere: true, choices: 4 },
  { rules: 7, anywhere: true, choices: 4 },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

/** The terms of a row that follows a rule. */
function termsFor(rng: Rng, rule: Rule): number[] {
  const out: number[] = [];
  switch (rule) {
    case 'add': {
      const step = randInt(rng, 2, 9);
      let n = randInt(rng, 1, 20);
      for (let i = 0; i < TERMS; i += 1, n += step) out.push(n);
      break;
    }
    case 'take': {
      const step = randInt(rng, 2, 9);
      let n = step * TERMS + randInt(rng, 1, 30);
      for (let i = 0; i < TERMS; i += 1, n -= step) out.push(n);
      break;
    }
    case 'times': {
      const by = pick(rng, [2, 3]);
      let n = randInt(rng, 1, by === 2 ? 6 : 3);
      for (let i = 0; i < TERMS; i += 1, n *= by) out.push(n);
      break;
    }
    case 'growing': {
      // The gap between numbers grows by one each time.
      let n = randInt(rng, 1, 10);
      let step = randInt(rng, 1, 4);
      for (let i = 0; i < TERMS; i += 1, n += step, step += 1) out.push(n);
      break;
    }
    case 'squares': {
      const from = randInt(rng, 1, 6);
      for (let i = 0; i < TERMS; i += 1) out.push((from + i) * (from + i));
      break;
    }
    case 'twoBefore': {
      // Each number is the two before it added up.
      let [a, b] = [randInt(rng, 1, 4), randInt(rng, 1, 5)];
      for (let i = 0; i < TERMS; i += 1) {
        out.push(a);
        [a, b] = [b, a + b];
      }
      break;
    }
    case 'alternate': {
      // Two steps, taken in turn: +a, +b, +a, +b.
      const a = randInt(rng, 1, 5);
      let b = randInt(rng, 6, 10);
      if (b === a * 2) b += 1;
      let n = randInt(rng, 1, 10);
      for (let i = 0; i < TERMS; i += 1) {
        out.push(n);
        n += i % 2 === 0 ? a : b;
      }
      break;
    }
  }
  return out;
}

/** Near misses: what a slip in the rule would give. */
function distractors(rng: Rng, row: readonly number[], gap: number, count: number): number[] {
  const answer = row[gap];
  const near = shuffle(rng, [answer + 1, answer - 1, answer + 2, answer - 2, answer + 10, answer - 10, answer * 2, answer + 5, answer - 5]);
  const neighbours = [row[gap - 1], row[gap + 1]].filter((n) => n != null) as number[];
  const pool = [...near, ...neighbours.map((n) => n + (answer - n) * 2)];
  const out: number[] = [];
  for (const n of pool) {
    if (out.length >= count) break;
    if (n > 0 && n !== answer && !out.includes(n) && !row.includes(n) && !fitsWith(row, gap, n)) out.push(n);
  }
  for (let extra = 3; out.length < count; extra += 1) {
    const n = answer + extra;
    if (!out.includes(n) && !row.includes(n) && !fitsWith(row, gap, n)) out.push(n);
  }
  return out;
}

export function createGame(rng: Rng, level: number): NumberPatternsState {
  const spec = specForLevel(level);
  const rules = RULES.slice(0, spec.rules);
  const rows: Row[] = [];
  for (let i = 0; i < ROWS; i += 1) {
    // Every rule the level allows comes up, the newest most often.
    const rule = i < rules.length ? rules[rules.length - 1 - i] : pick(rng, rules);
    const terms = termsFor(rng, rule);
    const gap = spec.anywhere ? randInt(rng, 1, TERMS - 1) : TERMS - 1;
    const choices = shuffle(rng, [terms[gap], ...distractors(rng, terms, gap, spec.choices - 1)]);
    rows.push({ rule, terms, gap, choices });
  }
  return { rows: shuffle(rng, rows), index: 0, ruledOut: [], mistakes: 0, complete: false };
}

export function rowNow(state: NumberPatternsState): Row {
  return state.rows[Math.min(state.index, state.rows.length - 1)];
}

/** A number tapped: the gap filled and on to the next row, or ruled out. */
export function choose(state: NumberPatternsState, choice: number): NumberPatternsState {
  if (state.complete || state.ruledOut.includes(choice)) return state;
  const row = rowNow(state);
  if (row.choices[choice] !== row.terms[row.gap]) {
    return { ...state, ruledOut: [...state.ruledOut, choice], mistakes: state.mistakes + 1 };
  }
  const index = state.index + 1;
  return { ...state, index, ruledOut: [], complete: index >= state.rows.length };
}

/** Would the row, with this number in the gap, follow a rule too? Then it
 *  can't be offered as a wrong answer. */
function fitsWith(row: readonly number[], gap: number, n: number): boolean {
  return fitsARule(row.map((t, i) => (i === gap ? n : t)));
}

/** Does this row of numbers follow some simple rule? For checking that a
 *  wrong choice never secretly fits one too. */
export function fitsARule(terms: readonly number[]): boolean {
  const d = terms.slice(1).map((n, i) => n - terms[i]);
  const same = (xs: readonly number[]) => xs.every((x) => x === xs[0]);
  if (same(d)) return true;
  if (terms.every((n) => n !== 0) && same(terms.slice(1).map((n, i) => n / terms[i]))) return true;
  if (same(d.slice(1).map((x, i) => x - d[i]))) return true;
  if (terms.slice(2).every((n, i) => n === terms[i] + terms[i + 1])) return true;
  if (d.every((x, i) => x === d[i % 2])) return true;
  return false;
}
