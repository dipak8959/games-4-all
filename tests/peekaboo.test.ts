import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import {
  PALS_PER_ROUND,
  createGame,
  missed,
  roundLength,
  specForLevel,
  start,
  starsForPals,
  step,
  tapHole,
  upIn,
  woken,
  type PeekabooState,
} from '../src/games/peekaboo/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];

test('twenty pals a round, never two in one hole at once, never more up than the level allows', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    for (let seed = 0; seed < 60; seed += 1) {
      const s = createGame(seededRng(seed * 5 + level), level);
      assert.equal(s.pops.length, PALS_PER_ROUND);
      for (let t = 0; t < roundLength(s); t += 0.05) {
        const up = s.pops.filter((p) => t >= p.at && t < p.at + p.up);
        assert.ok(up.length <= spec.together, `level ${level}: ${up.length} up at ${t.toFixed(2)}s`);
        assert.equal(new Set(up.map((p) => p.hole)).size, up.length, 'two pals in one hole');
      }
      assert.ok(s.pops.every((p) => p.hole >= 0 && p.hole < spec.cols * spec.rows));
    }
  }
});

test('sleepy pals only from level 3, and the first two pals are always awake', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    const s = createGame(seededRng(level), level);
    assert.equal(s.pops.filter((p) => p.kind === 'sleepy').length, Math.round(PALS_PER_ROUND * spec.sleepy));
    assert.ok(s.pops.slice(0, 2).every((p) => p.kind === 'awake'));
  }
});

/** Plays at 60fps; `react` decides, each frame, which holes to tap. */
function play(state: PeekabooState, react: (s: PeekabooState) => number[]): PeekabooState {
  let s = start(state);
  for (let f = 0; f < 60 * 120 && !s.complete; f += 1) {
    for (const hole of react(s)) s = tapHole(s, hole);
    s = step(s, 1 / 60);
  }
  return s;
}

const holes = (s: PeekabooState) => Array.from({ length: s.cols * s.rows }, (_, h) => h);

test('saying hello to every awake pal and leaving the sleepy ones is three stars', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 20; seed += 1) {
      const s = play(createGame(seededRng(seed + 70 * level), level), (now) =>
        holes(now).filter((h) => {
          const i = upIn(now, h);
          return i >= 0 && now.pops[i].kind === 'awake';
        }),
      );
      assert.equal(s.complete, true);
      assert.equal(missed(s), 0);
      assert.equal(woken(s), 0);
      assert.equal(starsForPals(s), 3);
    }
  }
});

test('tapping everything wakes the sleepy pals, and that costs stars from level 3', () => {
  const s = play(createGame(seededRng(3), 6), (now) => holes(now));
  assert.equal(missed(s), 0);
  assert.ok(woken(s) >= 5);
  assert.equal(starsForPals(s), 1);
});

test('the round ends when the last pal has ducked, whatever the player does', () => {
  const s = play(createGame(seededRng(4), 2), () => []);
  assert.equal(s.complete, true);
  assert.equal(missed(s), PALS_PER_ROUND);
  assert.equal(starsForPals(s), 1, 'never none');
});

test('an empty hole does nothing, and a pal is never counted twice', () => {
  let s = start(createGame(seededRng(5), 3));
  assert.equal(tapHole(s, 0), s, 'nothing is up yet');
  while (s.elapsed < s.pops[0].at + 0.1) s = step(s, 0.05);
  const hole = s.pops[0].hole;
  const once = tapHole(s, hole);
  assert.deepEqual(once.tapped, [0]);
  assert.equal(tapHole(once, hole), once, 'a pal said hello to has ducked');
});

test('nothing peeks out before the first tap', () => {
  const s = createGame(seededRng(6), 1);
  assert.deepEqual(step(s, 5), s);
});
