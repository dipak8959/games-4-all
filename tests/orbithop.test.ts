import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import { RINGS, ROCK, SATELLITE, SPEED, STARS, createGame, gap, hop, starsForBumps, step, type OrbitHopState } from '../src/games/orbithop/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];
const DT = 1 / 30;

/** How long until a rock would reach the satellite on a ring (up to 2s). */
function untilDanger(s: OrbitHopState, ring: number): number {
  for (let t = 0; t <= 2; t += 1 / 60) {
    const a = s.angle + SPEED * t;
    if (s.rocks.some((r) => r.ring === ring && gap(ring, a, ring, r.angle - s.rockSpeed * t) < SATELLITE + ROCK + 4)) return t;
  }
  return 2;
}

/** A careful pilot: stays put until a rock is close, then hops to whichever
 *  ring stays clear longest; heads for the star's ring when it's clear. */
function pilot(s: OrbitHopState): OrbitHopState {
  const time = [0, 1, 2].map((r) => untilDanger(s, r));
  let want = s.ring;
  if (time[s.ring] < 0.3) {
    want = [0, 1, 2].sort((a, b) => time[b] - time[a] || Math.abs(a - s.ring) - Math.abs(b - s.ring))[0];
  } else if (s.star.ring !== s.ring && time[s.star.ring] > 0.6) {
    want = s.star.ring;
  }
  while (s.ring !== want) s = hop(s, want > s.ring ? 1 : -1);
  return s;
}

test('a careful pilot collects every star without a bump, at every level', () => {
  for (const level of LEVELS) {
    let slowest = 0;
    for (let seed = 0; seed < 25; seed += 1) {
      const rng = seededRng(seed * 19 + level);
      let s = createGame(rng, level);
      let t = 0;
      for (; t < 300 && !s.complete; t += DT) s = step(pilot(s), DT, rng);
      assert.equal(s.complete, true, `level ${level}, seed ${seed}: ${s.collected} stars`);
      assert.equal(s.bumps, 0, `level ${level}, seed ${seed}: ${s.bumps} bumps`);
      slowest = Math.max(slowest, t);
    }
    assert.ok(slowest < 150, `level ${level}: ${slowest.toFixed(0)}s`);
  }
});

test('never hopping at all still ends the round: stars come to the satellite in the end', () => {
  for (const level of LEVELS) {
    const rng = seededRng(level * 7);
    let s = createGame(rng, level);
    for (let t = 0; t < 600 && !s.complete; t += DT) s = step(s, DT, rng);
    assert.equal(s.complete, true, `level ${level}: ${s.collected}`);
    assert.equal(s.collected, STARS);
  }
});

test('a bump raises the shield for a moment, so one rock is one bump', () => {
  const rng = seededRng(3);
  let s = createGame(rng, 1);
  // Put a rock right on the satellite.
  s = { ...s, rocks: [{ ring: s.ring, angle: s.angle + 0.05 }] };
  s = step(s, DT, rng);
  assert.equal(s.bumps, 1);
  for (let i = 0; i < 10; i += 1) s = step(s, DT, rng);
  assert.equal(s.bumps, 1);
  assert.equal(starsForBumps(1), 2);
});

test('hops stop at the innermost and outermost rings', () => {
  let s = createGame(seededRng(1), 1);
  s = hop(hop(hop(s, 1), 1), 1);
  assert.equal(s.ring, RINGS.length - 1);
  s = hop(hop(hop(hop(s, -1), -1), -1), -1);
  assert.equal(s.ring, 0);
});
