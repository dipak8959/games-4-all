import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import {
  BALL,
  EDGE,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  HOLES_PER_ROUND,
  KINDS,
  MOST_PUTTS,
  createGame,
  holeNow,
  putt,
  puttFromPull,
  speedToRoll,
  specForLevel,
  starsForRound,
  step,
  type MiniGolfState,
} from '../src/games/minigolf/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];
const DT = 1 / 60;

/** Rolls until the ball stops, drops, or play moves to the next hole. */
function roll(state: MiniGolfState): MiniGolfState {
  let s = state;
  const hole = s.index;
  for (let i = 0; i < 60 * 30 && s.phase !== 'aiming' && !s.complete && s.index === hole; i += 1) s = step(s, DT);
  return s;
}

/**
 * A careful player: follows the hole's route, rolling the ball to stop on
 * each point in turn — a touch past the cup, so it drops in slowly. With
 * a sweeper in the way, it waits until the putt would get past it.
 */
function playCarefully(initial: MiniGolfState): MiniGolfState {
  let s = initial;
  for (let guard = 0; guard < 400 && !s.complete; guard += 1) {
    const hole = holeNow(s);
    const index = s.index;
    const done = s.putts[index];
    const target = hole.route[Math.min(done, hole.route.length - 1)];
    const last = target === hole.cup;
    const d = Math.hypot(target.x - s.ball.x, target.y - s.ball.y) + (last ? 5 : 0);
    const angle = Math.atan2(target.y - s.ball.y, target.x - s.ball.x);
    let shot = putt(s, angle, speedToRoll(s, d));
    if (hole.sweeper) {
      // Wait for a moment the putt would drop.
      for (let wait = 0; wait < 600 && roll(shot).index === index && roll(shot).phase !== 'holed'; wait += 1) {
        s = step(s, 0.02);
        shot = putt(s, angle, speedToRoll(s, d));
      }
    }
    s = roll(shot);
    if (s.phase === 'holed') s = roll(s);
  }
  return s;
}

test('a careful player holes every hole in par, at every level', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 25; seed += 1) {
      const start = createGame(seededRng(seed * 17 + level), level);
      const s = playCarefully(start);
      assert.equal(s.complete, true, `level ${level}, seed ${seed}: stuck on hole ${s.index + 1} (${holeNow(s).kind})`);
      s.holes.forEach((h, i) => assert.ok(s.putts[i] <= h.par, `level ${level}, seed ${seed}: ${h.kind} took ${s.putts[i]}, par ${h.par}`));
      assert.equal(starsForRound(s), 3);
    }
  }
});

test('each level brings its hardest kind of hole, twice at least', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    for (let seed = 0; seed < 10; seed += 1) {
      const s = createGame(seededRng(seed), level);
      assert.equal(s.holes.length, HOLES_PER_ROUND);
      assert.ok(s.holes.filter((h) => h.kind === KINDS[spec.hardest]).length >= 2);
      assert.ok(s.holes.every((h) => KINDS.indexOf(h.kind) <= spec.hardest && KINDS.indexOf(h.kind) >= spec.hardest - 2));
    }
  }
});

test('every tee, cup and route point is on the course and clear of walls and water', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 20; seed += 1) {
      for (const h of createGame(seededRng(seed + 50), level).holes) {
        for (const p of [h.tee, h.cup, ...h.route]) {
          assert.ok(p.x > EDGE + BALL && p.x < FIELD_WIDTH - EDGE - BALL && p.y > EDGE + BALL && p.y < FIELD_HEIGHT - EDGE - BALL);
          for (const r of [...h.walls, ...h.water]) {
            const clear = p.x < r.x - BALL || p.x > r.x + r.w + BALL || p.y < r.y - BALL || p.y > r.y + r.h + BALL;
            assert.ok(clear, `${h.kind}: a point in a wall or the water`);
          }
        }
      }
    }
  }
});

test('water puts the ball back where it was hit from, and the putt still counts', () => {
  let s = createGame(seededRng(3), 5);
  while (holeNow(s).kind !== 'water') s = { ...s, index: s.index + 1, putts: [...s.putts, 0], ball: { ...holeNow({ ...s, index: s.index + 1 }).tee, vx: 0, vy: 0 } };
  const pond = holeNow(s).water[0];
  const from = s.ball;
  const angle = Math.atan2(pond.y + pond.h / 2 - from.y, pond.x + pond.w / 2 - from.x);
  s = putt(s, angle, speedToRoll(s, Math.hypot(pond.x + pond.w / 2 - from.x, pond.y + pond.h / 2 - from.y) + 40));
  for (let i = 0; i < 60 * 10 && s.phase !== 'splash'; i += 1) s = step(s, DT);
  assert.equal(s.phase, 'splash');
  s = roll(s);
  assert.equal(s.phase, 'aiming');
  assert.deepEqual([s.ball.x, s.ball.y], [from.x, from.y]);
  assert.equal(s.putts[s.index], 1);
});

test('a hole is picked up after its last putt, so every round ends', () => {
  for (const level of LEVELS) {
    let s = createGame(seededRng(level), level);
    // Tapping the ball a little way, sideways, forever.
    for (let i = 0; i < 2000 && !s.complete; i += 1) {
      s = roll(s.phase === 'aiming' ? putt(s, i % 2 ? 0 : Math.PI, 60) : s);
    }
    assert.equal(s.complete, true);
    assert.ok(s.putts.every((p) => p <= MOST_PUTTS));
    assert.equal(starsForRound(s), 1);
  }
});

test('a fast ball rolls over the cup; a slow one drops', () => {
  const s = createGame(seededRng(9), 1);
  const hole = holeNow(s);
  const angle = Math.atan2(hole.cup.y - s.ball.y, hole.cup.x - s.ball.x);
  const d = Math.hypot(hole.cup.x - s.ball.x, hole.cup.y - s.ball.y);
  let fast = putt(s, angle, speedToRoll(s, d + 400));
  let over = null;
  for (let i = 0; i < 240 * 10 && fast.phase === 'rolling' && !over; i += 1) {
    fast = step(fast, 1 / 240);
    if (Math.hypot(fast.ball.x - hole.cup.x, fast.ball.y - hole.cup.y) < 4) over = fast;
  }
  // Right over the middle of the cup, going too fast: still rolling. (It
  // may drop in later, slowly, off the back wall — as on a real course.)
  assert.ok(over, 'it went over the cup');
  assert.equal(over.phase, 'rolling');
  let slow = putt(s, angle, speedToRoll(s, d + 5));
  for (let i = 0; i < 60 * 10 && slow.phase === 'rolling'; i += 1) slow = step(slow, DT);
  assert.equal(slow.phase, 'holed');
});

test('a pull too small to mean it is no putt; a pull back sends the ball forward', () => {
  const s = createGame(seededRng(1), 1);
  assert.equal(puttFromPull(s, 3, 3), s);
  const hit = puttFromPull(s, 0, 60);
  assert.ok(hit.ball.vy < 0 && Math.abs(hit.ball.vx) < 1e-9, 'pulled down, it goes up');
  assert.equal(hit.putts[0], 1);
});
