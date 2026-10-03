import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng, type Rng } from '../src/util/random.ts';
import {
  CATCHES,
  KINDS,
  cast,
  createGame,
  specForLevel,
  starsForSlips,
  step,
  wouldCatch,
  type DeepSeaState,
} from '../src/games/deepsea/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];
const DT = 1 / 60;

/** Casts whenever `when` says so, until the round is over or time's up. */
function fish(initial: DeepSeaState, rng: Rng, when: (s: DeepSeaState) => boolean, limit = 600): DeepSeaState {
  let s = initial;
  for (let t = 0; t < limit && !s.complete; t += DT) {
    if (!s.hook.going && when(s)) s = cast(s);
    s = step(s, DT, rng);
  }
  return s;
}

test('a careful fisher, casting only when the line would meet the wanted fish, never brings up a wrong one', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 30; seed += 1) {
      const rng = seededRng(seed * 29 + level);
      const s = fish(createGame(rng, level), rng, (x) => wouldCatch(x) === x.wanted, 300);
      assert.equal(s.complete, true, `level ${level}, seed ${seed}: ${s.catches} caught`);
      assert.equal(s.catches, CATCHES);
      assert.equal(s.slips, 0);
      assert.equal(starsForSlips(s.slips), 3);
    }
  }
});

test('the wanted fish is always swimming somewhere, and the sea never runs short', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    const rng = seededRng(level * 5);
    let s = createGame(rng, level);
    for (let t = 0; t < 120 && !s.complete; t += DT) {
      const inSea = s.fish.length + (s.hook.carrying ? 1 : 0);
      assert.equal(inSea, spec.lanes * spec.perLane);
      if (!s.hook.carrying) assert.ok(s.fish.some((f) => f.kind === s.wanted), 'nothing of the wanted kind');
      assert.ok(s.wanted < spec.kinds);
      if (!s.hook.going && rng() < 0.05) s = cast(s);
      s = step(s, DT, rng);
    }
  }
});

test('casting at random still gets there, and the wrong fish go back', () => {
  for (const level of LEVELS) {
    const rng = seededRng(level * 11);
    const s = fish(createGame(rng, level), rng, () => rng() < 0.08, 1200);
    assert.equal(s.complete, true, `level ${level}: ${s.catches} caught`);
    assert.ok(starsForSlips(s.slips) >= 1);
  }
});

test('a wrong fish is let go, one slip, and the line comes up empty-handed', () => {
  const rng = seededRng(3);
  let s = createGame(rng, 6);
  for (let t = 0; t < 60 && !(wouldCatch(s) !== null && wouldCatch(s) !== s.wanted); t += DT) s = step(s, DT, rng);
  const before = s.fish.length;
  s = cast(s);
  for (let i = 0; i < 60 * 5 && s.hook.going; i += 1) s = step(s, DT, rng);
  assert.equal(s.slips, 1);
  assert.equal(s.catches, 0);
  assert.equal(s.said, 'back');
  assert.equal(s.fish.length, before);
});

test('the line can only be down once at a time', () => {
  const s = cast(createGame(seededRng(1), 1));
  assert.equal(cast(s), s);
});

test('each new kind differs from every one before it by pattern or tail', () => {
  for (let i = 0; i < KINDS.length; i += 1) {
    for (let j = 0; j < i; j += 1) {
      assert.ok(KINDS[i].pattern !== KINDS[j].pattern || KINDS[i].tail !== KINDS[j].tail);
    }
  }
  // The first two differ in both, for the youngest.
  assert.ok(KINDS[0].pattern !== KINDS[1].pattern && KINDS[0].tail !== KINDS[1].tail);
});
