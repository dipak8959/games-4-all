/**
 * Pass 1: play every game in the catalogue through to the end.
 *
 * A round that completes proves the whole chain works — the board renders,
 * the labels describe it truthfully enough to play from, the rules accept a
 * correct answer, the round ends, stars are awarded, "Play again" deals a
 * fresh round and "Back to games" gets out. Progress is then checked in the
 * Parent Zone, because a round that is played but not recorded is a round the
 * grown-up never sees.
 *
 * See harness.mjs for how to run this.
 */
import {
  backHome,
  openApp,
  openGame,
  passParentGate,
  reporter,
  setAge,
  summarise,
  waitForRound,
} from './harness.mjs';
import { PLAYERS } from './players.mjs';

const report = reporter();
const { browser, page, errors } = await openApp();

/** Plays one game, then makes sure we are back on Home whatever happened —
 *  otherwise one stuck game makes every game after it look unreachable. */
async function play(title) {
  console.log(`\n${title}`);
  if (!(await openGame(page, title))) {
    report.bug(title, 'not reachable from Home');
    return;
  }
  try {
    await PLAYERS[title](page, report);
    const result = await waitForRound(page);
    if (!result) {
      report.bug(title, 'played every move but the round never completed');
    } else {
      report.ok(`round completed, ${result.stars} star${result.stars === 1 ? '' : 's'}`);
      if (result.stars < 1) {
        report.bug(title, 'finished a round with zero stars — every round should earn at least one');
      }
      await page.getByLabel('Play again').click();
      await page.waitForTimeout(1400);
      if (await page.getByLabel('Play again').count()) {
        report.bug(title, '"Play again" did not start a new round');
      } else {
        report.ok('"Play again" started a fresh round');
      }
    }
  } catch (e) {
    report.bug(title, `threw while playing: ${e.message}`);
  }
  await backHome(page, report, title);
}

console.log('Playing every game.\n=== ages 3-6 ===');
await play('Find the Pairs');
await play('How Many?');
await play('Sort It Out');

console.log('\n=== age 9 ===');
await setAge(page, 9);
await play('Spell It!');
await play('Pattern Play');
await play('Number Crunch');
await play('Sudoku');

console.log('\nParent Zone');
await page.getByLabel('Parent zone, grown-ups only').click();
await page.waitForTimeout(500);
await passParentGate(page);
for (let i = 0; i < 8; i += 1) {
  await page.mouse.wheel(0, 700);
  await page.waitForTimeout(180);
}
const lines = (await page.locator('body').innerText()).split('\n');
for (const title of ['Spell It!', 'Sudoku', 'Pattern Play', 'Number Crunch']) {
  const row = lines.findIndex((l) => l.trim() === title);
  const meta = lines.slice(row, row + 4).join(' ');
  if (/\b0 ROUNDS\b/.test(meta)) {
    report.bug(title, `Parent Zone still shows 0 rounds after playing: ${meta.trim()}`);
  }
}

const code = summarise(report, errors);
await browser.close();
process.exit(code);
