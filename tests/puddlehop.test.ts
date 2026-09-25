import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import {
  HOP_SPEED,
  OBSTACLE_SHAPES,
  RUNNER_SIZE,
  RUNNER_X,
  airtime,
  createGame,
  hop,
  hopReach,
  release,
  runTime,
  specForLevel,
  step,
  type PuddleHopState,
} from '../src/games/puddlehop/logic.ts';
import { starsForMistakes } from '../src/games/types.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];
const FRAME = 1 / 60;
const AIRTIME = airtime(Infinity);

/** Plays a run to the flag at 60fps. `shouldHop` decides, each frame. */
function run(state: PuddleHopState, shouldHop: (s: PuddleHopState) => boolean): PuddleHopState {
  let s = hop(state); // the first tap starts the run
  for (let frame = 0; frame < 60 * 120 && !s.complete; frame += 1) {
    if (shouldHop(s)) s = hop(s);
    s = step(s, FRAME);
  }
  return s;
}

/** A player with perfect timing: holds for the biggest hop, and launches
 *  it so the middle of the hop is over the middle of the next obstacle. Uses only what's on screen — where the
 *  next obstacle is and how fast things are coming. */
function perfect(s: PuddleHopState): boolean {
  const next = s.obstacles.find((o) => o.x + o.width > s.distance + RUNNER_X);
  if (!next || s.height > 0) return false;
  const middle = next.x + next.width / 2 - (RUNNER_X + RUNNER_SIZE / 2);
  return s.distance >= middle - (s.speed * AIRTIME) / 2;
}

test('the run does not start until the child taps', () => {
  const state = createGame(seededRng(1), 3);
  assert.equal(state.started, false);
  assert.deepEqual(step(state, 5), state, 'nothing moves before the first tap');
  const going = hop(state);
  assert.equal(going.started, true);
  assert.equal(going.rise, 0, 'the tap that starts the run is not also a hop');
  assert.ok(step(going, 1).distance > 0);
});

test('every run ends at a flag fixed before it started, well under a minute away', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 30; seed += 1) {
      const state = createGame(seededRng(seed * 11 + level), level);
      const seconds = runTime(state);
      assert.ok(seconds >= 15 && seconds <= 40, `level ${level} runs for ${seconds.toFixed(1)}s`);
      const last = state.obstacles[state.obstacles.length - 1];
      assert.ok(state.finish > last.x + last.width, 'the flag is past the last obstacle');
    }
  }
});

test('speed never creeps up during a run', () => {
  let s = hop(createGame(seededRng(5), 4));
  const speed = s.speed;
  for (let i = 0; i < 600; i += 1) {
    s = step(s, FRAME);
    assert.equal(s.speed, speed);
  }
});

test('running into everything still reaches the flag — there is no game over', () => {
  for (const level of LEVELS) {
    const start = createGame(seededRng(level * 3), level);
    const end = run(start, () => false);
    assert.equal(end.complete, true, `level ${level} never finished`);
    assert.equal(end.bumps, start.obstacles.length, 'each obstacle is a stumble once, never more');
    assert.ok(starsForMistakes(end.bumps) >= 1, 'even a run of stumbles earns a star');
  }
});

test('perfect timing clears every course without a single bump', () => {
  // The important guarantee: whatever the course generator deals, it can
  // be run clean. No obstacle is ever too close to the last to be cleared.
  for (const level of LEVELS) {
    for (let seed = 0; seed < 40; seed += 1) {
      const end = run(createGame(seededRng(seed * 17 + level), level), perfect);
      assert.equal(end.complete, true);
      assert.equal(end.bumps, 0, `level ${level} seed ${seed} could not be run clean`);
    }
  }
});

test('a hop only starts from the ground — no floating, no double hop', () => {
  let s = hop(createGame(seededRng(2), 2));
  s = hop(s);
  assert.equal(s.rise, HOP_SPEED);
  s = step(s, 0.1);
  assert.ok(s.height > 0);
  const midAir = hop(s);
  assert.equal(midAir, s, 'a tap in the air does nothing');
  // And the hop comes back down to the ground.
  for (let i = 0; i < 60; i += 1) s = step(s, FRAME);
  assert.equal(s.height, 0);
  assert.equal(s.rise, 0);
});

test('a long pause between frames never skips the runner past an obstacle', () => {
  // A backgrounded tab can hand over a whole second at once. The step is cut
  // into small slices, and capped, so the stumble still registers.
  const start = hop(createGame(seededRng(8), 1));
  const first = start.obstacles[0];
  let s = start;
  while (s.distance + RUNNER_X + RUNNER_SIZE < first.x - 10) s = step(s, FRAME);
  s = step(s, 3);
  s = step(s, 3);
  assert.equal(s.obstacles[0].hit, true);
  assert.equal(s.bumps, 1);
});

test('every kind a level allows actually turns up in its course', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    for (let seed = 0; seed < 20; seed += 1) {
      const kinds = new Set(createGame(seededRng(seed + level * 50), level).obstacles.map((o) => o.kind));
      for (const kind of spec.kinds) assert.ok(kinds.has(kind), `level ${level} missing ${kind}`);
    }
  }
});

test('obstacles are told apart by shape, never by colour', () => {
  const shapes = Object.values(OBSTACLE_SHAPES).map((s) => `${s.width}x${s.height}`);
  assert.equal(new Set(shapes).size, shapes.length, 'two kinds share a shape');
});

test('every gap leaves room to land and set up the next hop', () => {
  for (const level of LEVELS) {
    const { gapMin } = specForLevel(level);
    assert.ok(gapMin >= 1.4, `level ${level} gaps are tighter than a hop and a breath`);
    const { obstacles, speed } = createGame(seededRng(level), level);
    for (let i = 1; i < obstacles.length; i += 1) {
      const gap = obstacles[i].x - (obstacles[i - 1].x + obstacles[i - 1].width);
      assert.ok(gap >= hopReach(speed) * gapMin - 1);
    }
  }
});

/** How high a hop goes, and how long it stays above `clear`, if the finger
 *  lifts after `held` seconds. */
function measureHop(held: number, clear: number): { top: number; above: number } {
  let s = hop(hop(createGame(seededRng(4), 1)));
  let top = 0;
  let above = 0;
  let t = 0;
  const dt = 1 / 240;
  do {
    if (t >= held) s = release(s);
    s = step(s, dt);
    t += dt;
    top = Math.max(top, s.height);
    if (s.height > clear) above += dt;
  } while (s.height > 0);
  return { top, above };
}

test('the longer the press, the bigger the hop', () => {
  let last = 0;
  for (const held of [0, 0.1, 0.2, 0.3, 0.4, 0.5]) {
    const { top } = measureHop(held, 0);
    assert.ok(top > last, `holding ${held}s hopped no higher than holding less`);
    last = top;
  }
  // Past the top of the climb, holding on changes nothing: no floating.
  assert.ok(Math.abs(measureHop(0.6, 0).top - measureHop(3, 0).top) < 0.5);
});

test('a tap clears a stone; a bush, a puddle or a pair needs a held hop', () => {
  const stone = OBSTACLE_SHAPES.stone;
  const bush = OBSTACLE_SHAPES.bush;
  const tap = measureHop(0, 0);
  assert.ok(tap.top > stone.height, `a tap tops out at ${tap.top.toFixed(0)}, under a stone`);
  assert.ok(tap.top < bush.height, `a tap alone clears a bush (${tap.top.toFixed(0)})`);

  // Clearing means staying above it for as long as it takes to pass over:
  // the obstacle's width plus the runner's, less the forgiving trim.
  const passTime = (width: number, speed: number) => (width + RUNNER_SIZE - 12) / speed;
  const slowest = specForLevel(1).speed;
  assert.ok(measureHop(0, stone.height - 3).above >= passTime(stone.width, slowest), 'a tap is too short for a stone');

  const full = measureHop(Infinity, 0);
  for (const kind of ['bush', 'puddle', 'stones'] as const) {
    const { width, height } = OBSTACLE_SHAPES[kind];
    for (const level of [1, 2, 3, 4, 5, 6]) {
      const { speed } = specForLevel(level);
      assert.ok(
        measureHop(Infinity, height - 3).above >= passTime(width, speed),
        `a full hop cannot clear a ${kind} at level ${level}`,
      );
    }
  }
  assert.ok(full.top > bush.height * 2);
  // And a tap really is too short for the long ones at the speeds they
  // appear, so the held hop is a thing worth learning.
  for (const kind of ['puddle', 'stones'] as const) {
    const { width, height } = OBSTACLE_SHAPES[kind];
    const first = [1, 2, 3, 4, 5, 6].find((l) => specForLevel(l).kinds.includes(kind)) as number;
    assert.ok(
      measureHop(0, height - 3).above < passTime(width, specForLevel(first).speed),
      `a tap is enough for a ${kind}`,
    );
  }
});

test('lifting the finger mid-air never makes the runner float or climb', () => {
  let s = hop(hop(createGame(seededRng(6), 3)));
  for (let i = 0; i < 20; i += 1) s = step(s, FRAME);
  const risingAt = s.rise;
  s = release(s);
  s = step(s, FRAME);
  assert.ok(s.rise < risingAt, 'releasing slowed the fall instead of speeding it');
  assert.equal(s.holding, false);
});
