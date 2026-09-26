import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import {
  BALL_RADIUS,
  FIELD_WIDTH,
  GROUND_Y,
  HAND,
  MAX_PULL,
  MIN_PULL,
  REST,
  THROWS_PER_ROUND,
  aim,
  board,
  createGame,
  guideDots,
  release,
  rimEdges,
  specForLevel,
  starsForThrows,
  step,
  type HoopShotState,
} from '../src/games/hoopshot/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];

/** Throws with this pull and plays the flight out; true if it went in. */
function goesIn(state: HoopShotState, dx: number, dy: number): boolean {
  let s = release(aim(state, dx, dy));
  if (s.phase !== 'flying') return false;
  const from = s.throwIndex;
  while (s.phase === 'flying' && s.throwIndex === from) s = step(s, 1 / 60);
  return s.scored;
}

/** A player who knows exactly how the ball flies: tries pulls until one goes
 *  in, the gentlest-looking first. */
function findThrow(state: HoopShotState): { dx: number; dy: number } | null {
  for (let deg = 40; deg <= 88; deg += 2) {
    const a = (deg * Math.PI) / 180;
    for (let size = MIN_PULL; size <= MAX_PULL; size += 1.5) {
      const dx = size * Math.cos(a);
      const dy = -size * Math.sin(a);
      if (goesIn(state, dx, dy)) return { dx, dy };
    }
  }
  return null;
}

function nextThrow(s: HoopShotState): HoopShotState {
  let next = s;
  while (next.phase !== 'ready' && !next.complete) next = step(next, 1 / 60);
  return next;
}

test('ten throws a round, the first at home in still air, every hoop inside the field', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    for (let seed = 0; seed < 40; seed += 1) {
      const s = createGame(seededRng(seed * 7 + level), level);
      assert.equal(s.hoops.length, THROWS_PER_ROUND);
      assert.equal(s.hoops[0].wind, 0);
      for (const hoop of s.hoops) {
        for (const sway of [-s.sway, s.sway]) {
          const at = { ...hoop, x: hoop.x + sway };
          const edges = rimEdges(s, at);
          const b = board(s, at);
          assert.ok(edges.left > HAND.x + BALL_RADIUS * 3, 'hoop right on top of the ball');
          assert.ok(b.x + 6 <= FIELD_WIDTH, `level ${level}: backboard off the field`);
          assert.ok(b.top > 20 && edges.y < GROUND_Y - 120);
        }
        assert.ok(Math.abs(hoop.wind) <= spec.wind);
        if (!spec.wind) assert.equal(hoop.wind, 0);
      }
    }
  }
});

test('the wind only blows from level 4, and the hoop only sways from level 5', () => {
  assert.deepEqual(LEVELS.map((l) => specForLevel(l).wind > 0), [false, false, false, true, true, true]);
  assert.deepEqual(LEVELS.map((l) => specForLevel(l).sway > 0), [false, false, false, false, true, true]);
});

test('every throw at every level can go in, and a player who judges well gets three stars', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 2; seed += 1) {
      let s = createGame(seededRng(seed * 13 + level), level);
      while (!s.complete) {
        const pull = findThrow(s);
        assert.ok(pull, `level ${level}, throw ${s.throwIndex + 1}: no throw goes in`);
        s = nextThrow(release(aim(s, pull.dx, pull.dy)));
      }
      assert.equal(s.made.length, THROWS_PER_ROUND);
      assert.equal(starsForThrows(s), 3);
    }
  }
});

test('at level 1 the dots show the way: a pull whose dots drop through the hoop goes in', () => {
  const s = createGame(seededRng(1), 1);
  const edges = rimEdges(s);
  let found = 0;
  for (let deg = 30; deg <= 84; deg += 3) {
    const a = (deg * Math.PI) / 180;
    for (let size = MIN_PULL; size <= MAX_PULL; size += 4) {
      const aimed = aim(s, size * Math.cos(a), -size * Math.sin(a));
      const dots = guideDots(aimed);
      // Two dots in a row, one above the rim and the next below it, both
      // well inside the opening — and every dot before them well clear of
      // the rim's edges and the board, as a child reading the dots would
      // see it.
      const at = dots.findIndex(
        (d, i) =>
          i > 0 &&
          dots[i - 1].y < edges.y &&
          d.y >= edges.y &&
          [d, dots[i - 1]].every((p) => p.x > edges.left + BALL_RADIUS + 6 && p.x < edges.right - BALL_RADIUS - 6),
      );
      if (at < 0) continue;
      const b = board(s);
      const clear = dots.slice(0, at).every(
        (d) =>
          Math.hypot(d.x - edges.left, d.y - edges.y) > BALL_RADIUS + 12 &&
          Math.hypot(d.x - edges.right, d.y - edges.y) > BALL_RADIUS + 12 &&
          !(d.x > b.x - BALL_RADIUS - 6 && d.y > b.top - BALL_RADIUS - 6 && d.y < b.bottom + BALL_RADIUS + 6) &&
          // Not up through the hoop from underneath, either.
          !(d.y > edges.y - BALL_RADIUS && d.y < edges.y + 30 && d.x > edges.left - 6 && d.x < edges.right + 6),
      );
      if (!clear) continue;
      found += 1;
      assert.ok(goesIn(s, aimed.pull!.dx, aimed.pull!.dy), `${deg}° at ${size}: the dots lied`);
    }
  }
  assert.ok(found >= 5, 'hardly any pulls drop through at level 1');
});

test('the guide shows less of the throw as the levels rise', () => {
  const lengths = LEVELS.map((l) => guideDots(createGame(seededRng(2), l), { dx: 60, dy: -60 }).length);
  for (let i = 1; i < lengths.length; i += 1) assert.ok(lengths[i] <= lengths[i - 1], lengths.join(', '));
  assert.ok(lengths[0] > lengths[5] * 3);
});

test('a slip of the finger is not a throw, and a pull is kept forwards and upwards', () => {
  const s = createGame(seededRng(3), 2);
  const slip = aim(s, 5, -5);
  assert.equal(slip.pull, null);
  assert.equal(release(slip), slip, 'nothing thrown');
  assert.equal(release(s), s);
  const backwards = aim(s, -80, 40).pull!;
  assert.ok(backwards.dx > 0 && backwards.dy < 0);
  const huge = aim(s, 400, -400).pull!;
  assert.ok(Math.hypot(huge.dx, huge.dy) <= MAX_PULL + 1e-9);
});

test('the round ends after ten throws, in or not, and each throw ends on its own', () => {
  let s = createGame(seededRng(4), 3);
  let throws = 0;
  while (!s.complete) {
    s = release(aim(s, 20, -10));
    throws += 1;
    let t = 0;
    while (s.phase !== 'ready' && !s.complete) {
      s = step(s, 1 / 60);
      t += 1 / 60;
    }
    assert.ok(t <= 5 + REST + 0.1, 'a throw that never finished');
  }
  assert.equal(throws, THROWS_PER_ROUND);
  assert.equal(s.made.length, 0);
  assert.equal(starsForThrows(s), 1, 'never none');
});

test('no throw while one is in the air', () => {
  let s = release(aim(createGame(seededRng(5), 1), 60, -60));
  s = step(s, 0.1);
  assert.equal(s.phase, 'flying');
  assert.equal(aim(s, 60, -60), s);
});
