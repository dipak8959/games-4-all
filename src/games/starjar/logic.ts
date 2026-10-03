import { randInt, shuffle, type Rng } from '../../util/random';

/**
 * Star Jar — a family quiz, played as one team.
 *
 * Every player picks the kind of question that suits them — counting dots,
 * adding and taking away, or times tables — and the team takes turns, three
 * questions each. Every right answer drops a star in one shared jar.
 *
 * It practises counting and arithmetic with each player at their own level,
 * which is what lets a four-year-old and a grown-up play the same game at
 * the same table: nobody's question is too easy or too hard for them, and
 * nobody is compared with anyone — it's one jar.
 *
 * A wrong answer is dimmed and the player tries again; the team loses a
 * star, not a turn.
 */

export const QUESTIONS_EACH = 3;

/** What a player has chosen to be asked. */
export type Kind = 'count' | 'add' | 'times';

export type Question = {
  readonly kind: Kind;
  /** For counting: how many dots. For sums: the two numbers and the sign. */
  readonly a: number;
  readonly b: number;
  readonly op: '+' | '−' | '×' | '÷' | null;
  readonly answer: number;
  readonly choices: readonly number[];
};

export type StarJarState = {
  readonly kinds: readonly Kind[];
  readonly turn: number;
  /** Questions asked so far, over everyone. */
  readonly asked: number;
  readonly question: Question;
  readonly ruledOut: readonly number[];
  readonly stars: number;
  readonly mistakes: number;
  readonly complete: boolean;
};

type LevelSpec = {
  /** The most dots to count. */
  readonly countMax: number;
  /** Sums and differences up to this. */
  readonly addMax: number;
  /** Times tables up to this. */
  readonly timesMax: number;
  readonly choices: number;
};

/** One entry per level, 1-6: every kind of question a notch harder. */
const LEVELS: readonly LevelSpec[] = [
  { countMax: 5, addMax: 10, timesMax: 5, choices: 3 },
  { countMax: 7, addMax: 12, timesMax: 6, choices: 3 },
  { countMax: 9, addMax: 15, timesMax: 7, choices: 4 },
  { countMax: 10, addMax: 20, timesMax: 8, choices: 4 },
  { countMax: 12, addMax: 30, timesMax: 10, choices: 4 },
  { countMax: 15, addMax: 50, timesMax: 12, choices: 4 },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

function choicesFor(rng: Rng, answer: number, count: number): number[] {
  const out = new Set<number>([answer]);
  for (let spread = 1; out.size < count; spread += 1) {
    for (const d of shuffle(rng, [spread, -spread])) {
      if (out.size < count && answer + d >= 0) out.add(answer + d);
    }
  }
  return shuffle(rng, [...out]);
}

export function makeQuestion(rng: Rng, kind: Kind, spec: LevelSpec): Question {
  if (kind === 'count') {
    const a = randInt(rng, 1, spec.countMax);
    return { kind, a, b: 0, op: null, answer: a, choices: choicesFor(rng, a, spec.choices) };
  }
  if (kind === 'add') {
    const total = randInt(rng, 3, spec.addMax);
    const a = randInt(rng, 1, total - 1);
    if (rng() < 0.5) return { kind, a, b: total - a, op: '+', answer: total, choices: choicesFor(rng, total, spec.choices) };
    return { kind, a: total, b: a, op: '−', answer: total - a, choices: choicesFor(rng, total - a, spec.choices) };
  }
  const a = randInt(rng, 2, spec.timesMax);
  const b = randInt(rng, 2, spec.timesMax);
  if (rng() < 0.7) return { kind, a, b, op: '×', answer: a * b, choices: choicesFor(rng, a * b, spec.choices) };
  return { kind, a: a * b, b, op: '÷', answer: a, choices: choicesFor(rng, a, spec.choices) };
}

export function createGame(rng: Rng, level: number, kinds: readonly Kind[]): StarJarState {
  const players = kinds.length ? kinds : (['add'] as Kind[]);
  return {
    kinds: players,
    turn: 0,
    asked: 0,
    question: makeQuestion(rng, players[0], specForLevel(level)),
    ruledOut: [],
    stars: 0,
    mistakes: 0,
    complete: false,
  };
}

export function totalQuestions(state: StarJarState): number {
  return state.kinds.length * QUESTIONS_EACH;
}

export function answer(state: StarJarState, choice: number, rng: Rng, level: number): StarJarState {
  if (state.complete || state.ruledOut.includes(choice)) return state;
  if (choice !== state.question.answer) {
    return { ...state, ruledOut: [...state.ruledOut, choice], mistakes: state.mistakes + 1 };
  }
  const asked = state.asked + 1;
  const stars = state.stars + 1;
  if (asked >= totalQuestions(state)) return { ...state, asked, stars, ruledOut: [], complete: true };
  const turn = (state.turn + 1) % state.kinds.length;
  return {
    ...state,
    asked,
    stars,
    turn,
    question: makeQuestion(rng, state.kinds[turn], specForLevel(level)),
    ruledOut: [],
  };
}
