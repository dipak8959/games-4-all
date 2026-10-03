import { shuffle, type Rng } from '../../util/random';

/**
 * Count Around — a game for a group, played as one team.
 *
 * The team counts, one number each, round the group: one, two, three… up
 * to the target. From level 3 some numbers aren't said at all: on every
 * multiple of five you CLAP instead; later it's threes; at the top, CLAP on
 * threes, STOMP on fives, and BOTH on numbers that are both.
 *
 * It practises counting on, and knowing multiples well enough to see them
 * coming — the old counting round known as Fizz, played at tables and in
 * classrooms for generations. Everyone watches everyone's turn, so the
 * whole group is counting all the time.
 *
 * A slip isn't the end: the wrong choice is dimmed, the same player tries
 * again, and the team loses a star, not the count.
 */

export type Say = 'clap' | 'stomp' | 'both' | number;

export type CountAroundState = {
  /** The number the team is on. */
  readonly n: number;
  readonly to: number;
  /** CLAP on multiples of the first, STOMP on the second. */
  readonly rules: readonly number[];
  readonly players: number;
  readonly turn: number;
  /** The numbers on offer this turn. */
  readonly numbers: readonly number[];
  readonly ruledOut: readonly string[];
  readonly mistakes: number;
  readonly complete: boolean;
};

type LevelSpec = {
  readonly to: number;
  readonly rules: readonly number[];
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { to: 10, rules: [] },
  { to: 20, rules: [] },
  { to: 20, rules: [5] },
  { to: 30, rules: [3] },
  { to: 30, rules: [3, 5] },
  { to: 45, rules: [3, 5] },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

/** What's right to say for a number under the rules. */
export function whatToSay(n: number, rules: readonly number[]): Say {
  const clap = rules[0] !== undefined && n % rules[0] === 0;
  const stomp = rules[1] !== undefined && n % rules[1] === 0;
  if (clap && stomp) return 'both';
  if (clap) return 'clap';
  if (stomp) return 'stomp';
  return n;
}

export const key = (say: Say) => String(say);

/** The next number and two near it — so on a clap number, saying it is a
 *  choice, and a tempting one. */
function numbersFor(rng: Rng, n: number): number[] {
  const near = [n + 1, n + 2, n - 1].filter((x) => x >= 1 && x !== n);
  return shuffle(rng, [n, ...shuffle(rng, near).slice(0, 2)]);
}

export function createGame(rng: Rng, level: number, players: number): CountAroundState {
  const spec = specForLevel(level);
  return {
    n: 1,
    to: spec.to,
    rules: spec.rules,
    players: Math.max(1, players),
    turn: 0,
    numbers: numbersFor(rng, 1),
    ruledOut: [],
    mistakes: 0,
    complete: false,
  };
}

/** A player says something. Right: the next player's turn, on the next
 *  number. Wrong: that choice is dimmed and they try again. */
export function say(state: CountAroundState, what: Say, rng: Rng): CountAroundState {
  if (state.complete || state.ruledOut.includes(key(what))) return state;
  if (key(what) !== key(whatToSay(state.n, state.rules))) {
    return { ...state, ruledOut: [...state.ruledOut, key(what)], mistakes: state.mistakes + 1 };
  }
  const n = state.n + 1;
  if (n > state.to) return { ...state, complete: true, ruledOut: [] };
  return { ...state, n, turn: (state.turn + 1) % state.players, numbers: numbersFor(rng, n), ruledOut: [] };
}
