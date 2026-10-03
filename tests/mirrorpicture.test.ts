import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import { starsForMistakes } from '../src/games/types.ts';
import { PICTURES, createGame, mirrored, nextPicture, specForLevel, tapSquare } from '../src/games/mirrorpicture/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];

test('a child who reflects each square fills every picture with no slips', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 15; seed += 1) {
      let s = createGame(seededRng(seed * 9 + level), level);
      while (!s.complete) {
        const want = mirrored(s, s.givens[s.index]);
        want.forEach((on, i) => {
          if (on) s = tapSquare(s, i);
        });
        assert.equal(s.done, true);
        s = nextPicture(s);
      }
      assert.equal(s.slips, 0);
      assert.equal(starsForMistakes(s.slips), 3);
    }
  }
});

test('reflection: a square next to the line stays next to it on the other side', () => {
  // Two across, two down, the line down the middle: the left column mirrors
  // to the right one.
  const flat = { across: false, rows: 2, cols: 2 };
  assert.deepEqual(mirrored(flat, [true, false, false, true]), [false, true, true, false]);
  // The line across: the top row mirrors to the bottom.
  const across = { across: true, rows: 2, cols: 2 };
  assert.deepEqual(mirrored(across, [true, false, false, false]), [false, false, true, false]);
});

test('every picture has something to mirror, but not everything, and no two alike', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    const s = createGame(seededRng(level), level);
    assert.equal(s.givens.length, PICTURES);
    for (const g of s.givens) {
      assert.equal(g.length, spec.cells);
      const on = g.filter(Boolean).length;
      assert.ok(on >= 1 && on < spec.cells);
    }
    assert.equal(new Set(s.givens.map((g) => g.map(Number).join(''))).size, PICTURES);
  }
});

test('a square filled by mistake is one slip, and taps off again', () => {
  let s = createGame(seededRng(2), 3);
  const want = mirrored(s, s.givens[0]);
  const wrong = want.findIndex((on) => !on);
  s = tapSquare(s, wrong);
  assert.equal(s.slips, 1);
  s = tapSquare(s, wrong);
  assert.equal(s.slips, 1);
  assert.equal(s.filled[wrong], false);
});
