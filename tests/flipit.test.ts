import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import { BOARDS, createGame, mostTaps, nextBoard, press, solve, specForLevel, starsForTaps, tapTile } from '../src/games/flipit/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];

test('every board takes exactly the level\'s taps at best, and none is lit to begin with', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    for (let seed = 0; seed < 15; seed += 1) {
      const s = createGame(seededRng(seed * 3 + level), level);
      assert.equal(s.boards.length, BOARDS);
      for (let i = 0; i < BOARDS; i += 1) {
        assert.equal(s.pars[i], spec.moves, `level ${level}, board ${i}`);
        assert.ok(!s.boards[i].every(Boolean));
        assert.equal(solve(s.boards[i], spec.size).length, spec.moves);
      }
    }
  }
});

test('a careful player lights every board in its fewest taps, for three stars', () => {
  for (const level of LEVELS) {
    let s = createGame(seededRng(level * 11), level);
    while (!s.complete) {
      for (const cell of solve(s.lit, s.size)) s = tapTile(s, cell);
      assert.equal(s.done, true);
      s = nextBoard(s);
    }
    assert.equal(s.totalTaps, s.totalPar);
    assert.equal(starsForTaps(s.totalTaps, s.totalPar), 3);
  }
});

test('a tap flips the tile and the ones beside it, and tapping twice undoes it', () => {
  const lit = Array.from({ length: 9 }, () => true);
  const once = press(lit, 3, 4);
  assert.deepEqual(once, [true, false, true, false, false, false, true, false, true]);
  assert.deepEqual(press(once, 3, 4), lit);
  assert.deepEqual(press(lit, 3, 0), [false, false, true, false, true, true, true, true, true]);
});

test('a board that takes far too many taps lights itself, so a round always ends', () => {
  let s = createGame(seededRng(2), 6);
  const limit = mostTaps(s.pars[0]);
  // Tapping one corner over and over never lights the board by itself.
  let taps = 0;
  while (!s.done && taps < limit + 5) {
    s = tapTile(s, 0);
    taps += 1;
  }
  assert.equal(s.done, true);
  assert.ok(taps <= limit);
  assert.ok(s.lit.every(Boolean));
});
