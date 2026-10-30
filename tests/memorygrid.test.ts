import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import {
  PATTERNS_PER_ROUND,
  createGame,
  replay,
  specForLevel,
  startInput,
  tapCell,
} from '../src/games/memorygrid/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];

test('each pattern lights the level\'s number of different squares, on the grid', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    for (let seed = 0; seed < 100; seed += 1) {
      const s = createGame(seededRng(seed * 5 + level), level);
      assert.equal(s.size, spec.size);
      assert.equal(s.lit.length, spec.lit);
      assert.equal(new Set(s.lit).size, s.lit.length, 'a square lit twice');
      assert.ok(s.lit.every((c) => c >= 0 && c < s.size * s.size));
      assert.ok(spec.lit < spec.size * spec.size, 'the whole grid lit is not a pattern');
    }
  }
});

test('nothing counts while the pattern is on show', () => {
  const rng = seededRng(1);
  const s = createGame(seededRng(1), 3);
  assert.equal(s.showing, true);
  assert.equal(tapCell(s, s.lit[0], rng, 3), s);
});

test('finding every lit square moves to a new pattern; five end the round', () => {
  const rng = seededRng(2);
  let s = createGame(seededRng(2), 4);
  for (let p = 0; p < PATTERNS_PER_ROUND; p += 1) {
    assert.equal(s.complete, false);
    const before = s.lit;
    s = startInput(s);
    for (const cell of before) s = tapCell(s, cell, rng, 4);
    if (p < PATTERNS_PER_ROUND - 1) {
      assert.equal(s.showing, true, 'the next pattern is shown');
      assert.notDeepEqual(s.lit, before, 'the next pattern is a new one');
      assert.deepEqual(s.found, []);
    }
  }
  assert.equal(s.complete, true);
  assert.equal(s.mistakes, 0);
});

test('a wrong square is one mistake, marked so it is never charged twice', () => {
  const rng = seededRng(3);
  const s = startInput(createGame(seededRng(3), 2));
  const wrong = Array.from({ length: s.size * s.size }, (_, i) => i).find((c) => !s.lit.includes(c)) as number;
  const once = tapCell(s, wrong, rng, 2);
  assert.equal(once.mistakes, 1);
  assert.deepEqual(once.missed, [wrong]);
  assert.equal(tapCell(once, wrong, rng, 2), once);
});

test('a found square stays found, and tapping it again does nothing', () => {
  const rng = seededRng(4);
  const s = startInput(createGame(seededRng(4), 3));
  const once = tapCell(s, s.lit[0], rng, 3);
  assert.deepEqual(once.found, [s.lit[0]]);
  assert.equal(tapCell(once, s.lit[0], rng, 3), once);
});

test('showing the pattern again is free and keeps what has been found', () => {
  const rng = seededRng(5);
  let s = startInput(createGame(seededRng(5), 5));
  s = tapCell(s, s.lit[0], rng, 5);
  const again = replay(s);
  assert.equal(again.showing, true);
  assert.deepEqual(again.lit, s.lit, 'the same pattern, not a new one');
  assert.deepEqual(again.found, s.found);
  assert.equal(again.mistakes, s.mistakes);
  assert.equal(replay(again), again, 'nothing to replay while it is on show');
});
