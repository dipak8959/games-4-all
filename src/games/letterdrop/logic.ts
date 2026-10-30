import { pick, randInt, shuffle, type Rng } from '../../util/random';
import { wordPoolForLevel, type WordPuzzle } from '../wordbuilder/logic';

/**
 * Letter Drop.
 *
 * A picture at the top, and a row of empty boxes for its name. Letters come
 * falling down the screen; tap the one the word needs next, and it flies up
 * into its box. Spell the whole word, and on to the next picture.
 *
 * It practises spelling: hearing a word in your head and picking out its
 * letters, in order, from others that look just as good. It grows with the
 * player: the word written out faintly to match at first, then only the
 * picture to go on; longer words; more letters that aren't needed; faster
 * falling, in more columns.
 *
 * Kind like everything else: a wrong letter just carries on falling, and a
 * letter that falls off the bottom comes round again — the one needed next
 * always does. Five words is the round, fixed before the first letter
 * falls. There's no score: the stars come from how few wrong taps.
 */

export const FIELD_WIDTH = 320;
export const FIELD_HEIGHT = 480;
/** The picture and the boxes, across the top. */
export const TOP = 138;
export const TILE = 62;
export const WORDS = 5;
/** How long a finished word shows before the next. */
export const REST = 1.3;
/** How long "not that one" shows. */
export const SHOW = 0.8;

export type Letter = {
  readonly id: number;
  readonly char: string;
  readonly lane: number;
  readonly y: number;
  /** Tapped when it wasn't the one needed: it keeps falling, marked. */
  readonly tried: boolean;
};

export type LetterDropState = {
  readonly lanes: number;
  readonly speed: number;
  readonly decoys: number;
  /** The word written out faintly in its boxes, to match. */
  readonly showWord: boolean;
  readonly words: readonly WordPuzzle[];
  readonly index: number;
  /** Letters of the word in their boxes so far. */
  readonly filled: number;
  readonly letters: readonly Letter[];
  readonly sinceSpawn: number;
  readonly nextId: number;
  readonly mistakes: number;
  readonly said: 'not' | 'word' | null;
  readonly saidFor: number;
  readonly complete: boolean;
};

type LevelSpec = {
  readonly length: number;
  readonly showWord: boolean;
  readonly speed: number;
  /** How many of the falling letters aren't in the word at all. */
  readonly decoys: number;
  readonly lanes: number;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { length: 3, showWord: true, speed: 32, decoys: 0.25, lanes: 3 },
  { length: 3, showWord: true, speed: 38, decoys: 0.4, lanes: 3 },
  { length: 3, showWord: false, speed: 42, decoys: 0.4, lanes: 3 },
  { length: 4, showWord: false, speed: 46, decoys: 0.45, lanes: 4 },
  { length: 5, showWord: false, speed: 50, decoys: 0.5, lanes: 4 },
  { length: 5, showWord: false, speed: 60, decoys: 0.55, lanes: 4 },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

/** Spell It's picture words, by length. */
export function wordsOfLength(length: number): readonly WordPuzzle[] {
  return wordPoolForLevel(length <= 3 ? 1 : length === 4 ? 3 : 5);
}

export function laneX(state: Pick<LetterDropState, 'lanes'>, lane: number): number {
  return (FIELD_WIDTH * (lane + 0.5)) / state.lanes;
}

export function wordNow(state: Pick<LetterDropState, 'words' | 'index'>): string {
  return state.words[Math.min(state.index, state.words.length - 1)].word;
}

/** The letter the word needs next. */
export function needed(state: LetterDropState): string | null {
  const word = wordNow(state);
  return state.filled < word.length ? word[state.filled] : null;
}

export function createGame(rng: Rng, level: number): LetterDropState {
  const spec = specForLevel(level);
  const words = shuffle(rng, wordsOfLength(spec.length)).slice(0, WORDS);
  return {
    lanes: spec.lanes,
    speed: spec.speed,
    decoys: spec.decoys,
    showWord: spec.showWord,
    words,
    index: 0,
    filled: 0,
    letters: [],
    sinceSpawn: spawnEvery(spec.speed),
    nextId: 0,
    mistakes: 0,
    said: null,
    saidFor: 0,
    complete: false,
  };
}

function spawnEvery(speed: number): number {
  return 64 / speed;
}

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

/** The next letter to fall: the one needed, if none of it is on the way
 *  down; else another from the word, or one that isn't in it at all. */
function nextChar(state: LetterDropState, rng: Rng): string {
  const need = needed(state);
  const word = wordNow(state);
  if (need && !state.letters.some((l) => l.char === need && l.y < FIELD_HEIGHT - TILE)) return need;
  if (rng() < state.decoys) {
    const outside = ALPHABET.split('').filter((c) => !word.includes(c));
    return pick(rng, outside);
  }
  return word[randInt(rng, state.filled, word.length - 1)];
}

function spawn(state: LetterDropState, rng: Rng): LetterDropState {
  // A column with room at the top for another letter.
  const free = Array.from({ length: state.lanes }, (_, i) => i).filter(
    (lane) => !state.letters.some((l) => l.lane === lane && l.y < TOP + TILE * 0.9),
  );
  if (!free.length) return state;
  const letter: Letter = { id: state.nextId, char: nextChar(state, rng), lane: pick(rng, free), y: TOP - TILE / 2, tried: false };
  return { ...state, letters: [...state.letters, letter], nextId: state.nextId + 1, sinceSpawn: 0 };
}

export function step(state: LetterDropState, seconds: number, rng: Rng): LetterDropState {
  if (state.complete) return state;
  const dt = Math.min(seconds, 0.25);
  const saidFor = Math.max(0, state.saidFor - dt);
  // A word just finished: it shows, then the next picture.
  if (state.said === 'word') {
    if (saidFor > 0) return { ...state, saidFor };
    const index = state.index + 1;
    if (index >= state.words.length) return { ...state, saidFor: 0, said: null, complete: true };
    return { ...state, index, filled: 0, letters: [], said: null, saidFor: 0, sinceSpawn: spawnEvery(state.speed) };
  }
  let next: LetterDropState = {
    ...state,
    saidFor,
    said: saidFor > 0 ? state.said : null,
    sinceSpawn: state.sinceSpawn + dt,
    // Down, and off the bottom.
    letters: state.letters.map((l) => ({ ...l, y: l.y + state.speed * dt })).filter((l) => l.y < FIELD_HEIGHT + TILE / 2),
  };
  if (next.sinceSpawn >= spawnEvery(state.speed)) next = spawn(next, rng);
  return next;
}

/** On the screen below the picture: a finger can reach it. */
export function reachable(letter: Letter): boolean {
  return letter.y > TOP + TILE * 0.3 && letter.y < FIELD_HEIGHT - TILE * 0.3;
}

/** A letter tapped: into its box if it's the one needed, else marked. */
export function tapLetter(state: LetterDropState, id: number): LetterDropState {
  if (state.complete || state.said === 'word') return state;
  const letter = state.letters.find((l) => l.id === id);
  if (!letter) return state;
  if (letter.char !== needed(state)) {
    if (letter.tried) return state;
    return {
      ...state,
      mistakes: state.mistakes + 1,
      said: 'not',
      saidFor: SHOW,
      letters: state.letters.map((l) => (l.id === id ? { ...l, tried: true } : l)),
    };
  }
  const filled = state.filled + 1;
  const letters = state.letters.filter((l) => l.id !== id);
  if (filled >= wordNow(state).length) return { ...state, filled, letters, said: 'word', saidFor: REST };
  return { ...state, filled, letters, said: null, saidFor: 0 };
}

/** Words spelled so far, with the one being spelled counted in part. */
export function progressOf(state: LetterDropState): number {
  if (state.complete) return 1;
  return (state.index + state.filled / wordNow(state).length) / state.words.length;
}
