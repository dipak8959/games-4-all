import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import { starsForMistakes } from '../src/games/types.ts';
import {
  COLS,
  DUCKS_PER_ROUND,
  clearAt,
  createGame,
  hop,
  specForLevel,
  step,
  vehiclesAt,
  type DuckCrossingState,
  type Hop,
} from '../src/games/duckcrossing/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];
const TICK = 0.1;

/**
 * A careful crosser who can see exactly where the traffic will be: finds,
 * a tenth of a second at a time, a way to the pond that is clear the whole
 * time it's standing anywhere — waiting on the grass for a gap when it has
 * to. Returns the moves, each with the tick to make it on.
 */
function plan(state: DuckCrossingState): { at: number; way: Hop | null }[] | null {
  const pond = state.rows.length - 1;
  const safe = (row: number, col: number, t: number) => {
    for (let i = 0; i <= 4; i += 1) if (!clearAt(state, row, col, t + (TICK * i) / 4)) return false;
    return true;
  };
  const start = { ...state.duck, tick: 0 };
  const key = (r: number, c: number, k: number) => `${r}:${c}:${k}`;
  const from = new Map<string, { prev: string | null; way: Hop | null }>([[key(start.row, start.col, 0), { prev: null, way: null }]]);
  let frontier = [start];
  for (let tick = 0; tick < 900 && frontier.length; tick += 1) {
    const next: typeof frontier = [];
    for (const at of frontier) {
      const moves: [Hop | null, number, number][] = [
        ['up', at.row + 1, at.col],
        [null, at.row, at.col],
        ['left', at.row, at.col - 1],
        ['right', at.row, at.col + 1],
        ['down', at.row - 1, at.col],
      ];
      for (const [way, row, col] of moves) {
        if (row < 0 || col < 0 || col >= COLS) continue;
        const t = state.time + (tick + 1) * TICK;
        const k = key(row, col, tick + 1);
        if (from.has(k)) continue;
        if (row === pond) {
          from.set(k, { prev: key(at.row, at.col, tick), way });
          const out: { at: number; way: Hop | null }[] = [];
          let cur: string | null = k;
          let depth = tick + 1;
          while (cur && from.get(cur)!.prev) {
            out.unshift({ at: depth - 1, way: from.get(cur)!.way });
            cur = from.get(cur)!.prev;
            depth -= 1;
          }
          return out;
        }
        if (!safe(row, col, t - TICK)) continue;
        from.set(k, { prev: key(at.row, at.col, tick), way });
        next.push({ row, col, tick: tick + 1 });
      }
    }
    frontier = next;
  }
  return null;
}

function cross(state: DuckCrossingState): DuckCrossingState {
  const moves = plan(state);
  assert.ok(moves, 'no safe way across');
  let s = state;
  for (const { way } of moves) {
    if (way) s = hop(s, way);
    // A tick of waiting, in small steps.
    for (let i = 0; i < 4; i += 1) s = step(s, TICK / 4);
  }
  return s;
}

test('roads are split by grass, and every lane has room between its vehicles', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    for (let seed = 0; seed < 40; seed += 1) {
      const s = createGame(seededRng(seed * 3 + level), level);
      assert.equal(s.rows[0], 'grass');
      assert.equal(s.rows[s.rows.length - 1], 'pond');
      assert.equal(s.rows.filter((r) => r === 'road').length, spec.lanes);
      assert.ok(!s.rows.join(',').includes('road,road,road,road'), 'never more than three lanes without grass');
      for (const lane of Object.values(s.lanes)) {
        assert.ok(lane.vehicles.length >= 1);
        assert.ok(lane.vehicles.every((v) => v.length >= 1 && v.length <= spec.maxLength));
      }
    }
  }
});

test('a careful crosser gets all three ducklings home with no bumps, at every level', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 12; seed += 1) {
      let s = hop(createGame(seededRng(seed + 40 * level), level), 'left');
      s = hop(s, 'right');
      while (!s.complete) s = cross(s);
      assert.equal(s.home, DUCKS_PER_ROUND);
      assert.equal(s.bumps, 0, `level ${level}, seed ${seed}`);
      assert.equal(starsForMistakes(s.bumps), 3);
    }
  }
});

test('stepping out in front of a car is a bump, and back to the grass — never the end', () => {
  let s = createGame(seededRng(5), 1);
  s = hop(s, 'left');
  // Wait on the grass until the first lane is about to be busy here.
  let tries = 0;
  while (clearAt(s, 1, s.duck.col, s.time) && tries < 2000) {
    s = step(s, 0.02);
    tries += 1;
  }
  const bumped = hop(s, 'up');
  assert.equal(bumped.bumps, 1);
  assert.equal(bumped.duck.row, 0, 'back on the grass');
  assert.equal(bumped.complete, false);
});

test('standing still in a lane gets bumped when traffic comes, and put back on the kerb', () => {
  let s = createGame(seededRng(6), 3);
  s = hop(s, 'up');
  s = { ...s, bumps: 0, duck: { row: 2, col: 3 } };
  for (let i = 0; i < 60 * 30 && s.bumps === 0; i += 1) s = step(s, 1 / 60);
  assert.equal(s.bumps, 1);
  assert.equal(s.rows[s.duck.row], 'grass');
  assert.ok(s.duck.row < 2);
});

test('nothing moves before the first hop, and hops stay on the board', () => {
  const s = createGame(seededRng(7), 2);
  assert.deepEqual(step(s, 3), s);
  let edge = s;
  for (let i = 0; i < 10; i += 1) edge = hop(edge, 'left');
  assert.equal(edge.duck.col, 0);
  assert.equal(hop(edge, 'down').duck.row, 0);
});

test('traffic keeps its gaps as it drives round', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    const s = createGame(seededRng(level), level);
    for (const lane of Object.values(s.lanes)) {
      for (let t = 0; t < 20; t += 0.37) {
        const spans = vehiclesAt(lane, t).sort((a, b) => a.left - b.left);
        for (let i = 1; i < spans.length; i += 1) {
          assert.ok(spans[i].left - spans[i - 1].right >= spec.gap - 1e-9, `level ${level}: gap too small`);
        }
      }
    }
  }
});
