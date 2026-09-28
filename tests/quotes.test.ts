import assert from 'node:assert/strict';
import { test } from 'node:test';

import { QUOTES, nextQuote } from '../src/components/quotes.ts';

test('every quote is short, attributed, and about effort rather than beating anyone', () => {
  assert.ok(QUOTES.length >= 12);
  for (const q of QUOTES) {
    assert.ok(q.text.length > 0 && q.text.length <= 110, `too long for a phone: ${q.text}`);
    assert.ok(q.who.trim() && q.sport.trim(), `unattributed: ${q.text}`);
    // Nothing that would put a score, a best or a streak back in.
    assert.doesNotMatch(q.text, /\b(score|best|record|streak|lives|leaderboard|number one)\b/i, q.text);
  }
  assert.equal(new Set(QUOTES.map((q) => q.text)).size, QUOTES.length, 'a quote is listed twice');
});

test('the same quote never comes twice running', () => {
  let last = nextQuote();
  for (let i = 0; i < QUOTES.length * 2; i += 1) {
    const now = nextQuote();
    assert.notEqual(now.text, last.text);
    last = now;
  }
});
