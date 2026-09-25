import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';

import { GAMES_META } from '../src/games/catalog.ts';
import { HELP, helpFor } from '../src/games/help.ts';
import { seededRng } from '../src/util/random.ts';
import { createGame, showAgain, startShuffle } from '../src/games/whichcup/logic.ts';

test('every game has "How to play": a goal, steps, and how it grows', () => {
  for (const game of GAMES_META) {
    const help = helpFor(game.id);
    assert.ok(help, `${game.title} has no "How to play"`);
    assert.ok(help.goal.length > 10, `${game.title}: no goal`);
    assert.ok(help.steps.length >= 2, `${game.title}: fewer than two steps`);
    assert.ok(help.grows.length > 10, `${game.title}: doesn't say how it grows`);
  }
  // Nothing written for a game that isn't in the catalogue.
  const ids = new Set(GAMES_META.map((g) => g.id));
  for (const id of Object.keys(HELP)) assert.ok(ids.has(id), `help for "${id}", which is not a game`);
});

test('the help never talks about scores, bests, lives or clocks', () => {
  // The same things the charter keeps out of the games keep out of the words
  // about them.
  const banned = /\b(score|high score|best|record|streak|lives|timer|timed|hurry|quick|game over|lose|win)\b/i;
  for (const [id, help] of Object.entries(HELP)) {
    for (const text of [help.goal, ...help.steps, help.example ?? '', help.grows]) {
      assert.doesNotMatch(text, banned, `${id}: "${text}"`);
    }
  }
});

test('every game with a clock stops it while "How to play" is open', () => {
  // Anything that moves on its own, or shows something for a set time, must
  // read the pause — otherwise reading the help costs a run or a pattern.
  const clocked = /requestAnimationFrame|REVEAL_|showMs|SHOW_MS/;
  const dirs = readdirSync('src/games', { withFileTypes: true }).filter((d) => d.isDirectory());
  let checked = 0;
  for (const dir of dirs) {
    const screen = readdirSync(`src/games/${dir.name}`).find((f) => f.endsWith('Screen.tsx'));
    if (!screen) continue;
    const source = readFileSync(`src/games/${dir.name}/${screen}`, 'utf8');
    if (!clocked.test(source)) continue;
    checked += 1;
    assert.match(source, /useGamePaused\(\)/, `${screen} has a clock but doesn't pause for "How to play"`);
  }
  assert.ok(checked >= 6, `only ${checked} clocked games found`);
});

test('Which Cup? shows the ball again after a pause mid-shuffle', () => {
  const shuffling = startShuffle(createGame(seededRng(1), 3));
  assert.equal(shuffling.phase, 'shuffle');
  const again = showAgain(shuffling);
  assert.equal(again.phase, 'show');
  assert.deepEqual(again.question, shuffling.question, 'the same question, not a new one');
  const choosing = { ...shuffling, phase: 'choose' as const };
  assert.equal(showAgain(choosing), choosing, 'nothing to show again once the cups have stopped');
});
