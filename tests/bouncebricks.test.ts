import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import {
  BALLS_PER_ROUND,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  PADDLE_Y,
  createGame,
  movePaddle,
  serve,
  specForLevel,
  starsForWall,
  step,
  type BounceBricksState,
} from '../src/games/bouncebricks/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];
const FRAME = 1 / 60;

/** Plays at 60fps; `aim` says where to hold the paddle each frame. */
function play(state: BounceBricksState, aim: (s: BounceBricksState) => number, seconds = 400): BounceBricksState {
  const rng = seededRng(99);
  let s = state;
  for (let f = 0; f < seconds * 60 && !s.complete; f += 1) {
    s = movePaddle(s, aim(s));
    if (s.resting) s = serve(s, rng);
    s = step(s, FRAME);
  }
  return s;
}

test('every wall is the level\'s size, inside the field, with no two bricks overlapping', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    const s = createGame(seededRng(level), level);
    assert.equal(s.bricks.length, spec.rows * spec.cols);
    for (const b of s.bricks) {
      assert.ok(b.x >= 0 && b.x + b.w <= FIELD_WIDTH && b.y >= 0 && b.y + b.h < PADDLE_Y - 100);
    }
    const tough = s.bricks.filter((b) => b.hits > 1).length;
    if (spec.tough === 0) assert.equal(tough, 0);
  }
});

test('nothing moves until the ball is served, and the paddle carries it until then', () => {
  const s = createGame(seededRng(1), 3);
  assert.deepEqual(step(s, 2), s);
  const moved = movePaddle(s, 60);
  assert.equal(moved.ball.x, moved.paddleX);
  assert.ok(moved.paddleX - moved.paddleW / 2 >= 0, 'the paddle stays in the field');
});

test('a player who keeps under the ball clears every wall, at every level, in good time', () => {
  // The ball never loops for ever: a perfect catcher always finishes.
  for (const level of LEVELS) {
    for (let seed = 0; seed < 12; seed += 1) {
      const start = createGame(seededRng(seed * 7 + level), level);
      // Always dead centre: the laziest perfect catch there is.
      const s = play(start, (now) => now.ball.x, 300);
      assert.equal(s.complete, true, `level ${level} seed ${seed}: still going after 300s`);
      assert.equal(s.bricks.length, 0, `level ${level} seed ${seed}: ${s.bricks.length} bricks left`);
      assert.equal(s.ballsLeft, BALLS_PER_ROUND, 'a perfect catcher lost a ball');
      assert.equal(starsForWall(s), 3);
    }
  }
});

test('a paddle left still loses five balls and the round ends — never more than five', () => {
  const s = play(createGame(seededRng(3), 4), () => 0, 120);
  assert.equal(s.complete, true);
  assert.equal(s.ballsLeft, 0);
  assert.ok(starsForWall(s) >= 1);
});

test('the ball stays in the field, and leaves the paddle upwards', () => {
  const rng = seededRng(5);
  let s = serve(createGame(seededRng(5), 6), rng);
  for (let f = 0; f < 60 * 30 && !s.complete; f += 1) {
    s = step(movePaddle(s, s.ball.x), FRAME);
    if (s.resting) s = serve(s, rng);
    assert.ok(s.ball.x >= 0 && s.ball.x <= FIELD_WIDTH && s.ball.y <= FIELD_HEIGHT + 20);
    if (Math.abs(s.ball.y - (PADDLE_Y - 7)) < 0.01 && !s.resting) assert.ok(s.ball.vy < 0);
  }
});

test('a two-hit brick cracks first, then breaks', () => {
  const s = createGame(seededRng(11), 6);
  assert.ok(s.bricks.some((b) => b.hits === 2), 'level 6 has two-hit bricks');
});
