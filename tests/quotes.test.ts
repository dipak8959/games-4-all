import assert from 'node:assert/strict';
import { test } from 'node:test';

import { QUOTES, SHORT_QUOTES, nextQuote, nextShortQuote } from '../src/components/quotes.ts';

/** Never in a quote a child reads between rounds. */
const NEVER = [
  // a score, a best, a streak: things to chase
  'score', 'best', 'record', 'streak', 'leaderboard', 'number one',
  // swearing, violence, drink, faith and the like
  'hell', 'damn', 'kill', 'dead', 'death', 'die', 'blood', 'hate', 'war', 'gun', 'beer', 'drunk', 'god', 'pray', 'sex', 'stupid',
];
/** Well-known sportspeople left out on purpose, for the scandals they are
 *  known for as much as their sport. */
const LEFT_OUT = ['Kobe Bryant', 'Lance Armstrong', 'Tiger Woods', 'Mike Tyson', 'Pete Rose', 'O. J. Simpson', 'Diego Maradona', 'Oscar Pistorius', 'Joe Paterno'];

test('there are plenty of quotes, each short enough, attributed, and listed once', () => {
  assert.ok(QUOTES.length >= 150, `${QUOTES.length} quotes`);
  for (const q of QUOTES) {
    assert.ok(q.text.length > 0 && q.text.length <= 160, `too long for a phone: ${q.text}`);
    assert.ok(q.who.trim() && q.sport.trim(), `unattributed: ${q.text}`);
  }
  assert.equal(new Set(QUOTES.map((q) => q.text)).size, QUOTES.length, 'a quote is listed twice');
});

test('nothing in a quote a parent would wince at, and no one left out on purpose', () => {
  for (const q of QUOTES) {
    for (const word of NEVER) {
      assert.doesNotMatch(q.text, new RegExp(`\\b${word}\\b`, 'i'), `"${word}" in: ${q.text}`);
    }
    assert.ok(!LEFT_OUT.includes(q.who), `${q.who} is left out on purpose`);
  }
});

test('enough short ones for the line at the top of a game', () => {
  assert.ok(SHORT_QUOTES.length >= 60, `${SHORT_QUOTES.length} short quotes`);
  for (const q of SHORT_QUOTES) assert.ok(q.text.length + q.who.length <= 78);
});

test('the same quote never comes twice running', () => {
  for (const next of [nextQuote, nextShortQuote]) {
    let last = next();
    for (let i = 0; i < QUOTES.length * 2; i += 1) {
      const now = next();
      assert.notEqual(now.text, last.text);
      last = now;
    }
  }
});
