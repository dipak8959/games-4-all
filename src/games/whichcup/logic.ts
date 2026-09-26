import { randInt, type Rng } from '../../util/random';

/**
 * Which Cup?
 *
 * A ball goes under one of a row of cups. The cups slide round each other,
 * slowly, a set number of times. Then: which cup is it under? Five balls
 * found make a round.
 *
 * It practises keeping track — holding your eyes on one thing while others
 * just like it move round it — which is the attention a young child is
 * still building, and it grows from two cups swapped once to four cups
 * swapped seven times, any cup with any other.
 *
 * Nothing moves fast. The slowest swap takes over a second and the quickest
 * three-quarters of one, and nothing moves at all while the child is
 * choosing: there is no clock on the answer.
 *
 * Forgiving like everything else: a wrong cup lifts to show it's empty,
 * costs a mistake and stays lifted, and the child picks again.
 */

export const QUESTIONS_PER_ROUND = 5;

export type Phase =
  /** The cups are up and the ball can be seen. */
  | 'show'
  /** The cups are down and sliding round. */
  | 'shuffle'
  /** Waiting for a cup to be picked. */
  | 'choose'
  /** The right cup is up, showing the ball. */
  | 'found';

/** Two slots, left to right, whose cups trade places. */
export type Swap = readonly [number, number];

export type CupQuestion = {
  readonly cups: number;
  /** The slot the ball starts in. */
  readonly start: number;
  readonly swaps: readonly Swap[];
};

export type WhichCupState = {
  readonly question: CupQuestion;
  readonly phase: Phase;
  /** Slots picked wrongly this question; their cups stay lifted. */
  readonly ruledOut: readonly number[];
  readonly questionIndex: number;
  readonly mistakes: number;
  readonly complete: boolean;
};

type LevelSpec = {
  readonly cups: number;
  readonly swaps: number;
  /** How long one swap takes, in milliseconds. */
  readonly swapMs: number;
  /** `next`: only cups side by side swap. `any`: a cup can cross the row. */
  readonly reach: 'next' | 'any';
};

/**
 * One entry per level, 1-6. More cups, more swaps, and from level 4 swaps
 * that cross over the middle; a little quicker each level, never fast. Four
 * cups is the most that fit across a phone at a size a child can tap.
 */
const LEVELS: readonly LevelSpec[] = [
  { cups: 2, swaps: 1, swapMs: 1100, reach: 'next' },
  { cups: 3, swaps: 2, swapMs: 1000, reach: 'next' },
  { cups: 3, swaps: 3, swapMs: 950, reach: 'next' },
  { cups: 4, swaps: 4, swapMs: 900, reach: 'any' },
  { cups: 4, swaps: 5, swapMs: 850, reach: 'any' },
  { cups: 4, swaps: 7, swapMs: 750, reach: 'any' },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

/** Where the ball is after the first `count` swaps. */
export function ballAfter(question: CupQuestion, count: number = question.swaps.length): number {
  let ball = question.start;
  for (const [a, b] of question.swaps.slice(0, count)) {
    if (ball === a) ball = b;
    else if (ball === b) ball = a;
  }
  return ball;
}

function randomSwap(rng: Rng, spec: LevelSpec, mustTouch: number | null): Swap {
  if (spec.reach === 'next') {
    if (mustTouch !== null) {
      const sides = [mustTouch - 1, mustTouch].filter((a) => a >= 0 && a + 1 < spec.cups);
      const a = sides[randInt(rng, 0, sides.length - 1)];
      return [a, a + 1];
    }
    const a = randInt(rng, 0, spec.cups - 2);
    return [a, a + 1];
  }
  const a = mustTouch ?? randInt(rng, 0, spec.cups - 1);
  let b = randInt(rng, 0, spec.cups - 2);
  if (b >= a) b += 1;
  return a < b ? [a, b] : [b, a];
}

/**
 * A fresh question. The ball's own cup moves in the first swap and in most
 * of the rest — a shuffle that never touches it is no test of following it —
 * and the same two cups never swap straight back, which would look like
 * nothing happened.
 */
export function createQuestion(rng: Rng, level: number): CupQuestion {
  const spec = specForLevel(level);
  const start = randInt(rng, 0, spec.cups - 1);
  const swaps: Swap[] = [];
  let ball = start;
  for (let i = 0; i < spec.swaps; i += 1) {
    let touch = i === 0 || rng() < 0.6;
    let swap = randomSwap(rng, spec, touch ? ball : null);
    // With three cups in a row the ball's cup sometimes has only one
    // neighbour, the one it just swapped with — then another pair moves.
    for (let tries = 0; tries < 20 && spec.cups > 2 && sameSwap(swap, swaps[i - 1]); tries += 1) {
      if (tries === 10) touch = false;
      swap = randomSwap(rng, spec, touch ? ball : null);
    }
    swaps.push(swap);
    if (ball === swap[0]) ball = swap[1];
    else if (ball === swap[1]) ball = swap[0];
  }
  return { cups: spec.cups, start, swaps };
}

const sameSwap = (a: Swap, b: Swap | undefined) => b !== undefined && a[0] === b[0] && a[1] === b[1];

export function createGame(rng: Rng, level: number): WhichCupState {
  return {
    question: createQuestion(rng, level),
    phase: 'show',
    ruledOut: [],
    questionIndex: 0,
    mistakes: 0,
    complete: false,
  };
}

/** Back to showing the ball, for the same question — after the game was
 *  paused mid-shuffle, so a child who looked away isn't asked to guess. */
export function showAgain(state: WhichCupState): WhichCupState {
  return state.phase === 'shuffle' ? { ...state, phase: 'show' } : state;
}

/** The screen calls this once the ball has been seen. */
export function startShuffle(state: WhichCupState): WhichCupState {
  return state.phase === 'show' ? { ...state, phase: 'shuffle' } : state;
}

/** The screen calls this once the last swap has finished. */
export function stopShuffle(state: WhichCupState): WhichCupState {
  return state.phase === 'shuffle' ? { ...state, phase: 'choose' } : state;
}

export function pick(state: WhichCupState, slot: number): WhichCupState {
  if (state.phase !== 'choose' || state.complete || state.ruledOut.includes(slot)) return state;
  if (slot === ballAfter(state.question)) return { ...state, phase: 'found' };
  return { ...state, ruledOut: [...state.ruledOut, slot], mistakes: state.mistakes + 1 };
}

/** After the ball has been shown found: the next question, or the end. */
export function next(state: WhichCupState, rng: Rng, level: number): WhichCupState {
  if (state.phase !== 'found') return state;
  const questionIndex = state.questionIndex + 1;
  if (questionIndex >= QUESTIONS_PER_ROUND) return { ...state, questionIndex, complete: true };
  return { ...state, question: createQuestion(rng, level), phase: 'show', ruledOut: [], questionIndex };
}

export type CupPlace = {
  /** Horizontal position, in slots: 0 is the leftmost slot. */
  readonly x: number;
  /** How far the cup is lifted off the row to pass another, -1 to 1. One
   *  cup of a pair goes over and the other under, so they never overlap. */
  readonly lift: number;
};

/** Smooth start and finish, so a cup never jumps off the mark. */
const ease = (p: number) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);

/**
 * Where every cup is, `ms` into the shuffle. Cups are named by the slot they
 * started in. Pure, so the shuffle the screen draws is the shuffle the
 * answer is worked out from.
 */
export function cupPlaces(question: CupQuestion, ms: number, swapMs: number): CupPlace[] {
  // Which cup is in which slot, one swap at a time.
  const inSlot = Array.from({ length: question.cups }, (_, i) => i);
  const done = Math.max(0, Math.min(question.swaps.length, Math.floor(ms / swapMs)));
  for (const [a, b] of question.swaps.slice(0, done)) [inSlot[a], inSlot[b]] = [inSlot[b], inSlot[a]];

  const places: CupPlace[] = [];
  inSlot.forEach((cup, slot) => {
    places[cup] = { x: slot, lift: 0 };
  });
  if (done < question.swaps.length) {
    const [a, b] = question.swaps[done];
    const p = ease((ms - done * swapMs) / swapMs);
    const arc = Math.sin(Math.PI * p);
    places[inSlot[a]] = { x: a + (b - a) * p, lift: -arc };
    places[inSlot[b]] = { x: b + (a - b) * p, lift: arc };
  }
  return places;
}

/** Which cup (named by its starting slot) has the ball under it. */
export const ballCup = (question: CupQuestion) => question.start;
