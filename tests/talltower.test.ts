import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import {
  BLOCKS_PER_ROUND,
  FALL_TIME,
  FIELD_WIDTH,
  createGame,
  drop,
  specForLevel,
  speedNow,
  start,
  starsForTower,
  step,
  top,
  type TallTowerState,
} from '../src/games/talltower/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];
const FRAME = 1 / 60;

/** Plays a round at 60fps, dropping whenever `when` says so. */
function play(state: TallTowerState, when: (s: TallTowerState) => boolean): TallTowerState {
  let s = start(state);
  for (let f = 0; f < 60 * 600 && !s.complete; f += 1) {
    s = step(s, FRAME);
    if (when(s)) s = drop(s);
  }
  return s;
}

test('nothing slides before the first tap, and the first tap does not drop', () => {
  const s = createGame(1);
  assert.deepEqual(step(s, 2), s);
  const started = start(s);
  assert.equal(drop(s), s, 'a tap before starting drops nothing');
  assert.equal(started.drops, 0);
});

test('a player who drops at the right moment builds all twelve square, at every level', () => {
  for (const level of LEVELS) {
    // Drops the frame the block is nearest square: a patient, careful eye.
    const s = play(createGame(level), (now) => Math.abs(now.slider.x - top(now).x) <= speedNow(now) * FRAME * 0.6);
    assert.equal(s.complete, true);
    assert.equal(s.drops, BLOCKS_PER_ROUND);
    assert.equal(s.misses, 0);
    assert.equal(s.square, BLOCKS_PER_ROUND, `level ${level}`);
    assert.equal(top(s).w, specForLevel(level).width);
    assert.equal(starsForTower(s), 3);
  }
});

test('a player a little off every time still gets three stars low down, but not at the top', () => {
  // Pressing 40ms late every time: forgiven at level 1, trimmed at level 6.
  const late = (level: number) => {
    let s = start(createGame(level));
    let armed = -1;
    for (let f = 0; f < 60 * 600 && !s.complete; f += 1) {
      s = step(s, FRAME / 4);
      if (armed < 0 && Math.abs(s.slider.x - top(s).x) <= speedNow(s) * FRAME * 0.15) armed = 0.04;
      if (armed >= 0) {
        armed -= FRAME / 4;
        if (armed < 0) s = drop(s);
      }
    }
    return s;
  };
  assert.equal(starsForTower(late(1)), 3);
  assert.equal(late(1).square, BLOCKS_PER_ROUND, 'at level 1, 40ms late is still square');
  assert.ok(late(6).square < BLOCKS_PER_ROUND, 'at level 6, 40ms late gets trimmed');
});

test('a trim keeps exactly the overlap, and the overhang falls away', () => {
  let s = start(createGame(3));
  const below = top(s);
  s = { ...s, slider: { x: below.x + 30, w: below.w } };
  const after = drop(s);
  assert.equal(top(after).x, below.x + 30);
  assert.equal(top(after).w, below.w - 30);
  assert.equal(after.falling.length, 1);
  assert.equal(after.falling[0].w, 30);
  assert.equal(after.falling[0].x, below.x + below.w);
  assert.equal(after.slider.w, below.w - 30, 'the next block is the width the tower now is');
  let later = after;
  for (let t = 0; t < FALL_TIME + 0.1; t += 0.05) later = step(later, 0.05);
  assert.equal(later.falling.length, 0, 'fallen pieces are gone once they have fallen');
});

test('a block that misses altogether falls, and the next comes at the tower\'s width', () => {
  // A tower already trimmed narrow, and the block nowhere near it.
  let s = start(createGame(2));
  s = { ...s, tower: [...s.tower, { x: 145, w: 30 }], slider: { x: 0, w: 30 } };
  const after = drop(s);
  assert.equal(after.misses, 1);
  assert.equal(after.tower.length, 2, 'nothing added to the tower');
  assert.equal(after.falling.length, 1);
  assert.equal(after.slider.w, 30);
});

test('twelve drops end the round, whatever they were', () => {
  const rng = seededRng(7);
  for (const level of LEVELS) {
    const s = play(createGame(level), () => rng() < 0.02);
    assert.equal(s.complete, true);
    assert.equal(s.drops, BLOCKS_PER_ROUND);
    assert.ok(starsForTower(s) >= 1);
    assert.ok(s.tower.every((b) => b.w >= 12 && b.x >= 0 && b.x + b.w <= FIELD_WIDTH + 1e-9));
  }
});

test('the slider stays on the field, and speeds up as the tower rises from level 4', () => {
  let s = start(createGame(6));
  for (let f = 0; f < 600; f += 1) {
    s = step(s, 0.1);
    assert.ok(s.slider.x >= 0 && s.slider.x + s.slider.w <= FIELD_WIDTH + 1e-9);
  }
  const first = speedNow(s);
  s = drop(s);
  assert.ok(speedNow(s) > first);
  const low = start(createGame(2));
  assert.equal(speedNow(drop(low)), speedNow(low));
});
