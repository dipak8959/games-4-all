import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import { starsForMistakes } from '../src/games/types.ts';
import { ROWS, RULES, choose, createGame, fitsARule, rowNow, specForLevel } from '../src/games/numberpatterns/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];

test('every row follows its rule, and no wrong choice fits a rule too', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    for (let seed = 0; seed < 60; seed += 1) {
      const s = createGame(seededRng(seed * 7 + level), level);
      assert.equal(s.rows.length, ROWS);
      for (const row of s.rows) {
        assert.ok(RULES.indexOf(row.rule) < spec.rules, `level ${level}: ${row.rule} too early`);
        assert.ok(fitsARule(row.terms), `${row.rule}: ${row.terms.join(', ')}`);
        assert.ok(row.terms.every((n) => Number.isInteger(n) && n > 0 && n < 1000), row.terms.join(', '));
        assert.equal(row.choices.length, spec.choices);
        assert.equal(new Set(row.choices).size, row.choices.length);
        assert.ok(row.choices.includes(row.terms[row.gap]));
        if (!spec.anywhere) assert.equal(row.gap, row.terms.length - 1);
        for (const c of row.choices) {
          if (c === row.terms[row.gap]) continue;
          assert.ok(c > 0);
          assert.ok(!fitsARule(row.terms.map((t, i) => (i === row.gap ? c : t))), `${c} also fits ${row.terms.join(', ')}`);
        }
      }
    }
  }
});

test('every rule the level allows comes up in its round', () => {
  for (const level of LEVELS) {
    const s = createGame(seededRng(level), level);
    const seen = new Set(s.rows.map((r) => r.rule));
    assert.equal(seen.size, specForLevel(level).rules);
  }
});

test('a careful player fills every gap first time; a wrong number is ruled out', () => {
  for (const level of LEVELS) {
    let s = createGame(seededRng(level + 40), level);
    const first = rowNow(s);
    const wrong = first.choices.findIndex((c) => c !== first.terms[first.gap]);
    s = choose(s, wrong);
    assert.equal(s.mistakes, 1);
    assert.deepEqual(s.ruledOut, [wrong]);
    assert.equal(choose(s, wrong), s);
    while (!s.complete) {
      const row = rowNow(s);
      s = choose(s, row.choices.indexOf(row.terms[row.gap]));
    }
    assert.equal(s.index, ROWS);
    assert.equal(starsForMistakes(s.mistakes), 2);
  }
});
