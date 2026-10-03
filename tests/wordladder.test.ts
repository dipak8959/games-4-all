import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import { FOUR, THREE } from '../src/games/wordladder/words.ts';
import {
  LADDERS_PER_ROUND,
  choose,
  createGame,
  createLadder,
  distancesTo,
  nextLadder,
  specForLevel,
  type WordLadderState,
} from '../src/games/wordladder/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];
const apart = (a: string, b: string) => [...a].filter((ch, i) => b[i] !== ch).length;

test('the word lists are clean: lower case, the right length, no repeats', () => {
  for (const [list, length] of [
    [THREE, 3],
    [FOUR, 4],
  ] as const) {
    assert.equal(new Set(list).size, list.length, 'a word listed twice');
    for (const w of list) assert.match(w, new RegExp(`^[a-z]{${length}}$`), w);
  }
});

test('every ladder is the level\'s length, a real word at every step, one letter at a time', () => {
  const words = new Set([...THREE, ...FOUR]);
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    for (let seed = 0; seed < 150; seed += 1) {
      const { path, rungs } = createLadder(seededRng(seed * 17 + level), level);
      assert.equal(path.length, spec.steps + 1);
      assert.equal(rungs.length, spec.steps);
      assert.equal(new Set(path).size, path.length, 'a word on the ladder twice');
      for (const w of path) {
        assert.equal(w.length, spec.length);
        assert.ok(words.has(w), `${w} is not on the hand-picked list`);
      }
      for (let i = 1; i < path.length; i += 1) assert.equal(apart(path[i - 1], path[i]), 1);
      // No shortcut: the start really is that many steps from the goal.
      assert.equal(distancesTo(path[path.length - 1]).get(path[0]), spec.steps);
    }
  }
});

test('every rung offers the level\'s number of real words, exactly one of them a step closer', () => {
  const words = new Set([...THREE, ...FOUR]);
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    for (let seed = 0; seed < 100; seed += 1) {
      const { path, rungs } = createLadder(seededRng(seed * 5 + 1000 + level), level);
      const dist = distancesTo(path[path.length - 1]);
      rungs.forEach((rung, i) => {
        const from = path[i];
        const here = dist.get(from) as number;
        assert.equal(rung.choices.length, spec.choices);
        assert.equal(new Set(rung.choices).size, rung.choices.length);
        assert.equal(rung.answer, path[i + 1]);
        for (const w of rung.choices) {
          assert.ok(words.has(w), `${w} is not on the hand-picked list`);
          assert.equal(apart(from, w), 1, `${w} is not one letter from ${from}`);
        }
        const closer = rung.choices.filter((w) => (dist.get(w) ?? Infinity) < here);
        assert.deepEqual(closer, [rung.answer], `more than one right answer from ${from}`);
      });
    }
  }
});

test('the wrong words get more tempting as the levels go up', () => {
  // Share of wrong words that go sideways — no further from the goal than
  // where the player stands — rather than obviously backwards.
  const sideways = (level: number) => {
    let side = 0;
    let all = 0;
    for (let seed = 0; seed < 150; seed += 1) {
      const { path, rungs } = createLadder(seededRng(seed + 3000), level);
      const dist = distancesTo(path[path.length - 1]);
      rungs.forEach((rung, i) => {
        for (const w of rung.choices) {
          if (w === rung.answer) continue;
          all += 1;
          if (dist.get(w) === dist.get(path[i])) side += 1;
        }
      });
    }
    return side / all;
  };
  assert.ok(sideways(4) > sideways(3), 'level 4 adds sideways words');
  assert.ok(sideways(6) > sideways(5), 'level 6 is mostly sideways words');
});

function climb(state: WordLadderState): WordLadderState {
  let s = state;
  while (!s.done) s = choose(s, s.ladder.rungs[s.step].answer);
  return s;
}

test('a wrong word is one mistake, dimmed and never charged twice', () => {
  const s = createGame(seededRng(4), 5);
  const rung = s.ladder.rungs[0];
  const wrong = rung.choices.find((w) => w !== rung.answer) as string;
  const once = choose(s, wrong);
  assert.equal(once.mistakes, 1);
  assert.deepEqual(once.ruledOut, [wrong]);
  assert.equal(choose(once, wrong), once);
  assert.equal(choose(once, 'zzzz'), once, 'a word that was not offered does nothing');
});

test('three ladders climbed end the round, and the next ladder is a new one', () => {
  const rng = seededRng(6);
  let s = createGame(seededRng(6), 3);
  for (let i = 0; i < LADDERS_PER_ROUND; i += 1) {
    assert.equal(s.complete, false);
    const before = s.ladder.path;
    s = climb(s);
    assert.equal(choose(s, s.ladder.rungs[0].answer), s, 'nothing moves while the climbed ladder shows');
    s = nextLadder(s, rng, 3);
    if (!s.complete) {
      assert.equal(s.step, 0);
      assert.ok(!before.includes(s.ladder.path[s.ladder.path.length - 1]), 'the same goal again');
    }
  }
  assert.equal(s.complete, true);
  assert.equal(s.mistakes, 0);
});
