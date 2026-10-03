import assert from 'node:assert/strict';
import { test } from 'node:test';

import { TOWERS, createGame, fewest, mostMoves, nextTower, solution, starsForMoves, tapPeg } from '../src/games/hanoi/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];

test('a careful player moves every tower in the fewest moves, for three stars', () => {
  for (const level of LEVELS) {
    let s = createGame(null, level);
    while (!s.complete) {
      const moves = solution(s.discs);
      assert.equal(moves.length, fewest(s.discs));
      for (const [from, to] of moves) {
        s = tapPeg(tapPeg(s, from), to);
        assert.equal(s.slipped, false);
      }
      assert.equal(s.done, true);
      assert.equal(s.moves, fewest(s.discs));
      s = nextTower(s);
    }
    assert.equal(s.totalMoves, fewest(s.discs) * TOWERS);
    assert.equal(s.slips, 0);
    assert.equal(starsForMoves(s), 3);
  }
});

test('a bigger disc never goes on a smaller one: it goes back, and nothing moves', () => {
  let s = createGame(null, 1);
  s = tapPeg(tapPeg(s, 0), 2); // the smallest to the right
  const before = s.pegs;
  s = tapPeg(tapPeg(s, 0), 2); // the middle one onto it
  assert.equal(s.slipped, true);
  assert.equal(s.slips, 1);
  assert.deepEqual(s.pegs, before);
  assert.equal(s.moves, 1);
  assert.equal(s.held, null);
});

test('lifting from an empty peg does nothing, and tapping the same peg puts the disc back', () => {
  let s = createGame(null, 2);
  assert.equal(tapPeg(s, 1).held, null);
  s = tapPeg(s, 0);
  assert.equal(s.held, 0);
  s = tapPeg(s, 0);
  assert.equal(s.held, null);
  assert.equal(s.moves, 0);
});

test('a tower that takes far too many moves finishes itself, so a round always ends', () => {
  let s = createGame(null, 6);
  let n = 0;
  // Back and forth with the smallest disc, for ever.
  while (!s.done && n < 10000) {
    s = tapPeg(tapPeg(s, n % 2 === 0 ? 0 : 1), n % 2 === 0 ? 1 : 0);
    n += 1;
  }
  assert.equal(s.done, true);
  assert.equal(s.moves, mostMoves(s.discs));
  assert.equal(starsForMoves({ totalMoves: s.moves * 2, discs: s.discs, allowance: s.allowance }), 1);
});
