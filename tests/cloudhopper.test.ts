import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import {
  FIELD_WIDTH,
  HOPPER,
  JUMP,
  STEER,
  airtime,
  cloudX,
  createGame,
  reach,
  setSteer,
  specForLevel,
  starsForMisses,
  start,
  step,
  type CloudHopperState,
  type Steer,
} from '../src/games/cloudhopper/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];
const DT = 1 / 60;

/**
 * A careful player: on each bounce it looks at the next cloud up and asks
 * where that cloud will be when the hopper comes down to it. In reach, it
 * steers there; not yet (a drifting cloud on the far side), it bounces on
 * the spot and asks again next time.
 */
function playCarefully(initial: CloudHopperState, limit = 240): CloudHopperState {
  let s = start(initial);
  let aim: number | null = null;
  let seen = -1;
  for (let t = 0; t < limit && !s.complete; t += DT) {
    if (s.bounces !== seen || aim === null) {
      seen = s.bounces;
      const here = s.clouds[s.best];
      const target = s.clouds[Math.min(s.best + 1, s.sun)];
      const up = target.y - s.hopper.y;
      const land = airtime(up);
      const there = cloudX(target, s.time + land);
      aim =
        Number.isFinite(land) && Math.abs(there - s.hopper.x) <= STEER * land - 6
          ? there
          : cloudX(here, s.time + airtime(0));
    }
    const off = aim - s.hopper.x;
    const steer: Steer = Math.abs(off) <= 2 ? 0 : off > 0 ? 1 : -1;
    s = setSteer(s, steer);
    s = step(s, DT);
  }
  return s;
}

test('a careful player reaches the sun with no misses, at every level', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 30; seed += 1) {
      const s = playCarefully(createGame(seededRng(seed * 13 + level), level));
      assert.equal(s.complete, true, `level ${level}, seed ${seed}: got to cloud ${s.best} of ${s.sun}`);
      assert.equal(s.misses, 0, `level ${level}, seed ${seed}: ${s.misses} misses`);
      assert.equal(starsForMisses(s.misses), 3);
    }
  }
});

test('every still cloud can be reached from the one below it in one bounce', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 40; seed += 1) {
      const s = createGame(seededRng(seed + 100 * level), level);
      for (let i = 1; i < s.clouds.length; i += 1) {
        const [a, b] = [s.clouds[i - 1], s.clouds[i]];
        const up = b.y - a.y;
        assert.ok(up > 0 && up < JUMP, `level ${level}: cloud ${i} is ${up} up, a bounce goes ${JUMP}`);
        if (!a.drift && !b.drift) assert.ok(Math.abs(b.x - a.x) < reach(up), `level ${level}: cloud ${i} is out of reach`);
        assert.ok(!(a.puff && b.drift), 'a drifting cloud above a puff cannot be waited for');
        for (const c of [a, b]) {
          assert.ok(c.x - c.drift - c.width / 2 >= 0 && c.x + c.drift + c.width / 2 <= FIELD_WIDTH, 'a cloud off the side');
        }
      }
    }
  }
});

test('the round ends at the sun, fixed before the first bounce', () => {
  const s = createGame(seededRng(1), 3);
  assert.equal(s.sun, s.clouds.length - 1);
  assert.equal(s.clouds.length, specForLevel(3).clouds + 1);
  const done = playCarefully(s);
  assert.equal(done.best, done.sun);
  assert.equal(step(done, 1), done, 'nothing moves once it is over');
});

test('a miss floats back to the highest cloud reached, and every puff cloud comes back', () => {
  let s = start(createGame(seededRng(7), 6));
  // Climb a few clouds carefully, then steer hard into the wall and fall.
  s = playCarefully(s, 6);
  const best = s.best;
  assert.ok(best > 0);
  s = setSteer(s, s.hopper.x > FIELD_WIDTH / 2 ? -1 : 1);
  const before = s.misses;
  // In the logic's own small ticks, so the check lands on the moment of the miss.
  for (let i = 0; i < 240 * 8 && s.misses === before; i += 1) s = step(s, 1 / 240);
  assert.equal(s.misses, before + 1);
  assert.ok(s.best >= best);
  assert.equal(s.hopper.y, s.clouds[s.best].y, 'back on the highest cloud');
  assert.deepEqual(s.gone, []);
  assert.ok(s.whoops > 0);
  assert.equal(s.complete, false, 'a miss never ends the round');
});

test('nothing happens until the first press, and doing nothing never misses', () => {
  let s = createGame(seededRng(3), 1);
  assert.equal(step(s, 1), s);
  s = start(s);
  for (let i = 0; i < 60 * 30; i += 1) s = step(s, DT);
  // A wide cloud straight overhead can still catch it: that's fine.
  assert.equal(s.misses, 0);
});

test('the hopper never leaves the sky sideways', () => {
  let s = start(createGame(seededRng(5), 4));
  for (let i = 0; i < 60 * 20; i += 1) {
    if (i % 90 === 0) s = setSteer(s, ((i / 90) % 3) - 1 as Steer);
    s = step(s, DT);
    assert.ok(s.hopper.x >= HOPPER && s.hopper.x <= FIELD_WIDTH - HOPPER);
  }
});

test('stars: none missed, three; a couple, two; more, one', () => {
  assert.equal(starsForMisses(0), 3);
  assert.equal(starsForMisses(1), 2);
  assert.equal(starsForMisses(2), 2);
  assert.equal(starsForMisses(3), 1);
});
