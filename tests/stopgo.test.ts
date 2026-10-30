import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import { BACK, CROSSINGS, createGame, hold, specForLevel, starsForOops, step, type StopGoState } from '../src/games/stopgo/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];
const DT = 1 / 30;

test('a child who walks only on go, and lets go the moment it changes, crosses five times with no step back', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 10; seed += 1) {
      const rng = seededRng(seed * 5 + level);
      let s = createGame(rng, level);
      let t = 0;
      for (; t < 200 && !s.complete; t += DT) {
        // Reacts a fifth of a second late to the change, as a quick child might.
        s = hold(s, s.light === 'go' || (s.light === 'stop' && s.stopFor < Math.min(0.2, specForLevel(level).grace - 0.02)));
        s = step(s, DT, rng);
      }
      assert.equal(s.complete, true, `level ${level}, seed ${seed}`);
      assert.equal(s.oops, 0, `level ${level}, seed ${seed}: ${s.oops} steps back`);
      assert.equal(starsForOops(s.oops), 3);
      assert.ok(t < 120, `level ${level}: ${t.toFixed(0)}s`);
    }
  }
});

test('holding WALK the whole time takes steps back, but still gets across', () => {
  for (const level of LEVELS) {
    const rng = seededRng(level);
    let s = createGame(rng, level);
    for (let t = 0; t < 400 && !s.complete; t += DT) {
      // Presses again straight after every step back.
      s = hold(s, false);
      s = hold(s, true);
      s = step(s, DT, rng);
    }
    assert.equal(s.complete, true);
    assert.ok(s.oops > 0);
    assert.equal(s.crossings, CROSSINGS);
  }
});

test('a step back stops the walker until the next go, so a stop costs one step at most', () => {
  const rng = seededRng(3);
  let s: StopGoState = { ...createGame(rng, 6), light: 'stop', left: 2, stopFor: 1, x: 0.5 };
  s = hold(s, true);
  s = step(s, DT, rng);
  assert.equal(s.oops, 1);
  assert.ok(Math.abs(s.x - (0.5 - BACK)) < 1e-9);
  for (let i = 0; i < 20; i += 1) s = step(hold(s, true), DT, rng);
  assert.equal(s.oops, 1, 'pressing again in the same stop does nothing');
  assert.equal(s.walking, false);
  while (s.light === 'stop') s = step(s, DT, rng);
  s = hold(s, true);
  assert.equal(s.walking, true);
});

test('the warning and the grace shrink as the levels go up', () => {
  for (let l = 2; l <= 6; l += 1) {
    assert.ok(specForLevel(l).warning <= specForLevel(l - 1).warning);
    assert.ok(specForLevel(l).grace < specForLevel(l - 1).grace);
  }
});
