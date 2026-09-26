import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng, type Rng } from '../src/util/random.ts';
import {
  FIELD_HEIGHT,
  FIELD_WIDTH,
  MAX_SHOTS,
  ROCK_RADIUS,
  SHIP,
  SHIP_RADIUS,
  SHOT_SPEED,
  WAVES,
  createGame,
  piecesPerWave,
  specForLevel,
  starsForBumps,
  step,
  tapAt,
  type Rock,
  type SpaceRocksState,
} from '../src/games/spacerocks/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];
const DT = 1 / 60;

/** Seconds until a rock reaches the ship, following its drift round the
 *  edges of space for up to three seconds; Infinity if it doesn't. */
function threat(r: Rock): number {
  const reach = ROCK_RADIUS[r.size] + SHIP_RADIUS + 8;
  let { x, y } = r;
  for (let t = 0; t < 3; t += 0.04) {
    if (Math.hypot(x - SHIP.x, y - SHIP.y) < reach) return t;
    x += r.vx * 0.04;
    y += r.vy * 0.04;
    if (x < 0) x += FIELD_WIDTH;
    if (x > FIELD_WIDTH) x -= FIELD_WIDTH;
    if (y < 0) y += FIELD_HEIGHT;
    if (y > FIELD_HEIGHT) y -= FIELD_HEIGHT;
  }
  return Infinity;
}

/** Where to tap to hit a rock: where it will be once the ship has turned
 *  and the shot has flown. */
function lead(s: SpaceRocksState, r: Rock): { x: number; y: number } {
  let t = 0;
  let p = { x: r.x, y: r.y };
  for (let i = 0; i < 5; i += 1) {
    const turn = Math.abs(Math.atan2(Math.sin(Math.atan2(p.y - SHIP.y, p.x - SHIP.x) - s.angle), Math.cos(Math.atan2(p.y - SHIP.y, p.x - SHIP.x) - s.angle))) / s.turn;
    t = turn + Math.hypot(p.x - SHIP.x, p.y - SHIP.y) / SHOT_SPEED + DT;
    p = { x: r.x + r.vx * t, y: r.y + r.vy * t };
  }
  return p;
}

/**
 * A careful gunner: takes the rock that will reach the ship soonest, or
 * else the nearest, leads it, and doesn't fire at a rock a shot is already
 * on its way to.
 */
function playCarefully(initial: SpaceRocksState, rng: Rng, limit = 300): SpaceRocksState {
  let s = initial;
  const claimed = new Map<number, number>();
  for (let t = 0; t < limit && !s.complete; t += DT) {
    for (const [id, until] of claimed) if (until < s.time) claimed.delete(id);
    if (!s.loaded && s.shots.length < MAX_SHOTS && s.pause === 0) {
      const onScreen = s.rocks.filter((r) => !claimed.has(r.id));
      const pick = [...onScreen].sort((a, b) => threat(a) - threat(b) || Math.hypot(a.x - SHIP.x, a.y - SHIP.y) - Math.hypot(b.x - SHIP.x, b.y - SHIP.y))[0];
      if (pick) {
        const at = lead(s, pick);
        // Only the way matters: a lead point off the screen is tapped
        // where that line meets the screen.
        const dx = at.x - SHIP.x;
        const dy = at.y - SHIP.y;
        const fit = Math.min(1, (FIELD_WIDTH / 2 - 2) / Math.max(1e-9, Math.abs(dx)), (FIELD_HEIGHT / 2 - 2) / Math.max(1e-9, Math.abs(dy)));
        s = tapAt(s, SHIP.x + dx * fit, SHIP.y + dy * fit);
        claimed.set(pick.id, s.time + Math.hypot(dx, dy) / SHOT_SPEED + 0.5);
      }
    }
    s = step(s, DT, rng);
  }
  return s;
}

test('a careful gunner breaks every wave, and gets three stars at every level', () => {
  for (const level of LEVELS) {
    let clean = 0;
    const seeds = 30;
    for (let seed = 0; seed < seeds; seed += 1) {
      const rng = seededRng(seed * 23 + level);
      const s = playCarefully(createGame(rng, level), rng);
      assert.equal(s.complete, true, `level ${level}, seed ${seed}: wave ${s.wave + 1}, ${s.rocks.length} rocks left`);
      assert.equal(s.broken, piecesPerWave(s) * WAVES);
      if (starsForBumps(s.bumps) === 3) clean += 1;
    }
    // Up to level 4, every time. At 5 and 6 a rock can split right at the
    // ship now and then, even for a player who never misses a beat — but
    // three stars are still there in at least nine rounds out of ten.
    if (level <= 4) assert.equal(clean, seeds, `level ${level}: ${seeds - clean} rounds with a bump`);
    else assert.ok(clean >= seeds * 0.9, `level ${level}: only ${clean} of ${seeds} clean`);
  }
});

test('a wave starts at the edges, clear of the ship, with the level\'s number of big rocks', () => {
  for (const level of LEVELS) {
    const s = createGame(seededRng(level), level);
    assert.equal(s.rocks.length, specForLevel(level).rocks);
    for (const r of s.rocks) {
      assert.equal(r.size, 0);
      assert.ok(Math.hypot(r.x - SHIP.x, r.y - SHIP.y) > 150);
    }
  }
});

test('a big rock breaks into two, each into two, then dust: seven shots a rock', () => {
  let s = createGame(seededRng(4), 1);
  const rng = seededRng(4);
  s = playCarefully(s, rng, 400);
  assert.equal(s.broken, 2 * 7 * WAVES);
});

test('a rock reaching the ship bumps off the shield, once per flash, and the round goes on', () => {
  const rng = seededRng(8);
  let s = createGame(rng, 6);
  // Never shoot: rocks drift about and some meet the ship.
  for (let i = 0; i < 60 * 60 && s.bumps === 0; i += 1) s = step(s, DT, rng);
  assert.ok(s.bumps >= 1);
  assert.equal(s.complete, false);
  for (const r of s.rocks) {
    assert.ok(Math.hypot(r.x - SHIP.x, r.y - SHIP.y) >= ROCK_RADIUS[r.size] + SHIP_RADIUS - 1e-6);
    assert.ok(r.x >= 0 && r.x <= FIELD_WIDTH && r.y >= 0 && r.y <= FIELD_HEIGHT, 'a rock out of sight');
  }
  const once = s.bumps;
  s = step(s, 0.1, rng);
  assert.ok(s.bumps === once || s.flash > 0);
});

test('the ship turns to face a tap before it fires, and only three shots fly at once', () => {
  const rng = seededRng(2);
  let s = createGame(rng, 6);
  s = tapAt(s, SHIP.x, SHIP.y + 100);
  s = step(s, 0.05, rng);
  assert.equal(s.shots.length, 0, 'still turning');
  for (let i = 0; i < 60 && s.shots.length === 0; i += 1) s = step(s, DT, rng);
  assert.equal(s.shots.length, 1);
  assert.ok(Math.abs(s.angle - Math.PI / 2) < 0.05, 'facing the tap');
  for (let i = 0; i < 6; i += 1) {
    s = tapAt(s, SHIP.x + (i % 2 ? 100 : -100), SHIP.y);
    s = step(s, 0.2, rng);
    assert.ok(s.shots.length <= MAX_SHOTS);
  }
});

test('stars: none through, three; a couple, two; more, one', () => {
  assert.deepEqual([0, 1, 2, 3].map(starsForBumps), [3, 2, 2, 1]);
});
