import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import { starsForMistakes } from '../src/games/types.ts';
import { CHANGES, PAIRS, createGame, pairNow, sameItem, specForLevel, tapPlace } from '../src/games/spotchange/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];

test('a careful looker compares place by place and finds every change first time', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 20; seed += 1) {
      let s = createGame(seededRng(seed * 7 + level), level);
      while (!s.complete) {
        const p = pairNow(s);
        const differ = p.before.flatMap((b, i) => (sameItem(b, p.after[i]) ? [] : [i]));
        s = tapPlace(s, differ[0]);
      }
      assert.equal(s.mistakes, 0);
      assert.equal(starsForMistakes(s.mistakes), 3);
    }
  }
});

test('exactly the changed places differ, and a change is never a colour alone', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    for (let seed = 0; seed < 30; seed += 1) {
      const s = createGame(seededRng(seed + level * 40), level);
      assert.equal(s.pairs.length, PAIRS);
      const kinds = new Set(s.pairs.map((p) => p.change));
      assert.equal(kinds.size, spec.kinds, 'every kind of change the level has comes up');
      for (const p of s.pairs) {
        assert.ok(CHANGES.indexOf(p.change) < spec.kinds);
        assert.equal(p.before.length, spec.rows * spec.cols);
        const differ = p.before.flatMap((b, i) => (sameItem(b, p.after[i]) ? [] : [i]));
        assert.deepEqual([...differ].sort(), [...p.changed].sort());
        for (const i of differ) {
          const [b, a] = [p.before[i], p.after[i]];
          if (b && a) assert.notEqual(b.shape, a.shape, 'a swapped shape is a different shape');
        }
      }
    }
  }
});

test('a wrong place is crossed off once; either end of a move counts', () => {
  let s = createGame(seededRng(5), 4);
  const p = pairNow(s);
  const wrong = p.before.findIndex((_, i) => !p.changed.includes(i));
  s = tapPlace(s, wrong);
  assert.equal(s.mistakes, 1);
  assert.equal(tapPlace(s, wrong), s);
  const moved = createGame(seededRng(5), 4).pairs.find((q) => q.change === 'moved');
  assert.ok(moved && moved.changed.length === 2);
});
