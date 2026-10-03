import { pick, shuffle, type Rng } from '../../util/random';
import { GROUPS, type RhymeGroup } from './words';

/**
 * Rhyme Time.
 *
 * A word at the top, and a few words to choose from. Pick the one that
 * rhymes. Ten rhymes and the round is over.
 *
 * It practises hearing rhyme in written words — early reading's first
 * bridge between how a word looks and how it sounds. At first the rhyme is
 * in the spelling too (cat, hat); then there's a word that starts the same
 * to tempt the eye (cat, can); then the rhymes are spelt differently (blue,
 * shoe, two); then there's a look-alike that *doesn't* rhyme (food, good);
 * then two-syllable rhymes (rocket, pocket). By then it's the ear doing the
 * work, not the eye.
 *
 * A wrong word is dimmed and costs a star; the word stays until it's
 * matched.
 */

export const RHYMES_PER_ROUND = 10;

export type Question = {
  readonly prompt: string;
  readonly choices: readonly string[];
  readonly answer: number;
};

export type RhymeTimeState = {
  readonly questions: readonly Question[];
  readonly index: number;
  readonly ruledOut: readonly number[];
  readonly mistakes: number;
  readonly complete: boolean;
};

type LevelSpec = {
  /** The highest tier of words in play. */
  readonly tier: number;
  readonly choices: number;
  /** A wrong word starting with the same letter as the prompt. */
  readonly sameStart: boolean;
  /** The answer spelt differently from the prompt where it can be. */
  readonly spelledDifferently: boolean;
  /** A look-alike that doesn't rhyme. */
  readonly lookAlike: boolean;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { tier: 1, choices: 3, sameStart: false, spelledDifferently: false, lookAlike: false },
  { tier: 2, choices: 3, sameStart: false, spelledDifferently: false, lookAlike: false },
  { tier: 2, choices: 4, sameStart: true, spelledDifferently: false, lookAlike: false },
  { tier: 4, choices: 4, sameStart: true, spelledDifferently: true, lookAlike: false },
  { tier: 5, choices: 4, sameStart: true, spelledDifferently: true, lookAlike: true },
  { tier: 6, choices: 4, sameStart: true, spelledDifferently: true, lookAlike: true },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

/** How a word ends on the page: its last two letters. */
export const ending = (word: string) => word.slice(-2);

export function groupOf(word: string): RhymeGroup | undefined {
  return GROUPS.find((g) => g.words.includes(word));
}

export function rhymes(a: string, b: string): boolean {
  const g = groupOf(a);
  return a !== b && !!g && g.words.includes(b);
}

function makeQuestion(rng: Rng, spec: LevelSpec, used: Set<string>): Question {
  const groups = GROUPS.filter((g) => g.tier <= spec.tier);
  // Newer groups come up more often, so a level shows what it adds.
  const fresh = groups.filter((g) => g.tier === spec.tier || (spec.tier === 5 && g.tier >= 4));
  let prompt = '';
  let answer = '';
  let group: RhymeGroup = groups[0];
  for (let tries = 0; tries < 200; tries += 1) {
    group = pick(rng, rng() < 0.6 && fresh.length ? fresh : groups);
    prompt = pick(rng, group.words);
    const others = group.words.filter((w) => w !== prompt);
    const same = others.filter((w) => ending(w) === ending(prompt));
    const different = others.filter((w) => ending(w) !== ending(prompt));
    if (spec.spelledDifferently && different.length && rng() < 0.7) answer = pick(rng, different);
    else if (!spec.spelledDifferently && same.length) answer = pick(rng, same);
    else if (spec.spelledDifferently && others.length) answer = pick(rng, others);
    else continue;
    if (!used.has(prompt)) break;
  }
  used.add(prompt);

  // Wrong words: never from the prompt's own group, so none of them rhyme.
  const pool = groups.flatMap((g) => (g === group ? [] : g.words)).filter((w) => w !== prompt);
  const wrong: string[] = [];
  const take = (word: string | undefined) => {
    if (word && !wrong.includes(word) && word !== answer && !rhymes(prompt, word) && word !== prompt) wrong.push(word);
  };
  if (spec.lookAlike && group.traps) take(pick(rng, group.traps));
  if (spec.sameStart) {
    const starts = pool.filter((w) => w[0] === prompt[0]);
    if (starts.length) take(pick(rng, starts));
  }
  for (const w of shuffle(rng, pool)) {
    if (wrong.length >= spec.choices - 1) break;
    take(w);
  }
  const choices = shuffle(rng, [answer, ...wrong.slice(0, spec.choices - 1)]);
  return { prompt, choices, answer: choices.indexOf(answer) };
}

export function createGame(rng: Rng, level: number): RhymeTimeState {
  const spec = specForLevel(level);
  const used = new Set<string>();
  const questions = Array.from({ length: RHYMES_PER_ROUND }, () => makeQuestion(rng, spec, used));
  return { questions, index: 0, ruledOut: [], mistakes: 0, complete: false };
}

export function choose(state: RhymeTimeState, choice: number): RhymeTimeState {
  if (state.complete || state.ruledOut.includes(choice)) return state;
  const q = state.questions[state.index];
  if (choice !== q.answer) return { ...state, ruledOut: [...state.ruledOut, choice], mistakes: state.mistakes + 1 };
  const index = state.index + 1;
  return { ...state, index, ruledOut: [], complete: index >= RHYMES_PER_ROUND };
}

