import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import {
  ENTRY,
  JUNCTION_X,
  SHAPES,
  STATION_X,
  TRAINS,
  createGame,
  flip,
  specForLevel,
  starsForTrains,
  start,
  step,
  wayAt,
  wrong,
  type Shape,
  type TrainSwitchState,
} from '../src/games/trainswitch/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];
const DT = 1 / 30;

function edge(s: TrainSwitchState, from: number, to: number): number {
  const b = s.nodes[to];
  const a = from < 0 ? { x: ENTRY.x, y: b.y } : s.nodes[from];
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** How far a train on its way home still has to go to reach a junction, or
 *  null if its way home doesn't pass it. */
function distanceTo(s: TrainSwitchState, shape: Shape, from: number, to: number, along: number, junction: number): number | null {
  let d = edge(s, from, to) - along;
  let node = to;
  for (;;) {
    if (node === junction) return d;
    const n = s.nodes[node];
    if (!n.next) return null;
    const way = wayAt(s, node, shape);
    if (way === null) return null;
    d += edge(s, node, n.next[way]);
    node = n.next[way];
  }
}

/**
 * A careful signaller: for every junction, finds the train that will get
 * there next — on the track, or about to set off — and sets the points for
 * it.
 */
function signal(s: TrainSwitchState): TrainSwitchState {
  let next = s;
  for (const j of s.nodes.filter((n) => n.next)) {
    let best: { d: number; shape: Shape } | null = null;
    for (const t of s.trains) {
      const d = distanceTo(s, t.shape, t.from, t.to, t.along, j.id);
      if (d !== null && (!best || d < best.d)) best = { d, shape: t.shape };
    }
    if (s.queue.length) {
      const wait = Math.max(0, s.gap - s.sinceLast) * s.speed;
      const d = distanceTo(s, s.queue[0], -1, s.root, 0, j.id);
      if (d !== null && (!best || d + wait < best.d)) best = { d: d + wait, shape: s.queue[0] };
    }
    if (!best) continue;
    const way = wayAt(s, j.id, best.shape);
    if (way !== null && next.points[j.id] !== way) next = flip(next, j.id);
  }
  return next;
}

test('a careful signaller sends every train to its own station, at every level', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 40; seed += 1) {
      let s = start(createGame(seededRng(seed * 31 + level), level));
      for (let t = 0; t < 400 && !s.complete; t += DT) s = step(signal(s), DT);
      assert.equal(s.complete, true, `level ${level}, seed ${seed}`);
      assert.equal(s.arrivals.length, TRAINS);
      assert.equal(wrong(s), 0, `level ${level}, seed ${seed}: ${wrong(s)} astray`);
      assert.equal(starsForTrains(s), 3);
    }
  }
});

test('the track: every station a different shape, junctions at most three deep, far enough apart to tap', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    for (let seed = 0; seed < 40; seed += 1) {
      const s = createGame(seededRng(seed + 9 * level), level);
      const stations = s.nodes.filter((n) => !n.next);
      assert.equal(stations.length, spec.stations);
      assert.equal(new Set(stations.map((n) => n.shape)).size, spec.stations);
      stations.forEach((n) => assert.equal(n.x, STATION_X));
      const junctions = s.nodes.filter((n) => n.next);
      assert.equal(junctions.length, spec.stations - 1);
      for (const j of junctions) assert.ok((JUNCTION_X as readonly number[]).includes(j.x));
      // No two junctions closer than a 72dp button, even on a small phone.
      for (const a of junctions) {
        for (const b of junctions) {
          if (a !== b) assert.ok(Math.abs(a.x - b.x) >= 80 || Math.abs(a.y - b.y) >= 80, 'two junctions too close to tap apart');
        }
      }
    }
  }
});

test('leaving the points alone still brings every train in, somewhere', () => {
  for (const level of LEVELS) {
    let s = start(createGame(seededRng(level), level));
    for (let t = 0; t < 400 && !s.complete; t += DT) s = step(s, DT);
    assert.equal(s.complete, true);
    assert.equal(s.arrivals.length, TRAINS);
  }
});

test('a train at the wrong station unloads there, and the round goes on', () => {
  let s = start(createGame(seededRng(5), 1));
  // Points left up: any train for the lower station goes astray.
  for (let t = 0; t < 400 && !s.complete; t += DT) s = step(s, DT);
  const astray = s.arrivals.filter((a) => !a.right);
  for (const a of astray) assert.notEqual(a.shape, a.station);
  assert.equal(starsForTrains(s), astray.length === 0 ? 3 : astray.length <= 2 ? 2 : 1);
});

test('nothing sets off until the first tap; the points only flip at junctions', () => {
  const s = createGame(seededRng(2), 3);
  assert.equal(step(s, 5), s);
  const station = s.nodes.find((n) => !n.next)!;
  assert.equal(flip(s, station.id), s);
  const j = s.nodes.find((n) => n.next)!;
  const flipped = flip(s, j.id);
  assert.equal(flipped.points[j.id], 1);
  assert.equal(flipped.started, true);
});

test('every train carries a station\'s shape', () => {
  const s = createGame(seededRng(7), 6);
  const stations = new Set(s.nodes.filter((n) => n.shape).map((n) => n.shape));
  assert.equal(s.queue.length, TRAINS);
  for (const shape of s.queue) assert.ok(stations.has(shape) && SHAPES.includes(shape));
});
