import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import {
  createGame,
  decoysForLevel,
  tapTile,
  wordPoolForLevel,
  WORDS_PER_ROUND,
} from '../src/games/wordbuilder/logic.ts';

// --- word pools ---------------------------------------------------------

test('word length grows with level: 3, then 4, then 5 letters', () => {
  assert.ok(wordPoolForLevel(1).every((p) => p.word.length === 3));
  assert.ok(wordPoolForLevel(2).every((p) => p.word.length === 3));
  assert.ok(wordPoolForLevel(3).every((p) => p.word.length === 4));
  assert.ok(wordPoolForLevel(4).every((p) => p.word.length === 4));
  assert.ok(wordPoolForLevel(5).every((p) => p.word.length === 5));
  assert.ok(wordPoolForLevel(6).every((p) => p.word.length === 5));
});

test('every pool is bigger than one round needs, for replay variety', () => {
  for (const level of [1, 3, 5]) {
    assert.ok(wordPoolForLevel(level).length > WORDS_PER_ROUND);
  }
});

test('every word is lowercase letters only, with a non-empty emoji clue', () => {
  for (const level of [1, 3, 5]) {
    for (const { word, emoji } of wordPoolForLevel(level)) {
      assert.match(word, /^[a-z]+$/, `"${word}" has unexpected characters`);
      assert.ok(emoji.length > 0, `"${word}" has no emoji clue`);
    }
  }
});

// --- scrambling ----------------------------------------------------------

test("scrambled tiles are the word's letters plus the level's decoys, never pre-solved", () => {
  for (const level of [1, 2, 3, 4, 5, 6]) {
    for (let seed = 0; seed < 120; seed++) {
      const state = createGame(seededRng(seed), level);
      const word = state.puzzle.word;
      const tiles = state.tiles.map((t) => t.letter);
      assert.equal(tiles.length, word.length + decoysForLevel(level), `level ${level} seed ${seed}`);

      // Every letter of the word is there, as many times as it's needed...
      const remaining = [...tiles];
      for (const letter of word) {
        const at = remaining.indexOf(letter);
        assert.ok(at >= 0, `level ${level} seed ${seed}: "${word}" is missing a "${letter}"`);
        remaining.splice(at, 1);
      }
      // ...and a decoy is never a letter the word uses, so there is never a
      // second right answer to confuse things.
      for (const decoy of remaining) {
        assert.ok(!word.includes(decoy), `level ${level} seed ${seed}: decoy "${decoy}" is in "${word}"`);
      }

      assert.ok(!tiles.join('').startsWith(word), `level ${level} seed ${seed}: tiles started pre-solved`);
    }
  }
});

test('a decoy tap is a mistake, and the word can still be finished', () => {
  let state = createGame(seededRng(3), 6);
  const decoy = state.tiles.findIndex((t) => !state.puzzle.word.includes(t.letter));
  assert.ok(decoy >= 0);
  const after = tapTile(state, decoy, seededRng(3), 6);
  assert.equal(after.mistakes, 1);
  assert.equal(after.tiles[decoy].used, false, 'the decoy stays on the board');
  state = after;
  for (const letter of state.puzzle.word) {
    const i = state.tiles.findIndex((t) => !t.used && t.letter === letter);
    state = tapTile(state, i, seededRng(3), 6);
  }
  assert.equal(state.wordIndex, 1, 'the word was spelled despite the decoy');
});

test('every tile starts unused', () => {
  const state = createGame(seededRng(1), 1);
  assert.ok(state.tiles.every((t) => !t.used));
});

// --- solving ---------------------------------------------------------------

test('tapping the correct next letter fills it in and locks that tile', () => {
  const state = createGame(seededRng(2), 1);
  const firstLetter = state.puzzle.word[0];
  const tileIndex = state.tiles.findIndex((t) => t.letter === firstLetter);

  const next = tapTile(state, tileIndex, seededRng(99), 1);
  assert.deepEqual(next.filled, [firstLetter]);
  assert.equal(next.tiles[tileIndex].used, true);
  assert.equal(next.mistakes, 0);
});

test('tapping the wrong letter costs a mistake and changes nothing else', () => {
  const state = createGame(seededRng(3), 1);
  const firstLetter = state.puzzle.word[0];
  const wrongIndex = state.tiles.findIndex((t) => t.letter !== firstLetter);
  if (wrongIndex === -1) return; // every letter happened to be the needed one; nothing to test here

  const next = tapTile(state, wrongIndex, seededRng(99), 1);
  assert.equal(next.mistakes, 1);
  assert.deepEqual(next.filled, []);
  assert.equal(next.tiles[wrongIndex].used, false, 'a wrong tap must not lock the tile');
});

test('tapping an already-used tile again does nothing', () => {
  let state = createGame(seededRng(4), 1);
  const firstLetter = state.puzzle.word[0];
  const tileIndex = state.tiles.findIndex((t) => t.letter === firstLetter);
  state = tapTile(state, tileIndex, seededRng(1), 1);

  const again = tapTile(state, tileIndex, seededRng(1), 1);
  assert.deepEqual(again, state, 'tapping a locked tile must be a no-op');
});

test('a word with a repeated letter (apple) is solvable using either matching tile', () => {
  // Force level 5 (5-letter words) and search seeds for the word "apple",
  // which has two "p" tiles — the case that would break index-unsafe logic.
  for (let seed = 0; seed < 500; seed++) {
    const before = createGame(seededRng(seed), 5);
    if (before.puzzle.word !== 'apple') continue;

    let state = before;
    const rng = seededRng(seed + 1);
    // Solve every letter but the last, checking progress after each tap —
    // the word is still "apple" and `filled` still visible right up until
    // the final letter, which advances to a new puzzle.
    for (let i = 0; i < before.puzzle.word.length - 1; i++) {
      const letter: string = before.puzzle.word[i];
      const tileIndex = state.tiles.findIndex((t) => !t.used && t.letter === letter);
      assert.ok(tileIndex >= 0, `no available tile for "${letter}" (position ${i})`);
      state = tapTile(state, tileIndex, rng, 5);
      assert.deepEqual(state.filled, before.puzzle.word.slice(0, i + 1).split(''));
      assert.equal(state.mistakes, 0);
    }

    // Final letter: completes "apple" and moves on to word 2 of the round.
    const lastLetter = before.puzzle.word[before.puzzle.word.length - 1];
    const lastTileIndex = state.tiles.findIndex((t) => !t.used && t.letter === lastLetter);
    state = tapTile(state, lastTileIndex, rng, 5);
    assert.equal(state.mistakes, 0);
    assert.equal(state.wordIndex, 1);
    assert.deepEqual(state.filled, [], 'the next word starts with nothing filled in');
    return; // found and verified "apple"; done
  }
  throw new Error('no seed in range produced "apple" — widen the search or check the word pool');
});

test('solving every word in a round completes it with zero mistakes', () => {
  const rng = seededRng(7);
  let state = createGame(rng, 3);

  for (let w = 0; w < WORDS_PER_ROUND; w++) {
    assert.equal(state.complete, false, `round ended early at word ${w}`);
    for (const letter of state.puzzle.word) {
      const tileIndex = state.tiles.findIndex((t) => !t.used && t.letter === letter);
      state = tapTile(state, tileIndex, rng, 3);
    }
  }

  assert.equal(state.complete, true);
  assert.equal(state.mistakes, 0);
});

test('consecutive words in a round never repeat, when the pool allows it', () => {
  const rng = seededRng(11);
  let state = createGame(rng, 1);
  const seenWords = [state.puzzle.word];

  for (let w = 0; w < WORDS_PER_ROUND - 1; w++) {
    for (const letter of state.puzzle.word) {
      const tileIndex = state.tiles.findIndex((t) => !t.used && t.letter === letter);
      state = tapTile(state, tileIndex, rng, 1);
    }
    seenWords.push(state.puzzle.word);
  }

  for (let i = 1; i < seenWords.length; i++) {
    assert.notEqual(seenWords[i], seenWords[i - 1], `word ${i} repeated word ${i - 1}`);
  }
});

test('a fresh game avoids the previous round\'s last word, when the pool allows it', () => {
  for (let seed = 0; seed < 100; seed++) {
    const first = createGame(seededRng(seed), 1);
    const second = createGame(seededRng(seed + 1000), 1, first.puzzle.word);
    assert.notEqual(second.puzzle.word, first.puzzle.word, `seed ${seed}`);
  }
});

test('nothing after completion can be tapped further', () => {
  const rng = seededRng(21);
  let state = createGame(rng, 1);
  for (let w = 0; w < WORDS_PER_ROUND; w++) {
    for (const letter of state.puzzle.word) {
      const tileIndex = state.tiles.findIndex((t) => !t.used && t.letter === letter);
      state = tapTile(state, tileIndex, rng, 1);
    }
  }
  assert.equal(state.complete, true);

  const after = tapTile(state, 0, rng, 1);
  assert.deepEqual(after, state);
});
