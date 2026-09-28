import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import {
  PUZZLES,
  candidates,
  createGame,
  fewestWeighings,
  movePlace,
  nextPuzzle,
  pick,
  setPlaces,
  specForLevel,
  starsForExtra,
  weigh,
  type BalanceScaleState,
} from '../src/games/balancescale/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];

/** A careful finder: splits the coins still in question three ways, as
 *  evenly as two equal pans allow. */
function solveOne(s: BalanceScaleState): BalanceScaleState {
  for (let guard = 0; guard < 10; guard += 1) {
    const left = candidates(s);
    if (left.length === 1) return pick(s, left[0]);
    let a = Math.ceil(left.length / 3);
    if (a * 2 > left.length) a = Math.floor(left.length / 2);
    s = weigh(setPlaces(s, left.slice(0, a), left.slice(a, a * 2)));
  }
  throw new Error('never narrowed down');
}

test('a careful finder never needs more than the fewest weighings, and gets three stars', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    for (let seed = 0; seed < 30; seed += 1) {
      let s = createGame(seededRng(seed * 5 + level), level);
      assert.equal(s.coins, spec.coins);
      while (!s.complete) {
        s = solveOne(s);
        assert.equal(s.found, true);
        assert.ok(s.history.length <= spec.fewest, `level ${level}: ${s.history.length} weighings`);
        s = nextPuzzle(s);
      }
      assert.equal(s.extra, 0);
      assert.equal(starsForExtra(s.extra), 3);
    }
  }
});

test('the fewest weighings grow with the coins: three per weighing', () => {
  assert.deepEqual([1, 2, 3, 4, 9, 10, 12, 27, 28].map(fewestWeighings), [0, 1, 1, 2, 2, 3, 3, 3, 4]);
});

test('the heavy side goes down; with the heavy coin off, even pans balance', () => {
  let s = createGame(seededRng(1), 4);
  const heavy = s.heavies[0];
  const others = [0, 1, 2, 3, 4, 5].filter((c) => c !== heavy);
  s = weigh(setPlaces(s, [heavy], [others[0]]));
  assert.equal(s.history[0].result, 'left');
  s = weigh(setPlaces(s, [others[1]], [others[2]]));
  assert.equal(s.history[1].result, 'level');
  assert.deepEqual(s.places.filter((p) => p !== 'off'), [], 'the pans empty after weighing');
});

test('tapping a coin moves it off, left, right and off again; a wrong pick rules it out', () => {
  let s = createGame(seededRng(2), 3);
  s = movePlace(s, 0);
  assert.equal(s.places[0], 'left');
  s = movePlace(s, 0);
  assert.equal(s.places[0], 'right');
  s = movePlace(s, 0);
  assert.equal(s.places[0], 'off');
  const wrong = [0, 1, 2].find((c) => c !== s.heavies[0]) as number;
  s = pick(s, wrong);
  assert.deepEqual(s.ruledOut, [wrong]);
  assert.equal(s.extra, 1);
  assert.equal(pick(s, wrong), s);
});

test('picking coins at random still ends every puzzle, and the round', () => {
  const rng = seededRng(9);
  let s = createGame(rng, 6);
  let guard = 0;
  while (!s.complete && guard < 1000) {
    s = s.found ? nextPuzzle(s) : pick(s, Math.floor(rng() * s.coins));
    guard += 1;
  }
  assert.equal(s.complete, true);
  assert.equal(s.index, PUZZLES - 1);
});
