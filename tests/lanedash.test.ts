import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import {
  CAR_LENGTH,
  LANE_SPEED,
  OBSTACLE_SHAPES,
  SLOW_FACTOR,
  SLOW_FOR,
  createGame,
  raceTime,
  rivalDistance,
  rivalFinishTime,
  rivalLaneAt,
  specForLevel,
  starsForPlace,
  steer,
  step,
  type LaneDashState,
} from '../src/games/lanedash/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];
const FRAME = 1 / 60;

/** Drives a race to the flag at 60fps; `choose` returns -1, 0 or 1 each frame. */
function race(state: LaneDashState, choose: (s: LaneDashState) => -1 | 0 | 1): LaneDashState {
  let s = steer(state, 1); // the first tap starts the race
  for (let frame = 0; frame < 60 * 120 && !s.complete; frame += 1) {
    const d = choose(s);
    if (d !== 0) s = steer(s, d);
    s = step(s, FRAME);
  }
  return s;
}

/** Looks at the next row still ahead of the car, and heads for the nearest
 *  clear lane — using only what's on the road. */
function perfect(s: LaneDashState): -1 | 0 | 1 {
  const ahead = s.obstacles.filter((o) => o.y + o.length > s.distance - CAR_LENGTH);
  if (ahead.length === 0) return 0;
  const nextY = Math.min(...ahead.map((o) => o.y));
  const blocked = ahead.filter((o) => o.y === nextY).map((o) => o.lane);
  if (!blocked.includes(s.lane)) return 0;
  const free = Array.from({ length: s.lanes }, (_, l) => l).filter((l) => !blocked.includes(l));
  const target = free.reduce((a, b) => (Math.abs(b - s.lane) < Math.abs(a - s.lane) ? b : a));
  return target < s.lane ? -1 : 1;
}

test('nothing moves until the first tap, and that tap only starts the race', () => {
  const state = createGame(seededRng(1), 3);
  assert.deepEqual(step(state, 3), state);
  const going = steer(state, -1);
  assert.equal(going.started, true);
  assert.equal(going.lane, state.lane, 'the starting tap does not also steer');
});

test('every race ends at a flag fixed before the start, 20 to 40 seconds away', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 30; seed += 1) {
      const s = createGame(seededRng(seed * 13 + level), level);
      const seconds = raceTime(s);
      assert.ok(seconds >= 20 && seconds <= 40, `level ${level} races for ${seconds.toFixed(1)}s`);
    }
  }
});

test('a clean race always wins, on every track at every level', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 40; seed += 1) {
      const end = race(createGame(seededRng(seed * 7 + level), level), perfect);
      assert.equal(end.complete, true);
      assert.equal(end.bumps, 0, `level ${level} seed ${seed}: the clean line was blocked`);
      assert.equal(end.place, 1, `level ${level} seed ${seed}: a clean race came ${end.place}`);
      assert.equal(starsForPlace(end.place as number), 3);
    }
  }
});

test('no row ever blocks every lane, and there is always time to move across', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 40; seed += 1) {
      const s = createGame(seededRng(seed + level * 100), level);
      const rows = new Map<number, number[]>();
      for (const o of s.obstacles) rows.set(o.y, [...(rows.get(o.y) ?? []), o.lane]);
      const ys = [...rows.keys()].sort((a, b) => a - b);
      for (const y of ys) assert.ok((rows.get(y) as number[]).length < s.lanes, `level ${level}: a full block`);
      for (let i = 1; i < ys.length; i += 1) {
        const longest = Math.max(...s.obstacles.filter((o) => o.y === ys[i - 1]).map((o) => o.length));
        const room = ys[i] - (ys[i - 1] + longest) - CAR_LENGTH;
        const crossing = ((s.lanes - 1) / LANE_SPEED) * s.speed;
        assert.ok(room > crossing, `level ${level} seed ${seed}: no time to cross the road between rows`);
      }
    }
  }
});

test('a bump slows the car and costs places — it never ends the race', () => {
  for (const level of LEVELS) {
    const start = createGame(seededRng(level * 9), level);
    const straight = race(start, () => 0);
    assert.equal(straight.complete, true, `level ${level}: driving into things never finished`);
    assert.ok(straight.bumps > 0, 'the straight line should meet something');
    assert.ok(straight.elapsed > raceTime(start), 'bumps cost no time');
    assert.ok(straight.place != null && straight.place >= 1 && straight.place <= 3);
    assert.ok(starsForPlace(straight.place as number) >= 1, 'even last place is a star');
  }
});

test('each bump costs the same, known amount of time', () => {
  const lost = SLOW_FOR * (1 - SLOW_FACTOR);
  const start = createGame(seededRng(77), 4);
  const end = race(start, () => 0);
  const extra = end.elapsed - raceTime(start);
  assert.ok(Math.abs(extra - end.bumps * lost) < 0.05 * end.bumps + 0.05, `${end.bumps} bumps cost ${extra.toFixed(2)}s`);
});

test('rivals keep a fixed pace from start to finish — no rubber band', () => {
  const s = createGame(seededRng(5), 5);
  for (const rival of s.rivals) {
    const at = (t: number) => rivalDistance(rival, t, s.finish);
    assert.ok(Math.abs(at(10) - at(9) - rival.pace) < 1e-6);
    assert.ok(Math.abs(at(3) - at(2) - rival.pace) < 1e-6);
  }
  // The race state holds nothing that could adjust them mid-race: the
  // rivals are the same objects before and after a whole race is run.
  const end = race(s, () => 0);
  assert.deepEqual(end.rivals, s.rivals);
});

test("the finishing place is exact, from the rivals' fixed finishing times", () => {
  const s = createGame(seededRng(21), 3);
  const [near, far] = s.rivals.map((r) => rivalFinishTime(r, s.finish)).sort((a, b) => a - b);
  const end = race(s, () => 0);
  const expected = end.elapsed < near ? 1 : end.elapsed < far ? 2 : 3;
  assert.equal(end.place, expected);
});

test('rivals drive clean lines: never through an obstacle', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 30; seed += 1) {
      const s = createGame(seededRng(seed * 3 + level), level);
      for (const rival of s.rivals) {
        for (const o of s.obstacles) {
          for (let y = o.y; y <= o.y + o.length; y += 10) {
            const lane = rivalLaneAt(rival, y);
            assert.ok(Math.abs(lane - o.lane) > 0.6, `level ${level} seed ${seed}: rival ${rival.number} drives through a ${o.kind}`);
          }
        }
      }
    }
  }
});

test('nobody starts on top of anybody else', () => {
  for (const level of LEVELS) {
    const s = createGame(seededRng(level), level);
    const grid = [`${s.lane}:0`, ...s.rivals.map((r) => `${r.startLane}:${r.startBack}`)];
    assert.equal(new Set(grid).size, grid.length, `level ${level}: two cars share a grid slot`);
  }
});

test('steering stops at the edge of the road', () => {
  let s = steer(createGame(seededRng(2), 3), 1);
  for (let i = 0; i < 5; i += 1) s = steer(s, -1);
  assert.equal(s.lane, 0);
  for (let i = 0; i < 5; i += 1) s = steer(s, 1);
  assert.equal(s.lane, s.lanes - 1);
});

test('every kind a level allows turns up, and each has its own shape', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 20; seed += 1) {
      const kinds = new Set(createGame(seededRng(seed + level * 7), level).obstacles.map((o) => o.kind));
      for (const kind of specForLevel(level).kinds) assert.ok(kinds.has(kind), `level ${level} has no ${kind}`);
    }
  }
  const shapes = Object.values(OBSTACLE_SHAPES).map((o) => `${o.width}x${o.length}`);
  assert.equal(new Set(shapes).size, shapes.length);
});
