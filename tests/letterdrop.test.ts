import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng, type Rng } from '../src/util/random.ts';
import { starsForMistakes } from '../src/games/types.ts';
import {
  TILE,
  WORDS,
  createGame,
  needed,
  progressOf,
  reachable,
  specForLevel,
  step,
  tapLetter,
  wordNow,
  wordsOfLength,
  type LetterDropState,
} from '../src/games/letterdrop/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];
const DT = 1 / 30;

function play(initial: LetterDropState, rng: Rng, choose: (s: LetterDropState) => number | null, limit = 400) {
  let s = initial;
  let t = 0;
  for (; t < limit && !s.complete; t += DT) {
    const id = choose(s);
    if (id != null) s = tapLetter(s, id);
    s = step(s, DT, rng);
  }
  return { s, t };
}

/** A careful speller: taps the letter needed next once it's in reach. */
const careful = (s: LetterDropState): number | null => s.letters.find((l) => l.char === needed(s) && reachable(l))?.id ?? null;

test('a careful speller spells all five words without a wrong tap, in good time', () => {
  for (const level of LEVELS) {
    let slowest = 0;
    for (let seed = 0; seed < 30; seed += 1) {
      const rng = seededRng(seed * 17 + level);
      const { s, t } = play(createGame(rng, level), rng, careful);
      assert.equal(s.complete, true, `level ${level}, seed ${seed}: word ${s.index + 1}`);
      assert.equal(s.mistakes, 0);
      assert.equal(starsForMistakes(s.mistakes), 3);
      assert.equal(progressOf(s), 1);
      slowest = Math.max(slowest, t);
    }
    assert.ok(slowest < 150, `level ${level}: ${slowest.toFixed(0)}s for five words`);
  }
});

test('the words are the level\'s length, five different ones', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    const s = createGame(seededRng(level), level);
    assert.equal(s.words.length, WORDS);
    assert.equal(new Set(s.words.map((w) => w.word)).size, WORDS);
    for (const w of s.words) assert.equal(w.word.length, spec.length);
    assert.ok(wordsOfLength(spec.length).length >= WORDS);
  }
});

test('the letter needed next is never long in coming', () => {
  for (const level of LEVELS) {
    const rng = seededRng(level * 5);
    let s = createGame(rng, level);
    let waiting = 0;
    let longest = 0;
    for (let t = 0; t < 120 && !s.complete; t += DT) {
      const id = careful(s);
      if (id != null) {
        s = tapLetter(s, id);
        waiting = 0;
      } else if (s.said !== 'word') {
        waiting += DT;
        longest = Math.max(longest, waiting);
      }
      s = step(s, DT, rng);
    }
    assert.ok(longest < 12, `level ${level}: waited ${longest.toFixed(1)}s for a letter`);
  }
});

test('a wrong letter is one mistake, however often it is tapped, and keeps falling', () => {
  let checked = 0;
  for (let seed = 0; seed < 20 && checked < 5; seed += 1) {
    const rng = seededRng(seed);
    let s = createGame(rng, 3);
    for (let i = 0; i < 400; i += 1) s = step(s, DT, rng);
    const wrong = s.letters.find((l) => l.char !== needed(s));
    if (!wrong) continue;
    s = tapLetter(s, wrong.id);
    assert.equal(s.mistakes, 1);
    assert.equal(s.said, 'not');
    s = tapLetter(s, wrong.id);
    assert.equal(s.mistakes, 1);
    const after = step(s, DT, rng).letters.find((l) => l.id === wrong.id);
    if (after) assert.ok(after.y > wrong.y);
    checked += 1;
  }
  assert.ok(checked >= 3);
});

test('letters in a column never land on each other', () => {
  for (const level of LEVELS) {
    const rng = seededRng(level + 40);
    let s = createGame(rng, level);
    for (let i = 0; i < 2000; i += 1) {
      for (const a of s.letters) {
        for (const b of s.letters) {
          if (a.id < b.id && a.lane === b.lane) assert.ok(Math.abs(a.y - b.y) >= TILE, `level ${level}: letters overlap`);
        }
      }
      s = step(s, DT, rng);
    }
  }
});

test('tapping at random still spells the words in the end', () => {
  for (const level of LEVELS) {
    const rng = seededRng(level * 3);
    const { s } = play(
      createGame(rng, level),
      rng,
      (x) => {
        if (rng() > 0.1) return null;
        const on = x.letters.filter(reachable);
        return on.length ? on[Math.floor(rng() * on.length)].id : null;
      },
      3000,
    );
    assert.equal(s.complete, true, `level ${level}: on word ${s.index + 1}, ${wordNow(s)}`);
  }
});
