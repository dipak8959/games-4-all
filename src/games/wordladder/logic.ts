import { randInt, shuffle, type Rng } from '../../util/random';
import { FOUR, THREE } from './words';

/**
 * Word Ladder.
 *
 * Get from one word to another by changing one letter at a time, and every
 * step on the way has to be a real word: COLD, CORD, CARD, WARD, WARM.
 * Lewis Carroll published it as Doublets in 1879. Three ladders make a
 * round.
 *
 * Each rung offers a few words, every one of them a real word one letter
 * away from where the player is. One of them is a step closer to the word
 * at the bottom; the others aren't. So each choice is a small piece of
 * planning — which change actually gets me nearer? — as well as reading.
 *
 * It grows along everything that makes that harder: three-letter words to
 * four, longer ladders, more words to choose between, and wrong answers
 * that stop being obviously wrong. At first they lead further away; from
 * level 4 some go sideways, just as far from the end as where you are; at
 * the top they all do, and they share as many letters with the last word
 * as the right one — so counting matching letters no longer finds the way.
 *
 * Every word on screen comes from the hand-picked lists in `words.ts`.
 *
 * Forgiving like everything else: a wrong word costs a mistake and dims,
 * and the child looks again.
 */

export const LADDERS_PER_ROUND = 3;

export type Rung = {
  /** The words offered, in the order shown. */
  readonly choices: readonly string[];
  /** The one that is a step closer. */
  readonly answer: string;
};

export type Ladder = {
  /** Every word from top to bottom, the start first and the goal last. */
  readonly path: readonly string[];
  /** One per step: `rungs[i]` gets from `path[i]` to `path[i + 1]`. */
  readonly rungs: readonly Rung[];
};

export type WordLadderState = {
  readonly ladder: Ladder;
  /** Steps taken on this ladder. */
  readonly step: number;
  /** Words tried wrongly on this step. */
  readonly ruledOut: readonly string[];
  /** The ladder is climbed and stays on show for a moment. */
  readonly done: boolean;
  readonly ladderIndex: number;
  readonly mistakes: number;
  readonly complete: boolean;
};

type LevelSpec = {
  readonly length: 3 | 4;
  readonly steps: number;
  readonly choices: number;
  /** 0: wrong words lead further away. 1: at least one goes sideways. 2: all
   *  go sideways where they can, and look as close to the goal as the right
   *  one does. */
  readonly temptation: 0 | 1 | 2;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { length: 3, steps: 2, choices: 2, temptation: 0 },
  { length: 3, steps: 3, choices: 3, temptation: 0 },
  { length: 4, steps: 3, choices: 3, temptation: 0 },
  { length: 4, steps: 4, choices: 3, temptation: 1 },
  { length: 4, steps: 5, choices: 4, temptation: 1 },
  { length: 4, steps: 6, choices: 4, temptation: 2 },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

// --- the word graph --------------------------------------------------------

const oneApart = (a: string, b: string) => {
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) diff += 1;
  return diff === 1;
};

const graphs = new Map<number, Map<string, string[]>>();

/** Every word of this length, and the words one letter away from it. */
export function graph(length: 3 | 4): Map<string, string[]> {
  const cached = graphs.get(length);
  if (cached) return cached;
  const words = length === 3 ? THREE : FOUR;
  const out = new Map<string, string[]>(words.map((w) => [w, words.filter((o) => oneApart(w, o))]));
  graphs.set(length, out);
  return out;
}

/** How many steps every word is from `goal`. Words that can't reach it are
 *  left out. */
export function distancesTo(goal: string): Map<string, number> {
  const g = graph(goal.length as 3 | 4);
  const dist = new Map([[goal, 0]]);
  let frontier = [goal];
  while (frontier.length) {
    const next: string[] = [];
    for (const w of frontier) {
      for (const n of g.get(w) ?? []) {
        if (!dist.has(n)) {
          dist.set(n, (dist.get(w) as number) + 1);
          next.push(n);
        }
      }
    }
    frontier = next;
  }
  return dist;
}

const shared = (a: string, b: string) => [...a].filter((ch, i) => b[i] === ch).length;

/** Wrong words for one step from `from`, whose distance to the goal is `d`. */
function decoys(
  rng: Rng,
  from: string,
  d: number,
  goal: string,
  dist: Map<string, number>,
  spec: LevelSpec,
  climbed: readonly string[],
): string[] | null {
  // Words already on the ladder go last: stepping back up is a wrong answer
  // nobody needs to think about.
  const around = [...(graph(spec.length).get(from) ?? [])].sort(
    (a, b) => Number(climbed.includes(a)) - Number(climbed.includes(b)),
  );
  const fresh = (words: string[]) => [
    ...shuffle(rng, words.filter((w) => !climbed.includes(w))),
    ...words.filter((w) => climbed.includes(w)),
  ];
  const sideways = fresh(around.filter((w) => dist.get(w) === d));
  const further = fresh(around.filter((w) => (dist.get(w) ?? Infinity) > d));
  const need = spec.choices - 1;
  if (sideways.length + further.length < need) return null;

  let order: string[];
  if (spec.temptation === 0) order = [...further, ...sideways];
  else if (spec.temptation === 1) order = [...sideways.slice(0, 1), ...further, ...sideways.slice(1)];
  else {
    // The most tempting first: sideways, and looking as close to the goal
    // as possible.
    order = [...[...sideways].sort((a, b) => shared(b, goal) - shared(a, goal)), ...further];
    // The sort is stable, so a climbed word still sorts after a fresh one
    // that looks as close.
  }
  return order.slice(0, need);
}

/** A ladder of exactly the level's number of steps, from a start no step
 *  shorter, with enough wrong words at every rung. */
export function createLadder(rng: Rng, level: number, avoid: readonly string[] = []): Ladder {
  const spec = specForLevel(level);
  const words = [...graph(spec.length).keys()];
  for (let attempt = 0; attempt < 400; attempt += 1) {
    const goal = words[randInt(rng, 0, words.length - 1)];
    if (avoid.includes(goal)) continue;
    const dist = distancesTo(goal);
    const starts = [...dist].filter(([w, d]) => d === spec.steps && !avoid.includes(w)).map(([w]) => w);
    if (starts.length === 0) continue;

    const path = [starts[randInt(rng, 0, starts.length - 1)]];
    const rungs: Rung[] = [];
    let ok = true;
    for (let d = spec.steps; d > 0 && ok; d -= 1) {
      const from = path[path.length - 1];
      const closer = (graph(spec.length).get(from) ?? []).filter((w) => dist.get(w) === d - 1);
      const wrong = decoys(rng, from, d, goal, dist, spec, path);
      if (!wrong || closer.length === 0) {
        ok = false;
      } else {
        const answer = closer[randInt(rng, 0, closer.length - 1)];
        rungs.push({ choices: shuffle(rng, [answer, ...wrong]), answer });
        path.push(answer);
      }
    }
    if (ok) return { path, rungs };
  }
  throw new Error(`No ladder found for level ${level}`);
}

export function createGame(rng: Rng, level: number): WordLadderState {
  return {
    ladder: createLadder(rng, level),
    step: 0,
    ruledOut: [],
    done: false,
    ladderIndex: 0,
    mistakes: 0,
    complete: false,
  };
}

export function choose(state: WordLadderState, word: string): WordLadderState {
  if (state.complete || state.done || state.ruledOut.includes(word)) return state;
  const rung = state.ladder.rungs[state.step];
  if (!rung.choices.includes(word)) return state;
  if (word !== rung.answer) {
    return { ...state, ruledOut: [...state.ruledOut, word], mistakes: state.mistakes + 1 };
  }
  const step = state.step + 1;
  return { ...state, step, ruledOut: [], done: step === state.ladder.rungs.length };
}

/** After a climbed ladder has been seen: the next one, or the end. */
export function nextLadder(state: WordLadderState, rng: Rng, level: number): WordLadderState {
  if (!state.done) return state;
  const ladderIndex = state.ladderIndex + 1;
  if (ladderIndex >= LADDERS_PER_ROUND) return { ...state, ladderIndex, done: false, complete: true };
  return {
    ...state,
    ladder: createLadder(rng, level, state.ladder.path),
    step: 0,
    ruledOut: [],
    done: false,
    ladderIndex,
  };
}
