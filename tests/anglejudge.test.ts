import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import { starsForMistakes } from '../src/games/types.ts';
import { ANGLES, aimAt, apart, createGame, nextAngle, setAngle, specForLevel } from '../src/games/anglejudge/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];

test('a player who judges every angle within the level\'s room gets three stars', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    const rng = seededRng(level * 3);
    let s = createGame(rng, level);
    while (!s.complete) {
      // Off by as much as the level allows, either way.
      const off = Math.round((rng() * 2 - 1) * spec.tolerance);
      s = setAngle(aimAt(s, s.targets[s.index] + off));
      assert.equal(s.result?.near, true);
      s = nextAngle(s);
    }
    assert.equal(s.misses, 0);
    assert.equal(starsForMistakes(s.misses), 3);
  }
});

test('one degree past the room is a miss, and the round goes on', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    let s = createGame(seededRng(level), level);
    s = setAngle(aimAt(s, s.targets[0] + spec.tolerance + 1));
    assert.equal(s.result?.near, false);
    assert.equal(s.misses, 1);
    s = nextAngle(s);
    assert.equal(s.index, 1);
  }
});

test('angles are in the level\'s steps, never flat, and never the same twice running', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    for (let seed = 0; seed < 20; seed += 1) {
      const s = createGame(seededRng(seed + level * 50), level);
      assert.equal(s.targets.length, ANGLES);
      s.targets.forEach((t, i) => {
        assert.equal(t % spec.step, 0);
        assert.ok(t > 0 && t < spec.most && t !== 180, `${t}`);
        if (i) assert.notEqual(t, s.targets[i - 1]);
      });
      if (!spec.turnedBase) assert.ok(s.bases.every((b) => b === 0));
    }
  }
});

test('apart measures the short way round', () => {
  assert.equal(apart(350, 10), 20);
  assert.equal(apart(90, 45), 45);
  assert.equal(apart(0, 180), 180);
});
