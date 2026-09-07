import { pick, shuffle, type Rng } from '../../util/random';

/**
 * Word Builder.
 *
 * A picture appears; its name is spelled out in scrambled letter tiles below.
 * Tap tiles in order to spell it. Reading is the whole point here — this is
 * the one game in the catalogue built for readers, which is why it's the one
 * game restricted to the oldest age group (see `src/games/catalog.ts`).
 *
 * Wrong taps cost nothing but a nudge, same as every other game: the letter
 * just needed stays needed, and the tapped tile stays available to try again.
 */

export type WordPuzzle = {
  readonly word: string;
  readonly emoji: string;
};

export type Tile = {
  readonly letter: string;
  readonly used: boolean;
};

export type WordBuilderState = {
  readonly puzzle: WordPuzzle;
  /** Scrambled letter tiles for the current puzzle, fixed once it's created. */
  readonly tiles: readonly Tile[];
  /** Correct letters placed so far, in word order. */
  readonly filled: readonly string[];
  readonly mistakes: number;
  readonly wordIndex: number;
  readonly complete: boolean;
};

/** Concrete, unambiguous nouns with a matching single emoji, grouped by
 *  length so difficulty grows with the word rather than with anything
 *  arbitrary. Every tier is bigger than one round needs, so freshness
 *  (avoiding the immediately previous word) has real room to work with. */
const THREE_LETTER_WORDS: readonly WordPuzzle[] = [
  { word: 'cat', emoji: '🐱' },
  { word: 'dog', emoji: '🐶' },
  { word: 'sun', emoji: '☀️' },
  { word: 'hat', emoji: '🎩' },
  { word: 'cup', emoji: '☕' },
  { word: 'bus', emoji: '🚌' },
  { word: 'pig', emoji: '🐷' },
  { word: 'bee', emoji: '🐝' },
  { word: 'fox', emoji: '🦊' },
  { word: 'box', emoji: '📦' },
];

const FOUR_LETTER_WORDS: readonly WordPuzzle[] = [
  { word: 'frog', emoji: '🐸' },
  { word: 'star', emoji: '⭐' },
  { word: 'fish', emoji: '🐟' },
  { word: 'tree', emoji: '🌳' },
  { word: 'book', emoji: '📖' },
  { word: 'moon', emoji: '🌙' },
  { word: 'cake', emoji: '🎂' },
  { word: 'duck', emoji: '🦆' },
  { word: 'lion', emoji: '🦁' },
  { word: 'ball', emoji: '⚽' },
];

const FIVE_LETTER_WORDS: readonly WordPuzzle[] = [
  { word: 'apple', emoji: '🍎' },
  { word: 'tiger', emoji: '🐯' },
  { word: 'house', emoji: '🏠' },
  { word: 'grape', emoji: '🍇' },
  { word: 'water', emoji: '💧' },
  { word: 'snake', emoji: '🐍' },
  { word: 'mouse', emoji: '🐭' },
  { word: 'plant', emoji: '🌱' },
  { word: 'cloud', emoji: '☁️' },
  { word: 'sheep', emoji: '🐑' },
];

export const WORDS_PER_ROUND = 4;

/** Word length grows with level: 3 letters, then 4, then 5. Adaptive
 *  difficulty (see `nextLevel`) moves a child through these gradually. */
export function wordPoolForLevel(level: number): readonly WordPuzzle[] {
  if (level <= 2) return THREE_LETTER_WORDS;
  if (level <= 4) return FOUR_LETTER_WORDS;
  return FIVE_LETTER_WORDS;
}

/** Scrambles a word's letters into tiles, retrying once if the shuffle
 *  happens to land back in the already-solved order. */
function scrambleWord(rng: Rng, word: string): Tile[] {
  let letters = shuffle(rng, word.split(''));
  if (letters.join('') === word) letters = shuffle(rng, letters);
  return letters.map((letter) => ({ letter, used: false }));
}

function pickPuzzle(rng: Rng, level: number, avoidWord: string | null): WordPuzzle {
  const pool = wordPoolForLevel(level);
  const fresh = avoidWord == null ? pool : pool.filter((p) => p.word !== avoidWord);
  return pick(rng, fresh.length > 0 ? fresh : pool);
}

function startPuzzle(rng: Rng, level: number, avoidWord: string | null): { puzzle: WordPuzzle; tiles: Tile[] } {
  const puzzle = pickPuzzle(rng, level, avoidWord);
  return { puzzle, tiles: scrambleWord(rng, puzzle.word) };
}

export function createGame(rng: Rng, level: number, avoidWord: string | null = null): WordBuilderState {
  const { puzzle, tiles } = startPuzzle(rng, level, avoidWord);
  return { puzzle, tiles, filled: [], mistakes: 0, wordIndex: 0, complete: false };
}

/**
 * Applies a tapped tile.
 *
 * Tiles are matched by position, not just letter, so a word with a repeated
 * letter (e.g. "apple") works correctly: either matching tile can fill a
 * given slot, and using one never blocks the other from filling a later slot
 * that needs the same letter.
 */
export function tapTile(state: WordBuilderState, tileIndex: number, rng: Rng, level: number): WordBuilderState {
  if (state.complete) return state;

  const tile = state.tiles[tileIndex];
  if (!tile || tile.used) return state;

  const neededLetter = state.puzzle.word[state.filled.length];
  if (tile.letter !== neededLetter) {
    return { ...state, mistakes: state.mistakes + 1 };
  }

  const tiles = state.tiles.map((t, i) => (i === tileIndex ? { ...t, used: true } : t));
  const filled = [...state.filled, tile.letter];

  if (filled.length < state.puzzle.word.length) {
    return { ...state, tiles, filled };
  }

  // This word is solved. Move to the next one, or finish the round.
  const wordIndex = state.wordIndex + 1;
  if (wordIndex >= WORDS_PER_ROUND) {
    return { ...state, tiles, filled, wordIndex, complete: true };
  }

  const next = startPuzzle(rng, level, state.puzzle.word);
  return {
    puzzle: next.puzzle,
    tiles: next.tiles,
    filled: [],
    mistakes: state.mistakes,
    wordIndex,
    complete: false,
  };
}
