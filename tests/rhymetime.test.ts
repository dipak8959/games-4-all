import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import { starsForMistakes } from '../src/games/types.ts';
import { GROUPS, TRAP_ONLY } from '../src/games/rhymetime/words.ts';
import {
  RHYMES_PER_ROUND,
  choose,
  createGame,
  ending,
  groupOf,
  rhymes,
  specForLevel,
} from '../src/games/rhymetime/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];

test('every word is in exactly one rhyme group, and look-alikes never rhyme with theirs', () => {
  const seen = new Map<string, string>();
  for (const g of GROUPS) {
    assert.ok(g.words.length >= 2, `${g.id} has nothing to rhyme with`);
    for (const w of g.words) {
      assert.match(w, /^[a-z]+$/);
      assert.ok(!seen.has(w), `"${w}" is in both ${seen.get(w)} and ${g.id}`);
      seen.set(w, g.id);
    }
  }
  for (const w of TRAP_ONLY) assert.ok(!seen.has(w), `"${w}" is a trap and also in a group`);
  for (const g of GROUPS) {
    for (const t of g.traps ?? []) {
      assert.ok(!g.words.includes(t), `${g.id}'s trap "${t}" is in its own group`);
      assert.ok(seen.has(t) || TRAP_ONLY.includes(t), `trap "${t}" is nowhere`);
    }
  }
});

test('every question has exactly one rhyme among its choices, never the word itself', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    for (let seed = 0; seed < 80; seed += 1) {
      const s = createGame(seededRng(seed * 13 + level), level);
      assert.equal(s.questions.length, RHYMES_PER_ROUND);
      assert.equal(new Set(s.questions.map((q) => q.prompt)).size, RHYMES_PER_ROUND, 'a word asked twice');
      for (const q of s.questions) {
        assert.equal(q.choices.length, spec.choices);
        assert.equal(new Set(q.choices).size, q.choices.length);
        assert.ok(!q.choices.includes(q.prompt));
        assert.deepEqual(
          q.choices.map((c) => rhymes(q.prompt, c)),
          q.choices.map((_, i) => i === q.answer),
          `level ${level}: ${q.prompt} → ${q.choices.join(', ')}`,
        );
        assert.ok(groupOf(q.prompt)!.tier <= spec.tier);
      }
    }
  }
});

test('the rhyme is in the spelling at first, and not later', () => {
  const differently = (level: number) => {
    let n = 0;
    let all = 0;
    for (let seed = 0; seed < 40; seed += 1) {
      for (const q of createGame(seededRng(seed), level).questions) {
        all += 1;
        if (ending(q.prompt) !== ending(q.choices[q.answer])) n += 1;
      }
    }
    return n / all;
  };
  assert.equal(differently(1), 0);
  assert.equal(differently(2), 0);
  assert.equal(differently(3), 0);
  assert.ok(differently(4) > 0.3);
});

test('from level 3 a word starting the same tempts the eye; from level 5 a look-alike does', () => {
  let tempted = 0;
  for (let seed = 0; seed < 40; seed += 1) {
    for (const q of createGame(seededRng(seed), 3).questions) {
      if (q.choices.some((c, i) => i !== q.answer && c[0] === q.prompt[0])) tempted += 1;
    }
  }
  assert.ok(tempted > 300, `only ${tempted} of 400`);
  let looks = 0;
  let trapGroups = 0;
  for (let seed = 0; seed < 40; seed += 1) {
    for (const q of createGame(seededRng(seed), 5).questions) {
      const traps = groupOf(q.prompt)!.traps;
      if (!traps) continue;
      trapGroups += 1;
      if (q.choices.some((c) => traps.includes(c))) looks += 1;
    }
  }
  assert.ok(trapGroups > 50);
  assert.equal(looks, trapGroups);
  const two = createGame(seededRng(1), 6).questions.some((q) => groupOf(q.prompt)!.tier === 6);
  assert.ok(two, 'two-syllable words at level 6');
});

test('a wrong word is ruled out once; ten rhymes end the round', () => {
  let s = createGame(seededRng(2), 2);
  const q = s.questions[0];
  const wrong = q.choices.findIndex((_, i) => i !== q.answer);
  s = choose(s, wrong);
  assert.equal(s.mistakes, 1);
  assert.equal(choose(s, wrong), s);
  while (!s.complete) s = choose(s, s.questions[s.index].answer);
  assert.equal(s.index, RHYMES_PER_ROUND);
  assert.equal(starsForMistakes(s.mistakes), 2);
});
