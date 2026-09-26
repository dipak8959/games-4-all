import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  accrue,
  dayKey,
  emptyUsage,
  endSession,
  evaluate,
  isInWindDown,
  MINUTE_MS,
  rolloverIfNeeded,
  formatMinutes,
} from '../src/safety/screenTime.ts';

const at = (iso: string) => new Date(iso);

test('no limits configured means play is never blocked', () => {
  const usage = { day: dayKey(at('2026-01-01T10:00:00')), playedTodayMs: 10 * 60 * MINUTE_MS, sessionMs: 99 * MINUTE_MS };
  const verdict = evaluate(usage, { dailyLimitMs: null, sessionLimitMs: null });
  assert.deepEqual(verdict, { kind: 'ok', remainingMs: null });
});

test('session limit blocks exactly at the boundary, not a tick later', () => {
  const usage = { day: '2026-01-01', playedTodayMs: 0, sessionMs: 15 * MINUTE_MS };
  assert.equal(evaluate(usage, { dailyLimitMs: null, sessionLimitMs: 15 * MINUTE_MS }).kind, 'session-over');
});

test('daily limit takes precedence over session limit', () => {
  const usage = { day: '2026-01-01', playedTodayMs: 60 * MINUTE_MS, sessionMs: 60 * MINUTE_MS };
  const verdict = evaluate(usage, { dailyLimitMs: 30 * MINUTE_MS, sessionLimitMs: 30 * MINUTE_MS });
  assert.equal(verdict.kind, 'daily-over');
});

test('remaining time reports the nearer of the two limits', () => {
  const usage = { day: '2026-01-01', playedTodayMs: 20 * MINUTE_MS, sessionMs: 5 * MINUTE_MS };
  const verdict = evaluate(usage, { dailyLimitMs: 30 * MINUTE_MS, sessionLimitMs: 10 * MINUTE_MS });
  assert.deepEqual(verdict, { kind: 'ok', remainingMs: 5 * MINUTE_MS });
});

test('a backwards clock jump cannot consume the daily allowance', () => {
  const usage = emptyUsage(at('2026-01-01T10:00:00'));
  const next = accrue(usage, -60 * MINUTE_MS, at('2026-01-01T10:00:00'));
  assert.equal(next.playedTodayMs, 0);
});

test('an absurd forward jump is clamped rather than charged in full', () => {
  const usage = emptyUsage(at('2026-01-01T10:00:00'));
  const next = accrue(usage, 6 * 60 * MINUTE_MS, at('2026-01-01T10:00:00'));
  assert.equal(next.playedTodayMs, 5 * MINUTE_MS);
});

test('crossing midnight resets the daily total but not the current sitting', () => {
  const usage = { day: '2026-01-01', playedTodayMs: 40 * MINUTE_MS, sessionMs: 12 * MINUTE_MS };
  const next = accrue(usage, MINUTE_MS, at('2026-01-02T00:00:30'));
  assert.equal(next.day, '2026-01-02');
  assert.equal(next.playedTodayMs, MINUTE_MS, 'daily total restarts');
  assert.equal(next.sessionMs, 13 * MINUTE_MS, 'the sitting continues uninterrupted');
});

test('rollover clears yesterday totals on a new day', () => {
  const stale = { day: '2026-01-01', playedTodayMs: 45 * MINUTE_MS, sessionMs: 20 * MINUTE_MS };
  const fresh = rolloverIfNeeded(stale, at('2026-01-02T08:00:00'));
  assert.deepEqual(fresh, { day: '2026-01-02', playedTodayMs: 0, sessionMs: 0 });
});

test('rollover leaves same-day usage untouched', () => {
  const usage = { day: dayKey(at('2026-01-01T08:00:00')), playedTodayMs: 5, sessionMs: 5 };
  assert.equal(rolloverIfNeeded(usage, at('2026-01-01T20:00:00')), usage);
});

test('ending a session keeps the day total', () => {
  const usage = { day: '2026-01-01', playedTodayMs: 30 * MINUTE_MS, sessionMs: 10 * MINUTE_MS };
  assert.deepEqual(endSession(usage), { day: '2026-01-01', playedTodayMs: 30 * MINUTE_MS, sessionMs: 0 });
});

test('wind-down warning fires only inside the window and only while ok', () => {
  assert.equal(isInWindDown({ kind: 'ok', remainingMs: 90 * 1000 }), true);
  assert.equal(isInWindDown({ kind: 'ok', remainingMs: 10 * MINUTE_MS }), false);
  assert.equal(isInWindDown({ kind: 'ok', remainingMs: null }), false);
  assert.equal(isInWindDown({ kind: 'daily-over' }), false);
});

test('dayKey is local-calendar based, not UTC', () => {
  assert.equal(dayKey(new Date(2026, 0, 5, 23, 30)), '2026-01-05');
});

test('formatMinutes reads naturally for parents', () => {
  assert.equal(formatMinutes(0), '0 min');
  assert.equal(formatMinutes(90 * 1000), '2 min');
  assert.equal(formatMinutes(60 * MINUTE_MS), '1 hr');
  assert.equal(formatMinutes(95 * MINUTE_MS), '1 hr 35 min');
});
