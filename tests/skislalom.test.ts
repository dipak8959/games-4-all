import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import {
  FIELD_WIDTH,
  SKIER_HALF,
  STRAIGHTEN,
  TREE,
  carveReach,
  createGame,
  missed,
  setSteer,
  specForLevel,
  starsForRun,
  start,
  step,
  type SkiSlalomState,
  type Steer,
} from '../src/games/skislalom/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];
const DT = 1 / 60;

/**
 * A careful skier: heads for the middle of the next gate, and lets go early
 * enough that the carve straightens out right over it.
 */
function skiCarefully(initial: SkiSlalomState, choose = carefully): SkiSlalomState {
  let s = start(initial);
  for (let i = 0; i < 60 * 180 && !s.complete; i += 1) {
    s = setSteer(s, choose(s));
    s = step(s, DT);
  }
  return s;
}

function carefully(s: SkiSlalomState): Steer {
  const gate = s.gates[s.through.length];
  if (!gate) return 0;
  const dx = gate.x - s.x;
  const towards = Math.sign(dx) === Math.sign(s.vx);
  const stopping = (s.vx * s.vx) / (2 * STRAIGHTEN);
  if (Math.abs(dx) < 3) return 0;
  if (towards && stopping >= Math.abs(dx) - 2) return 0;
  return dx > 0 ? 1 : -1;
}

test('a careful skier makes every gate without a tumble, at every level', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 30; seed += 1) {
      const s = skiCarefully(createGame(seededRng(seed * 19 + level), level));
      assert.equal(s.complete, true);
      assert.equal(s.through.length, specForLevel(level).gates);
      assert.equal(missed(s), 0, `level ${level}, seed ${seed}: missed ${missed(s)}`);
      assert.equal(s.tumbles, 0, `level ${level}, seed ${seed}: ${s.tumbles} tumbles`);
      assert.equal(starsForRun(s), 3);
    }
  }
});

test('every gate is on the slope and within a carve of the one before', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    const reach = spec.swing * carveReach(spec.spacing / spec.speed);
    for (let seed = 0; seed < 40; seed += 1) {
      const s = createGame(seededRng(seed + 3 * level), level);
      s.gates.forEach((g, i) => {
        assert.ok(g.x - spec.gateWidth / 2 > 0 && g.x + spec.gateWidth / 2 < FIELD_WIDTH);
        const from = i === 0 ? FIELD_WIDTH / 2 : s.gates[i - 1].x;
        assert.ok(Math.abs(g.x - from) <= reach + 1e-9, `level ${level}: gate ${i} too far across`);
      });
      for (const t of s.trees) assert.ok(t.x >= TREE && t.x <= FIELD_WIDTH - TREE);
    }
  }
});

test('no trees at the first levels; trees, and more of them, later', () => {
  assert.equal(createGame(seededRng(1), 1).trees.length, 0);
  assert.equal(createGame(seededRng(1), 2).trees.length, 0);
  assert.ok(createGame(seededRng(1), 3).trees.length > 0);
  assert.ok(createGame(seededRng(1), 6).trees.length > createGame(seededRng(1), 3).trees.length);
});

test('never carving, or carving one way all the way, still reaches the finish', () => {
  for (const level of LEVELS) {
    for (const way of [0, -1, 1] as Steer[]) {
      const s = skiCarefully(createGame(seededRng(level), level), () => way);
      assert.equal(s.complete, true);
      assert.equal(s.through.length, s.gates.length);
      assert.ok(s.x >= SKIER_HALF && s.x <= FIELD_WIDTH - SKIER_HALF);
    }
  }
});

test('a tree is one tumble, and the skier gets up and goes on', () => {
  let found = false;
  for (let seed = 0; seed < 40 && !found; seed += 1) {
    const s0 = createGame(seededRng(seed), 6);
    const tree = s0.trees[0];
    // Ski straight at the first tree.
    const s = skiCarefully({ ...s0, x: tree.x }, () => 0);
    if (s.tumbles > 0) {
      found = true;
      assert.equal(s.complete, true);
      assert.ok(starsForRun(s) < 3);
    }
  }
  assert.ok(found, 'no tree was ever hit');
});

test('nothing moves until the first push', () => {
  const s = createGame(seededRng(2), 4);
  assert.equal(step(s, 1), s);
});

test('stars: every gate and no tumbles, three; two slips, two; more, one', () => {
  const s = createGame(seededRng(4), 1);
  assert.equal(starsForRun({ ...s, through: ['in', 'in'], tumbles: 0 }), 3);
  assert.equal(starsForRun({ ...s, through: ['in', 'missed'], tumbles: 1 }), 2);
  assert.equal(starsForRun({ ...s, through: ['missed', 'missed'], tumbles: 1 }), 1);
});
