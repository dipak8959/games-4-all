import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import { FAMILIES, FIGURES, type Figure, type Part } from '../src/games/shadowmatch/figures.ts';
import {
  QUESTIONS_PER_ROUND,
  choose,
  createGame,
  createQuestion,
  specForLevel,
} from '../src/games/shadowmatch/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];

/** Is (x, y) inside this part? Used to draw each figure as a grid of dots. */
function inside(part: Part, x: number, y: number): boolean {
  switch (part.k) {
    case 'rect':
      return x >= part.x && x < part.x + part.w && y >= part.y && y < part.y + part.h;
    case 'disc':
      return (x - part.cx) ** 2 + (y - part.cy) ** 2 < part.r ** 2;
    case 'tri': {
      // Distance along the pointing direction, from the base to the tip.
      const { x: px, y: py, w, h } = part;
      if (x < px || x >= px + w || y < py || y >= py + h) return false;
      if (part.dir === 'up') return Math.abs(x - (px + w / 2)) <= (w / 2) * ((y - py) / h);
      if (part.dir === 'down') return Math.abs(x - (px + w / 2)) <= (w / 2) * (1 - (y - py) / h);
      if (part.dir === 'right') return Math.abs(y - (py + h / 2)) <= (h / 2) * (1 - (x - px) / w);
      return Math.abs(y - (py + h / 2)) <= (h / 2) * ((x - px) / w);
    }
  }
}

const GRID = 50;

/** A figure's silhouette as a GRID x GRID bitmap, turned `turn` degrees. */
function silhouette(figure: Figure, turn: number): boolean[] {
  const out: boolean[] = [];
  for (let gy = 0; gy < GRID; gy += 1) {
    for (let gx = 0; gx < GRID; gx += 1) {
      // Turn the sample point back the other way round the centre.
      let x = (gx + 0.5) * (100 / GRID);
      let y = (gy + 0.5) * (100 / GRID);
      for (let t = 0; t < turn; t += 90) [x, y] = [y, 100 - x];
      out.push(figure.parts.some((p) => inside(p, x, y)));
    }
  }
  return out;
}

test('every figure sits inside its square and has an outline worth matching', () => {
  const ids = new Set<string>();
  for (const f of FIGURES) {
    assert.ok(!ids.has(f.id), `${f.id} twice`);
    ids.add(f.id);
    for (const p of f.parts) {
      const [x0, y0, x1, y1] =
        p.k === 'disc' ? [p.cx - p.r, p.cy - p.r, p.cx + p.r, p.cy + p.r] : [p.x, p.y, p.x + p.w, p.y + p.h];
      assert.ok(x0 >= 0 && y0 >= 0 && x1 <= 100 && y1 <= 100, `${f.id} spills out of its square`);
    }
    const filled = silhouette(f, 0).filter(Boolean).length / GRID ** 2;
    assert.ok(filled > 0.12, `${f.id} is too slight to see as a shadow (${filled.toFixed(2)})`);
  }
});

test('every family has three members, for the near misses', () => {
  for (const family of FAMILIES) {
    assert.equal(FIGURES.filter((f) => f.family === family).length, 3, family);
  }
});

test('no two figures cast the same shadow, however either is turned', () => {
  // A near miss has to be a *visible* miss: a child comparing outlines must
  // be able to find a difference, and no turned shadow may be mistaken for a
  // different thing's upright one. At least 5% of the square has to differ.
  const shapes = FIGURES.map((f) => [0, 90, 180, 270].map((t) => silhouette(f, t)));
  for (let a = 0; a < FIGURES.length; a += 1) {
    for (let b = a + 1; b < FIGURES.length; b += 1) {
      for (let t = 0; t < 4; t += 1) {
        const diff = shapes[a][0].filter((v, i) => v !== shapes[b][t][i]).length / GRID ** 2;
        assert.ok(
          diff >= 0.05,
          `${FIGURES[a].id} and ${FIGURES[b].id} turned ${t * 90} are too alike (${(diff * 100).toFixed(1)}%)`,
        );
      }
    }
  }
});

test('each question has the level\'s number of shadows, exactly one of them right', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    for (let seed = 0; seed < 200; seed += 1) {
      const q = createQuestion(seededRng(seed * 7 + level), level);
      assert.equal(q.shadows.length, spec.choices);
      const ids = q.shadows.map((s) => s.figure.id);
      assert.equal(new Set(ids).size, ids.length, 'a shadow offered twice');
      assert.equal(ids.filter((id) => id === q.thing.id).length, 1);
      assert.equal(q.shadows[q.answer].figure.id, q.thing.id);
      const near = q.shadows.filter((s) => s.figure.family === q.thing.family).length - 1;
      assert.equal(near, spec.near, `level ${level}: ${near} near misses`);
    }
  }
});

test('shadows stay upright until level 5, then turn', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    for (let seed = 0; seed < 100; seed += 1) {
      const q = createQuestion(seededRng(seed + 1000 * level), level);
      const turns = new Set(q.shadows.map((s) => s.turn));
      if (spec.turn === 0) assert.deepEqual([...turns], [0]);
      if (spec.turn === 1) {
        assert.equal(turns.size, 1, 'level 5 turns every shadow the same way');
        assert.ok(!turns.has(0));
      }
      if (spec.turn === 2) assert.ok(!turns.has(0), 'level 6 turns every shadow');
    }
  }
});

test('a wrong shadow is one mistake, dimmed and never charged twice', () => {
  const rng = seededRng(3);
  const s = createGame(seededRng(3), 4);
  const wrong = s.question.answer === 0 ? 1 : 0;
  const once = choose(s, wrong, rng, 4);
  assert.equal(once.mistakes, 1);
  assert.deepEqual(once.ruledOut, [wrong]);
  assert.equal(choose(once, wrong, rng, 4), once);
});

test('six right answers end the round, and the thing never repeats back to back', () => {
  const rng = seededRng(9);
  let s = createGame(seededRng(9), 2);
  for (let i = 0; i < QUESTIONS_PER_ROUND; i += 1) {
    assert.equal(s.complete, false);
    const before = s.question.thing.id;
    s = choose(s, s.question.answer, rng, 2);
    if (!s.complete) assert.notEqual(s.question.thing.id, before);
  }
  assert.equal(s.complete, true);
  assert.equal(s.mistakes, 0);
});
