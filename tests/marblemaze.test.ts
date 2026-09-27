import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import {
  BOARDS,
  HOLE,
  MARBLE,
  MOST_DROPS,
  boardNow,
  comeBackAt,
  createGame,
  offRoute,
  press,
  route,
  specForLevel,
  starsForDrops,
  step,
  totalDrops,
  type MarbleMazeState,
  type Point,
} from '../src/games/marblemaze/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];
const DT = 1 / 30;

function toSegment(p: Point, a: Point, b: Point): { d: number; t: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length2 = dx * dx + dy * dy;
  const t = length2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length2)) : 0;
  return { d: Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t)), t };
}

/**
 * A careful player: follows the way through, a little ahead of the marble,
 * holding its speed down and slowing for each turn — pressing wherever
 * tips the board the way the marble should be going.
 */
function careful(s: MarbleMazeState): Point | null {
  if (s.phase !== 'rolling') return null;
  const way = route(boardNow(s));
  const m = s.marble;
  // The piece of the way the marble is on: the nearest, the later if tied.
  let best = 1;
  let bestD = Infinity;
  for (let i = 1; i < way.length; i += 1) {
    const { d } = toSegment(m, way[i - 1], way[i]);
    if (d <= bestD + 0.5) {
      best = i;
      bestD = Math.min(d, bestD);
    }
  }
  if (Math.hypot(way[best].x - m.x, way[best].y - m.y) < 6 && best < way.length - 1) best += 1;
  const a = way[best - 1];
  const b = way[best];
  const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const { t } = toSegment(m, a, b);
  const ahead = Math.min(1, t + 22 / length);
  const carrot = { x: a.x + (b.x - a.x) * ahead, y: a.y + (b.y - a.y) * ahead };
  const toEnd = Math.hypot(b.x - m.x, b.y - m.y);
  const turning = best < way.length - 1 ? 35 : 80;
  const allowed = Math.min(110, Math.sqrt(turning * turning + 2 * 0.5 * s.tilt * toEnd));
  const cx = carrot.x - m.x;
  const cy = carrot.y - m.y;
  const cd = Math.hypot(cx, cy) || 1;
  const want = { x: (cx / cd) * allowed, y: (cy / cd) * allowed };
  const ex = want.x - m.vx;
  const ey = want.y - m.vy;
  const ed = Math.hypot(ex, ey);
  if (ed < 3) return null;
  return { x: m.x + (ex / ed) * 40, y: m.y + (ey / ed) * 40 };
}

function play(initial: MarbleMazeState, choose: (s: MarbleMazeState) => Point | null, limit = 400) {
  let s = initial;
  let t = 0;
  for (; t < limit && !s.complete; t += DT) {
    s = press(s, choose(s));
    s = step(s, DT);
  }
  return { s, t };
}

test('a careful player rolls every board to the finish without a drop', () => {
  for (const level of LEVELS) {
    let slowest = 0;
    for (let seed = 0; seed < 30; seed += 1) {
      const { s, t } = play(createGame(seededRng(seed * 31 + level), level), careful);
      assert.equal(s.complete, true, `level ${level}, seed ${seed}: board ${s.index + 1}`);
      assert.equal(totalDrops(s), 0, `level ${level}, seed ${seed}: dropped ${s.drops.join(',')}`);
      assert.equal(starsForDrops(totalDrops(s)), 3);
      slowest = Math.max(slowest, t);
    }
    assert.ok(slowest < 90, `level ${level}: ${slowest.toFixed(0)}s for three boards`);
  }
});

test('every board has its holes, each clear of the way through, and doors the marble fits', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    for (let seed = 0; seed < 40; seed += 1) {
      const s = createGame(seededRng(seed + level * 100), level);
      assert.equal(s.boards.length, BOARDS);
      for (const board of s.boards) {
        assert.equal(board.holes.length, spec.holes, `level ${level}, seed ${seed}: ${board.holes.length} holes`);
        assert.equal(board.bars.length, spec.bars);
        for (const h of board.holes) assert.ok(offRoute(board, h) >= HOLE + spec.room - 0.01);
        for (const bar of board.bars) assert.ok(bar.width >= MARBLE * 2 + 20);
        // The way through climbs: start at the bottom, goal at the top.
        const way = route(board);
        for (let i = 1; i < way.length; i += 1) assert.ok(way[i].y <= way[i - 1].y);
      }
    }
  }
});

test('left alone, the marble stays put; held, it rolls towards the finger', () => {
  let s = createGame(seededRng(3), 1);
  const at = { ...s.marble };
  s = step(s, 2);
  assert.equal(s.marble.x, at.x);
  assert.equal(s.marble.y, at.y);
  s = press(s, { x: at.x, y: at.y - 100 });
  for (let i = 0; i < 10; i += 1) s = step(s, DT);
  assert.ok(s.marble.y < at.y - 5, 'rolled up towards the finger');
  assert.ok(Math.abs(s.marble.x - at.x) < 1);
});

test('a drop brings the marble back at the last door it went through, and four lift the board', () => {
  const s0 = createGame(seededRng(9), 3);
  const board = boardNow(s0);
  // Rolled straight at a hole, again and again.
  let s = s0;
  const hole = board.holes[0];
  for (let n = 1; n <= MOST_DROPS; n += 1) {
    s = { ...s, marble: { x: hole.x, y: hole.y + HOLE + 2, vx: 0, vy: -60 } };
    s = step(s, 0.1);
    assert.equal(s.phase, 'dropped');
    assert.equal(s.drops[0], n);
    for (let i = 0; i < 5; i += 1) s = step(s, 0.25);
    if (n < MOST_DROPS) {
      assert.equal(s.phase, 'rolling');
      const back = comeBackAt(board, hole);
      assert.deepEqual({ x: s.marble.x, y: s.marble.y }, back);
    }
  }
  assert.equal(s.phase, 'home');
  assert.equal(s.lifted, true);
  for (let i = 0; i < 5; i += 1) s = step(s, 0.25);
  assert.equal(s.index, 1);
  assert.equal(s.drops.length, 2);
});

test('the round is three boards, and then it ends', () => {
  const { s } = play(createGame(seededRng(1), 2), careful);
  assert.equal(s.complete, true);
  assert.equal(s.index, BOARDS - 1);
  const after = press(step(s, 5), { x: 10, y: 10 });
  assert.equal(after, s);
});

test('stars come from drops', () => {
  assert.equal(starsForDrops(0), 3);
  assert.equal(starsForDrops(2), 2);
  assert.equal(starsForDrops(3), 1);
});

test('coming back after a drop, or on a new board, the marble waits for a fresh press', () => {
  let s = createGame(seededRng(12), 2);
  const hole = boardNow(s).holes[0];
  s = press({ ...s, marble: { x: hole.x, y: hole.y + HOLE + 2, vx: 0, vy: -60 } }, { x: hole.x, y: hole.y - 40 });
  s = step(s, 0.1);
  assert.equal(s.phase, 'dropped');
  for (let i = 0; i < 5; i += 1) s = step(s, 0.25);
  assert.equal(s.phase, 'rolling');
  assert.equal(s.finger, null);
  const at = { ...s.marble };
  s = step(s, 0.25);
  assert.deepEqual({ x: s.marble.x, y: s.marble.y }, { x: at.x, y: at.y });
});
