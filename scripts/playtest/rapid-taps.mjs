/**
 * Pass 3: children do not tap once.
 *
 * They tap five times, fast, on whatever is biggest. None of that may count
 * twice: five taps on a correct answer must answer one question rather than
 * racing through five, and five taps on "Play again" must record one finished
 * round rather than five — a miscount there lands straight in the grown-up's
 * progress summary and in the adaptive level.
 *
 * See harness.mjs for how to run this.
 */
import {
  openApp,
  openGame,
  passParentGate,
  reporter,
  roundResult,
  summarise,
} from './harness.mjs';
import { playCounting } from './players.mjs';

const report = reporter();
const { browser, page, errors } = await openApp();

/** Real mouse clicks at one point, back to back — `locator.click()` waits for
 *  stability between calls, which is precisely what we're trying to defeat. */
async function hammer(locator, times = 5) {
  const box = await locator.boundingBox();
  for (let i = 0; i < times; i += 1) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { delay: 5 });
  }
}

console.log('How Many? — five fast taps on one correct answer');
if (!(await openGame(page, 'How Many?'))) {
  report.bug('How Many?', 'not reachable from Home');
} else {
  const stage = await page.getByLabel(/\d+ objects to count/).first().getAttribute('aria-label');
  const count = parseInt(stage.match(/\d+/)[0], 10);
  await hammer(page.getByLabel(String(count), { exact: true }).first());
  await page.waitForTimeout(900);
  if (await roundResult(page)) {
    report.bug('How Many?', 'five taps on a single answer ended the whole round');
  } else {
    report.ok('five taps advanced one question, not five');
  }

  await playCounting(page, report);
  if (!(await roundResult(page))) {
    report.bug('How Many?', 'could not finish a round');
  } else {
    console.log('\nRound complete — five fast taps on "Play again"');
    await hammer(page.getByLabel('Play again').first());
    await page.waitForTimeout(1400);
    if (await roundResult(page)) report.bug('How Many?', '"Play again" was still up after five taps');
    else report.ok('a fresh round started');
    await page.getByLabel('Back to games').click();
    await page.waitForTimeout(900);

    // Exactly one round was finished. The second was abandoned, so it should
    // not be counted, and neither should the extra taps on "Play again".
    await page.getByLabel('Parent zone, grown-ups only').click();
    await page.waitForTimeout(600);
    await passParentGate(page);
    for (let i = 0; i < 8; i += 1) {
      await page.mouse.wheel(0, 700);
      await page.waitForTimeout(160);
    }
    const lines = (await page.locator('body').innerText()).split('\n');
    const row = lines.findIndex((l) => l.trim() === 'How Many?');
    const meta = lines.slice(row, row + 5).join(' ');
    const rounds = Number((meta.match(/(\d+)\s+ROUNDS?/) ?? [])[1]);
    if (rounds === 1) report.ok('the Parent Zone records exactly one round');
    else report.bug('How Many?', `the Parent Zone records ${rounds} rounds after one: "${meta.trim()}"`);
  }
}

const code = summarise(report, errors);
await browser.close();
process.exit(code);
