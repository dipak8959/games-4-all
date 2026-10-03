import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import {
  GRAVITY,
  GROUND_Y,
  LIFT,
  PLANE_HALF_HEIGHT,
  SKY_TOP,
  STACK_WIDTH,
  PLANE_HALF_LENGTH,
  between,
  createGame,
  gapCentre,
  passed,
  setHolding,
  specForLevel,
  starsForBumps,
  step,
  type PaperPlaneState,
} from '../src/games/paperplane/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];
const DT = 1 / 60;

/**
 * A careful pilot: it looks at the next gap, works out where its middle
 * will be when the plane gets there, and steers for that line the way a
 * person learns to — letting go early enough that the climb tops out on it,
 * and holding early enough that a sink bottoms out on it.
 */
function flyCarefully(initial: PaperPlaneState, pilot = (s: PaperPlaneState) => aim(s)): PaperPlaneState {
  let s = setHolding(initial, true);
  for (let i = 0; i < 60 * 120 && !s.complete; i += 1) {
    s = setHolding(s, pilot(s));
    s = step(s, DT);
  }
  return s;
}

function aim(s: PaperPlaneState): boolean {
  const next = s.stacks.find((k) => k.x + STACK_WIDTH / 2 + PLANE_HALF_LENGTH > s.flown);
  if (!next) return s.vy > 60;
  const arrive = Math.max(0, (next.x - s.flown) / s.speed);
  const target = gapCentre(next, s.time + Math.min(arrive, 0.3));
  // Where it would stop: climbing, the top of the glide if it let go now;
  // sinking, the bottom of the climb if it held now.
  if (s.vy < 0) return s.y - (s.vy * s.vy) / (2 * GRAVITY) > target;
  return s.y + (s.vy * s.vy) / (2 * (LIFT - GRAVITY)) > target - 2;
}

test('a careful pilot flies every course without a bump, at every level', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 30; seed += 1) {
      const s = flyCarefully(createGame(seededRng(seed * 11 + level), level));
      assert.equal(s.complete, true);
      assert.equal(s.bumps, 0, `level ${level}, seed ${seed}: ${s.bumps} bumps`);
      assert.equal(passed(s), specForLevel(level).stacks);
      assert.equal(starsForBumps(s.bumps), 3);
    }
  }
});

test('every gap is clear of the top of the sky and the grass, and within a swing of the last', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    for (let seed = 0; seed < 40; seed += 1) {
      const s = createGame(seededRng(seed + 7 * level), level);
      s.stacks.forEach((k, i) => {
        assert.ok(k.centre - s.gap / 2 - k.bob > SKY_TOP, 'a gap into the top of the sky');
        assert.ok(k.centre + s.gap / 2 + k.bob < GROUND_Y, 'a gap into the grass');
        if (i > 0) {
          // Never further than the plane can sink or climb in the time between.
          const move = k.centre - s.stacks[i - 1].centre;
          const room = between(spec);
          assert.ok(move <= spec.swing * room.sink + 1e-9 && -move <= spec.swing * room.climb + 1e-9);
        }
      });
    }
  }
});

test('never touching it, or holding it all the way, still reaches the field', () => {
  for (const level of LEVELS) {
    for (const hold of [false, true]) {
      const s = flyCarefully(createGame(seededRng(level), level), () => hold);
      assert.equal(s.complete, true);
      assert.ok(s.bumps <= s.stacks.length, 'a stack bumped twice');
      assert.ok(s.y >= SKY_TOP + PLANE_HALF_HEIGHT - 1e-9 && s.y <= GROUND_Y - PLANE_HALF_HEIGHT + 1e-9);
    }
  }
});

test('a bump pops the plane into the gap and carries it through, never twice on one stack', () => {
  for (let seed = 0; seed < 20; seed += 1) {
    const rng = seededRng(seed);
    const s = flyCarefully(createGame(seededRng(seed), 6), () => rng() < 0.5);
    assert.equal(s.complete, true);
    assert.ok(s.bumps <= s.stacks.length);
  }
});

test('nothing moves until the first press', () => {
  const s = createGame(seededRng(2), 3);
  assert.equal(step(s, 1), s);
  assert.equal(setHolding(s, false), s);
});

test('stars: no bumps, three; a couple, two; more, one', () => {
  assert.deepEqual([0, 1, 2, 3, 9].map(starsForBumps), [3, 2, 2, 1, 1]);
});
