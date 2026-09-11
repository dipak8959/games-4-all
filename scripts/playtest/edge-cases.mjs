/**
 * Pass 2: the states ordinary play never reaches.
 *
 * Every game at its gentlest and at its hardest — a 3-year-old's board and a
 * 17-year-old's, which is a 4x4 memory grid at one end and a 9x9 Sudoku and
 * an eight-step sequence at the other. Then the things a child does that a
 * test script wouldn't: answering wrong on purpose, tapping tiles that
 * shouldn't be tappable yet, and walking out of a round half-finished.
 *
 * See harness.mjs for how to run this.
 */
import {
  backHome,
  openApp,
  openGame,
  reporter,
  roundResult,
  setAge,
  summarise,
  waitForRound,
} from './harness.mjs';
import { PLAYERS, playPatternPlay } from './players.mjs';

const report = reporter();
const { browser, page, errors } = await openApp();

async function round(title, band) {
  const where = `${title} @ ${band}`;
  console.log(`\n${where}`);
  if (!(await openGame(page, title))) {
    report.bug(where, 'not reachable from Home');
    return;
  }
  try {
    await PLAYERS[title](page, report);
    const result = await waitForRound(page);
    if (!result) report.bug(where, 'played every move but the round never completed');
    else report.ok(`round completed, ${result.stars} star${result.stars === 1 ? '' : 's'}`);
  } catch (e) {
    report.bug(where, `threw while playing: ${e.message}`);
  }
  await backHome(page, report, where);
}

/** What Home is offering right now, by game title. */
async function listed() {
  const titles = [];
  for (const tile of await page.getByLabel(/^[^.]+\. /).all()) {
    titles.push((await tile.getAttribute('aria-label')).split('.')[0]);
  }
  return [...new Set(titles)].filter((t) => !/^Explorer/.test(t));
}

console.log('=== age 3: every game at its gentlest ===');
await setAge(page, 3);
report.ok(`Home lists: ${(await listed()).join(', ')}`);
for (const title of ['Find the Pairs', 'How Many?', 'Sort It Out']) await round(title, 'age 3');

console.log('\n=== age 17: every game at full difficulty ===');
await setAge(page, 17);
for (let i = 0; i < 6; i += 1) {
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(150);
}
report.ok(`Home lists: ${(await listed()).join(', ')}`);
for (const title of ['Pattern Play', 'Number Crunch', 'Sudoku']) await round(title, 'age 17');

console.log('\n=== getting it wrong on purpose ===');
await setAge(page, 9);
if (await openGame(page, 'Number Crunch')) {
  const sum = await page.getByLabel(/^\d+ [-+×÷−] \d+$/).first().getAttribute('aria-label');
  const [, a, op, b] = sum.match(/^(\d+) ([-+×÷−]) (\d+)$/);
  const [x, y] = [Number(a), Number(b)];
  const right = op === '+' ? x + y : op === '×' ? x * y : op === '÷' ? x / y : x - y;
  const offered = [];
  for (const c of await page.getByRole('button').all()) {
    const label = await c.getAttribute('aria-label');
    if (/^\d+$/.test(label ?? '')) offered.push(label);
  }
  const wrong = offered.find((v) => Number(v) !== right);
  await page.getByLabel(wrong, { exact: true }).first().click();
  await page.waitForTimeout(500);

  const now = await page.getByLabel(/^\d+ [-+×÷−] \d+$/).first().getAttribute('aria-label');
  if (now !== sum) {
    report.bug('Number Crunch', 'a wrong answer moved on instead of letting the child try again');
  } else {
    report.ok('a wrong answer keeps the same question on screen');
  }
  if (await page.getByLabel(wrong, { exact: true }).first().isEnabled()) {
    report.bug('Number Crunch', `the ruled-out choice ${wrong} is still tappable`);
  } else {
    report.ok('a ruled-out choice is disabled, not merely dimmed');
  }
  await backHome(page, report, 'Number Crunch');
}

if (await openGame(page, 'Pattern Play')) {
  if (await page.getByLabel(/ tile$/).first().isEnabled()) {
    report.bug('Pattern Play', 'tiles are tappable while the pattern is still being shown');
  } else {
    report.ok('tiles are inert during the reveal');
  }
  await playPatternPlay(page, report);
  if (await waitForRound(page, 3000)) {
    report.ok('a correctly repeated sequence completes the round');
  } else {
    report.bug('Pattern Play', 'repeating the sequence correctly did not complete the round');
  }
  await backHome(page, report, 'Pattern Play');
}

console.log('\n=== leaving a round part-way through ===');
if (await openGame(page, 'Number Crunch')) {
  const first = await page.getByLabel(/^\d+ [-+×÷−] \d+$/).first().getAttribute('aria-label');
  await page.getByLabel('Back to games').click();
  await page.waitForTimeout(800);
  if (!(await page.getByText('ON THIS DEVICE').count())) {
    report.bug('Number Crunch', 'the back control did not leave the game');
  } else {
    report.ok('a round can be abandoned at any time');
  }
  if (await openGame(page, 'Number Crunch')) {
    if (await page.getByLabel(/^\d+ [-+×÷−] \d+$/).count()) {
      report.ok(`reopening deals a fresh round (the abandoned one was "${first}")`);
    } else {
      report.bug('Number Crunch', 'reopening after abandoning did not deal a new question');
    }
    await backHome(page, report, 'Number Crunch');
  }
}

// Nothing above should have left a round-complete card hanging around.
if (await roundResult(page)) report.bug('chrome', 'a round-complete card survived returning to Home');

const code = summarise(report, errors);
await browser.close();
process.exit(code);
