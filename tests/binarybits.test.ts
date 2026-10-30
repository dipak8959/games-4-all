import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import { MOST_EXTRA, NUMBERS, createGame, fewest, next, ones, specForLevel, starsForExtra, toggle } from '../src/games/binarybits/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];

test('a careful player switches only the bits that differ, and gets three stars', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 20; seed += 1) {
      let s = createGame(seededRng(seed * 13 + level), level);
      while (!s.complete) {
        const want = s.targets[s.index];
        for (let bit = 0; bit < s.bits; bit += 1) {
          if (((s.value ^ want) >> bit) & 1) s = toggle(s, bit);
        }
        assert.equal(s.made, true);
        assert.equal(s.value, want);
        s = next(s);
      }
      assert.equal(s.extra, 0);
      assert.equal(starsForExtra(s.extra), 3);
    }
  }
});

test('numbers fit the bits, never repeat, and start away from the answer', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    const s = createGame(seededRng(level * 5), level);
    assert.equal(s.targets.length, NUMBERS);
    if (2 ** spec.bits - 1 >= NUMBERS * 2) assert.equal(new Set(s.targets).size, NUMBERS);
    for (let i = 1; i < NUMBERS; i += 1) assert.notEqual(s.targets[i], s.targets[i - 1]);
    for (let i = 0; i < NUMBERS; i += 1) {
      assert.ok(s.targets[i] >= 1 && s.targets[i] < 2 ** spec.bits);
      assert.notEqual(s.starts[i], s.targets[i]);
      if (!spec.startOn) assert.equal(s.starts[i], 0);
    }
  }
});

test('a bit switched twice costs two extra switches; far past the fewest, the number is made for you', () => {
  let s = createGame(seededRng(3), 2);
  const want = s.targets[0];
  const spare = [0, 1, 2, 3].find((b) => !((want >> b) & 1)) ?? 0;
  s = toggle(toggle(s, spare), spare);
  for (let bit = 0; bit < s.bits; bit += 1) if (((s.value ^ want) >> bit) & 1) s = toggle(s, bit);
  assert.equal(s.made, true);
  assert.equal(s.extra, 2);

  let t = createGame(seededRng(4), 3);
  const need = fewest(t);
  let guard = 0;
  while (!t.made && guard < 100) {
    t = toggle(t, 0);
    guard += 1;
  }
  assert.equal(t.made, true);
  assert.ok(t.taps <= need + MOST_EXTRA + 1);
});

test('ones counts the bits that are on', () => {
  assert.equal(ones(0), 0);
  assert.equal(ones(5), 2);
  assert.equal(ones(255), 8);
});
