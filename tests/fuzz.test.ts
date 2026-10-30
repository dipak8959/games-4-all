import assert from 'node:assert/strict';
import { test } from 'node:test';

import { randInt, seededRng, type Rng } from '../src/util/random.ts';
import * as bricks from '../src/games/bouncebricks/logic.ts';
import * as worm from '../src/games/hungryworm/logic.ts';
import * as peek from '../src/games/peekaboo/logic.ts';
import * as hoop from '../src/games/hoopshot/logic.ts';
import * as landing from '../src/games/softlanding/logic.ts';
import * as tower from '../src/games/talltower/logic.ts';
import * as duck from '../src/games/duckcrossing/logic.ts';
import * as code from '../src/games/codecracker/logic.ts';
import * as clock from '../src/games/clocktime/logic.ts';
import * as rhyme from '../src/games/rhymetime/logic.ts';
import * as market from '../src/games/marketmemory/logic.ts';
import * as count from '../src/games/countaround/logic.ts';
import * as jar from '../src/games/starjar/logic.ts';
import * as team from '../src/games/mazeteam/logic.ts';
import * as echo from '../src/games/echobeat/logic.ts';

/**
 * Random play, a lot of it: a child mashing whatever's on the screen. None
 * of it may break a game's own rules, and every round must still end — the
 * charter's promise that nothing here goes on for ever, held against play
 * no test author would think of.
 */

const LEVELS = [1, 2, 3, 4, 5, 6];
const SEEDS = 12;
const DIRS = ['up', 'right', 'down', 'left'] as const;

const pick = <T>(rng: Rng, items: readonly T[]): T => items[randInt(rng, 0, items.length - 1)];

test('Bounce Bricks: random paddling keeps the ball in the field, and the round ends', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < SEEDS; seed += 1) {
      const rng = seededRng(seed * 31 + level);
      let s = bricks.createGame(rng, level);
      for (let f = 0; f < 60 * 60 * 20 && !s.complete; f += 1) {
        if (rng() < 0.1) s = bricks.movePaddle(s, rng() * bricks.FIELD_WIDTH);
        if (s.resting && rng() < 0.05) s = bricks.serve(s, rng);
        s = bricks.step(s, 1 / 60);
        assert.ok(s.ball.x >= 0 && s.ball.x <= bricks.FIELD_WIDTH, 'the ball left the side');
        assert.ok(s.ball.y >= 0, 'the ball left the top');
        assert.ok(s.ballsLeft >= 0 && s.ballsLeft <= bricks.BALLS_PER_ROUND);
      }
      assert.equal(s.complete, true, `level ${level}, seed ${seed}: never ended`);
    }
  }
});

test('Hungry Worm: random turns never put the worm on a rock, off the board or on itself', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < SEEDS; seed += 1) {
      const rng = seededRng(seed * 37 + level);
      let s = worm.createGame(rng, level);
      for (let f = 0; f < 3000 && !s.complete; f += 1) {
        if (rng() < 0.3) s = worm.turn(s, pick(rng, DIRS));
        s = worm.step(s, s.tick, rng);
        const cells = s.cols * s.rows;
        assert.equal(new Set(s.worm).size, s.worm.length, 'the worm crossed itself');
        assert.ok(s.worm.every((c) => c >= 0 && c < cells), 'off the board');
        assert.ok(s.worm.every((c) => !s.rocks.includes(c)), 'on a rock');
        assert.ok(!s.worm.includes(s.apple) || s.complete, 'the apple is under the worm');
      }
    }
  }
});

test('Peekaboo Pals: random tapping always ends on time, and nothing is counted twice', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < SEEDS; seed += 1) {
      const rng = seededRng(seed * 41 + level);
      let s = peek.start(peek.createGame(rng, level));
      const end = peek.roundLength(s);
      for (let f = 0; f < 60 * 120 && !s.complete; f += 1) {
        if (rng() < 0.2) s = peek.tapHole(s, randInt(rng, 0, s.cols * s.rows - 1));
        s = peek.step(s, 1 / 60);
      }
      assert.equal(s.complete, true);
      assert.ok(s.elapsed <= end + 0.3);
      assert.equal(new Set(s.tapped).size, s.tapped.length);
      assert.ok(peek.missed(s) + s.tapped.length <= peek.PALS_PER_ROUND);
    }
  }
});

test('Hoop Shot: random pulls, ten throws, always over', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < SEEDS; seed += 1) {
      const rng = seededRng(seed * 43 + level);
      let s = hoop.createGame(rng, level);
      for (let f = 0; f < 60 * 120 && !s.complete; f += 1) {
        if (s.phase === 'ready' && rng() < 0.05) {
          s = hoop.aim(s, (rng() - 0.3) * 200, (rng() - 0.7) * 200);
          if (rng() < 0.8) s = hoop.release(s);
        }
        s = hoop.step(s, 1 / 60);
        assert.ok(Number.isFinite(s.ball.x) && Number.isFinite(s.ball.y));
      }
      assert.equal(s.complete, true, `level ${level}, seed ${seed}`);
      assert.ok(s.made.length <= hoop.THROWS_PER_ROUND);
    }
  }
});

test('Soft Landing: random engines, three descents, always down', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < SEEDS; seed += 1) {
      const rng = seededRng(seed * 47 + level);
      let s = landing.createGame(rng, level);
      for (let f = 0; f < 60 * 60 * 3 && !s.complete; f += 1) {
        if (rng() < 0.1) s = landing.setEngine(s, pick(rng, ['up', 'left', 'right'] as const), rng() < 0.6);
        s = landing.step(s, 1 / 60);
        assert.ok(s.rocket.x >= landing.HALF_WIDTH - 1e-9 && s.rocket.x <= landing.FIELD_WIDTH - landing.HALF_WIDTH + 1e-9);
        assert.ok(s.fuel >= 0);
      }
      assert.equal(s.complete, true, `level ${level}, seed ${seed}`);
      assert.equal(s.landings.length, landing.DESCENTS_PER_ROUND);
    }
  }
});

test('Tall Tower: random drops, twelve and done, the tower never wider than it started', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < SEEDS; seed += 1) {
      const rng = seededRng(seed * 53 + level);
      let s = tower.start(tower.createGame(level));
      for (let f = 0; f < 60 * 300 && !s.complete; f += 1) {
        s = tower.step(s, 1 / 60);
        if (rng() < 0.03) s = tower.drop(s);
      }
      assert.equal(s.complete, true);
      assert.equal(s.drops, tower.BLOCKS_PER_ROUND);
      assert.ok(s.tower.every((b) => b.w <= s.startWidth + 1e-9 && b.w > 0));
    }
  }
});

test('Duck Crossing: random hopping stays on the board, and bumps only ever send it back', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < SEEDS; seed += 1) {
      const rng = seededRng(seed * 59 + level);
      let s = duck.createGame(rng, level);
      for (let f = 0; f < 60 * 120 && !s.complete; f += 1) {
        if (rng() < 0.08) s = duck.hop(s, pick(rng, ['up', 'up', 'up', 'left', 'right', 'down'] as const));
        s = duck.step(s, 1 / 60);
        assert.ok(s.duck.row >= 0 && s.duck.row < s.rows.length - 1, 'the duckling is in the pond or off the board');
        assert.ok(s.duck.col >= 0 && s.duck.col < duck.COLS);
        assert.ok(duck.clearAt(s, s.duck.row, s.duck.col, s.time), 'standing under a car');
        assert.ok(s.home <= duck.DUCKS_PER_ROUND);
      }
    }
  }
});

test('Code Cracker, What\'s the Time?, Rhyme Time, Star Jar: random answers always finish', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < SEEDS; seed += 1) {
      const rng = seededRng(seed * 61 + level);
      let c = code.createGame(rng, level);
      for (let i = 0; i < 1000 && !c.complete; i += 1) {
        const r = rng();
        c = r < 0.7 ? code.add(c, randInt(rng, 0, c.symbols - 1)) : r < 0.8 ? code.undo(c) : code.check(c);
      }
      assert.equal(c.complete, true);
      assert.ok(c.guesses.length <= code.MAX_GUESSES);

      let t = clock.createGame(rng, level);
      for (let i = 0; i < 500 && !t.complete; i += 1) t = clock.choose(t, randInt(rng, 0, 4));
      assert.equal(t.complete, true);

      let w = rhyme.createGame(rng, level);
      for (let i = 0; i < 500 && !w.complete; i += 1) w = rhyme.choose(w, randInt(rng, 0, 4));
      assert.equal(w.complete, true);

      let j = jar.createGame(rng, level, ['count', 'add', 'times']);
      for (let i = 0; i < 2000 && !j.complete; i += 1) j = jar.answer(j, pick(rng, j.question.choices), rng, level);
      assert.equal(j.complete, true);
      assert.equal(j.stars, 9);
    }
  }
});

test('Market Memory and Count Around: a sometimes-wrong team still gets there', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < SEEDS; seed += 1) {
      const rng = seededRng(seed * 67 + level);
      let m = market.createGame(rng, level, randInt(rng, 2, 6));
      for (let i = 0; i < 5000 && !m.complete; i += 1) {
        if (m.peeking) m = market.stopPeeking(m);
        else if (m.phase === 'recall' && rng() < 0.8) m = market.pickItem(m, m.bag[m.recalled], rng);
        else m = market.pickItem(m, randInt(rng, 0, m.items.length - 1), rng);
        assert.ok(m.recalled <= m.bag.length && m.bag.length <= m.target);
        assert.ok(m.turn >= 0 && m.turn < m.players);
      }
      assert.equal(m.complete, true);

      let c = count.createGame(rng, level, randInt(rng, 2, 6));
      for (let i = 0; i < 5000 && !c.complete; i += 1) {
        const options: count.Say[] = [...c.numbers, 'clap', 'stomp', 'both'];
        const right = count.whatToSay(c.n, c.rules);
        c = count.say(c, rng() < 0.6 ? right : pick(rng, options), rng);
      }
      assert.equal(c.complete, true);
    }
  }
});

test('Maze Team: random presses never walk through a wall, and wander home in the end', () => {
  for (const level of [1, 2, 3]) {
    for (let seed = 0; seed < SEEDS; seed += 1) {
      const rng = seededRng(seed * 71 + level);
      let s = team.createGame(rng, level, 2);
      for (let i = 0; i < 200000 && !s.complete; i += 1) {
        if (s.done) {
          s = team.nextMaze(s, rng, level);
          continue;
        }
        const before = s.at;
        s = team.step(s, pick(rng, DIRS));
        if (s.at !== before) assert.ok(s.visited.includes(s.at));
      }
      assert.equal(s.complete, true, `level ${level}, seed ${seed}`);
    }
  }
});

test('Echo Beat: random tapping, three tries a beat at most, eight and done', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < SEEDS; seed += 1) {
      const rng = seededRng(seed * 73 + level);
      let s = echo.createGame(level, randInt(rng, 2, 6));
      let t = 0;
      for (let i = 0; i < 5000 && !s.complete; i += 1) {
        if (s.phase === 'show') s = echo.shown(s);
        else {
          t += 50 + rng() * 1500;
          s = echo.tapDrum(s, t);
        }
        assert.ok(s.tries < echo.TRIES_PER_BEAT);
      }
      assert.equal(s.complete, true);
      assert.equal(s.echoes, echo.ECHOES_PER_ROUND);
    }
  }
});
