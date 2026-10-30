import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import { starsForMistakes } from '../src/games/types.ts';
import { FIELD_HEIGHT, FIELD_WIDTH, OUTLINES, PICTURES_PER_ROUND, createGame, dotAt, nextPicture, specForLevel, tapDot } from '../src/games/dottodot/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];

test('a careful child joins every dot in order, closes each picture, and gets three stars', () => {
  for (const level of LEVELS) {
    let s = createGame(seededRng(level * 3), level);
    while (!s.complete) {
      const dots = s.pictures[s.index].dots;
      for (let i = 0; i < dots.length; i += 1) s = tapDot(s, dotAt(s, dots[i].x + 5, dots[i].y - 5) as number);
      assert.equal(s.done, false, 'not done until the line comes back to the first dot');
      s = tapDot(s, 0);
      assert.equal(s.done, true);
      s = nextPicture(s);
    }
    assert.equal(s.mistakes, 0);
    assert.equal(starsForMistakes(s.mistakes), 3);
  }
});

test('dots are numbered in the level\'s steps, in the field, and never crowd each other', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    for (let seed = 0; seed < 10; seed += 1) {
      const s = createGame(seededRng(seed + level * 20), level);
      assert.equal(s.pictures.length, PICTURES_PER_ROUND);
      assert.equal(new Set(s.pictures.map((p) => p.name)).size, PICTURES_PER_ROUND);
      for (const p of s.pictures) {
        assert.equal(p.dots.length, spec.dots);
        p.dots.forEach((d, i) => {
          assert.equal(d.label, spec.step * (i + 1));
          assert.ok(d.x > 10 && d.x < FIELD_WIDTH - 10 && d.y > 10 && d.y < FIELD_HEIGHT - 10);
        });
        for (let i = 0; i < p.dots.length; i += 1) {
          for (let j = i + 1; j < p.dots.length; j += 1) {
            const gap = Math.hypot(p.dots[i].x - p.dots[j].x, p.dots[i].y - p.dots[j].y);
            assert.ok(gap >= 30, `${p.name} at level ${level}: dots ${i + 1} and ${j + 1} only ${gap.toFixed(0)} apart`);
          }
        }
      }
    }
  }
});

test('a wrong dot is one nudge, and the line waits at the right one', () => {
  let s = createGame(seededRng(1), 3);
  s = tapDot(s, 4);
  assert.equal(s.mistakes, 1);
  assert.equal(s.joined, 0);
  s = tapDot(s, 0);
  assert.equal(s.joined, 1);
  // Tapping a dot already joined is nothing.
  assert.equal(tapDot(s, 0), s);
});

test('a tap far from every dot hits none', () => {
  const s = createGame(seededRng(2), 1);
  assert.equal(dotAt(s, -200, -200), null);
  assert.ok(OUTLINES.length >= PICTURES_PER_ROUND * 2);
});
