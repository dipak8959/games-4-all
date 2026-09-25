import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import {
  BASE_Y,
  COLUMN,
  DESCENTS_PER_ROUND,
  FIELD_WIDTH,
  HALF_WIDTH,
  PAD_Y,
  REST,
  START_Y,
  createGame,
  descentNow,
  groundUnder,
  onPad,
  setEngine,
  specForLevel,
  starsForLandings,
  step,
  type Engines,
  type SoftLandingState,
} from '../src/games/softlanding/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];
const FRAME = 1 / 60;

function press(s: SoftLandingState, want: Engines): SoftLandingState {
  let next = s;
  for (const engine of ['up', 'left', 'right'] as const) {
    if (next.engines[engine] !== want[engine]) next = setEngine(next, engine, want[engine]);
  }
  return next;
}

/** A careful pilot: over the pad first, high enough to clear the hills,
 *  then down, braking to well under the safe speed near the ground. */
function pilot(s: SoftLandingState): Engines {
  const d = descentNow(s);
  const r = s.rocket;
  const gap = d.padX - r.x;
  // Sideways: head for the pad, slowing as it gets close.
  const wantVx = Math.max(-40, Math.min(40, gap * 0.8));
  const over = Math.abs(gap) < s.padW / 2 - HALF_WIDTH - 2;
  const left = s.sideways && r.vx > wantVx + 4;
  const right = s.sideways && r.vx < wantVx - 4;
  // Down: as fast as it can still stop from, but never lower than the
  // hills between here and the pad until it's over the pad.
  let highest = PAD_Y;
  const [a, b] = [Math.min(r.x, d.padX), Math.max(r.x, d.padX)];
  for (let x = a; x <= b; x += COLUMN / 2) highest = Math.min(highest, groundUnder(d, x));
  const floor = over ? groundUnder(d, r.x) : highest - 40;
  const height = Math.max(0, floor - r.y);
  const brake = s.gravity * 1.2;
  const wantVy = Math.min(s.safeV * 0.6 + Math.sqrt(2 * brake * height) * 0.7, 140);
  const up = r.vy > (over ? wantVy : Math.min(wantVy, height < 10 ? -10 : wantVy));
  return { up, left, right };
}

function fly(s: SoftLandingState, driver: (s: SoftLandingState) => Engines): SoftLandingState {
  let next = s;
  let frames = 0;
  while (!next.complete) {
    if (next.phase === 'waiting') next = setEngine(next, 'up', true);
    else if (next.phase === 'flying') next = press(next, driver(next));
    next = step(next, FRAME);
    frames += 1;
    assert.ok(frames < 60 * 60 * 5, 'a round that never ended');
  }
  return next;
}

test('three descents a round; the pad sits on flat ground, inside the field', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    for (let seed = 0; seed < 50; seed += 1) {
      const s = createGame(seededRng(seed * 11 + level), level);
      assert.equal(s.descents.length, DESCENTS_PER_ROUND);
      for (const d of s.descents) {
        assert.ok(d.padX - spec.padW / 2 >= 0 && d.padX + spec.padW / 2 <= FIELD_WIDTH);
        for (let x = d.padX - spec.padW / 2 + HALF_WIDTH; x <= d.padX + spec.padW / 2 - HALF_WIDTH; x += 2) {
          assert.equal(groundUnder(d, x), PAD_Y, 'a bump on the pad');
        }
        assert.ok(d.ground.every((g) => g === PAD_Y || (g <= BASE_Y && g >= BASE_Y - spec.hills - 1)));
        assert.ok(Math.abs(d.startX - d.padX) >= spec.offset * 0.99 || spec.offset === 0);
        if (!spec.offset) assert.equal(d.startX, d.padX);
        assert.equal(Math.abs(d.wind), spec.wind);
      }
    }
  }
});

test('side engines only from level 3, and hills from level 4', () => {
  assert.deepEqual(LEVELS.map((l) => createGame(seededRng(1), l).sideways), [false, false, true, true, true, true]);
  assert.deepEqual(LEVELS.map((l) => specForLevel(l).hills > 0), [false, false, false, true, true, true]);
  const s = createGame(seededRng(2), 1);
  assert.equal(setEngine(s, 'left', true), s, 'no side engines at level 1');
});

test('a careful pilot lands softly every time, at every level, with fuel to spare', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 25; seed += 1) {
      let s = createGame(seededRng(seed * 3 + level * 100), level);
      let leastFuel = Infinity;
      let frames = 0;
      while (!s.complete) {
        if (s.phase === 'waiting') s = setEngine(s, 'up', true);
        else if (s.phase === 'flying') {
          s = press(s, pilot(s));
          leastFuel = Math.min(leastFuel, s.fuel);
        }
        s = step(s, FRAME);
        frames += 1;
        assert.ok(frames < 60 * 60 * 5);
      }
      assert.deepEqual(s.landings, ['soft', 'soft', 'soft'], `level ${level}, seed ${seed}: ${s.landings.join(', ')}`);
      assert.equal(starsForLandings(s), 3);
      assert.ok(leastFuel > s.fuelFull * 0.2, `level ${level}: only ${leastFuel.toFixed(1)}s of fuel left`);
    }
  }
});

test('never touching the engine is a bump, and the round still ends after three', () => {
  for (const level of LEVELS) {
    const s = fly(createGame(seededRng(level), level), () => ({ up: false, left: false, right: false }));
    assert.equal(s.landings.length, DESCENTS_PER_ROUND);
    assert.ok(s.landings.every((l) => l !== 'soft'));
    assert.equal(starsForLandings(s), 1, 'never none');
  }
});

test('holding the engine down for ever still comes down: the fuel runs out', () => {
  for (const level of LEVELS) {
    const s = fly(createGame(seededRng(level + 9), level), () => ({ up: true, left: false, right: false }));
    assert.equal(s.landings.length, DESCENTS_PER_ROUND);
  }
});

test('landing beside the pad is not a soft landing, however gentle', () => {
  const s = createGame(seededRng(4), 3);
  const d = descentNow(s);
  assert.equal(onPad(s, d.padX), true);
  assert.equal(onPad(s, d.padX + s.padW / 2), false, 'half off the pad');
});

test('nothing falls until the first press, and the result shows before the next rocket', () => {
  const s = createGame(seededRng(5), 2);
  assert.deepEqual(step(s, 3), s);
  let flying = setEngine(s, 'up', true);
  assert.equal(flying.phase, 'flying');
  assert.equal(flying.rocket.y, START_Y);
  flying = setEngine(flying, 'up', false);
  while (flying.phase === 'flying') flying = step(flying, FRAME);
  assert.equal(flying.phase, 'landed');
  assert.equal(setEngine(flying, 'up', true), flying, 'no engine while landed');
  let t = 0;
  while (flying.phase === 'landed') {
    flying = step(flying, FRAME);
    t += FRAME;
  }
  assert.ok(Math.abs(t - REST) < 0.05);
  assert.equal(flying.phase, 'waiting');
  assert.equal(flying.index, 1);
  assert.equal(flying.fuel, flying.fuelFull, 'a full tank each descent');
});
