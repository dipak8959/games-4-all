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
import { PLAYERS, playPatternPlay, watchPattern } from './players.mjs';

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
for (const title of ['Find the Pairs', 'How Many?', 'Sort It Out', 'Odd One Out']) await round(title, 'age 3');
await setAge(page, 4);
await round('Puddle Hop', 'age 4');
await setAge(page, 5);
await round('Lane Dash', 'age 5');

console.log('\n=== age 17: every game at full difficulty ===');
await setAge(page, 17);
for (let i = 0; i < 6; i += 1) {
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(150);
}
report.ok(`Home lists: ${(await listed()).join(', ')}`);
for (const title of ['Pattern Play', 'Number Crunch', 'Sudoku', 'Shape Builder', 'Puddle Hop', 'Lane Dash', 'Odd One Out']) await round(title, 'age 17');

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

console.log('\n=== watching the pattern again ===');
if (await openGame(page, 'Pattern Play')) {
  const replayButton = page.getByLabel('Watch the pattern again');
  if (await replayButton.isEnabled()) {
    report.bug('Pattern Play', 'the replay control is live while the pattern is already playing');
  }
  const first = await watchPattern(page, report);
  // Get one step in, then ask to see it again.
  await page.getByLabel(first[0], { exact: true }).first().click();
  await page.waitForTimeout(200);
  if (!(await replayButton.isEnabled())) {
    report.bug('Pattern Play', 'the replay control cannot be pressed once the child is repeating');
  }
  await replayButton.click();
  const second = await watchPattern(page, report);
  if (second.join('|') !== first.join('|')) {
    report.bug('Pattern Play', `replay showed a different pattern: ${first.join(', ')} then ${second.join(', ')}`);
  } else {
    report.ok(`replay shows the same ${second.length}-step pattern again`);
  }
  // Repeating it whole from the start should now finish the round.
  for (const label of second) {
    await page.getByLabel(label, { exact: true }).first().click();
    await page.waitForTimeout(170);
  }
  const result = await waitForRound(page, 3000);
  if (!result) report.bug('Pattern Play', 'repeating the whole pattern after a replay did not finish the round');
  else if (result.stars !== 3) report.bug('Pattern Play', `a replay cost stars: ${result.stars}`);
  else report.ok('repeated from the start after a replay: round complete, 3 stars');
  await backHome(page, report, 'Pattern Play');
}

console.log('\n=== Puddle Hop: a bump ends the run ===');
if (await openGame(page, 'Puddle Hop')) {
  const box = await page.getByLabel('Start running').boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.85);
  // Never hop. The first obstacle should end it, after the tumble.
  const result = await waitForRound(page, 12000);
  if (!result) report.bug('Puddle Hop', 'running into an obstacle did not end the round');
  else {
    const progress = parseInt(await page.getByText(/^\d+%$/).first().innerText(), 10);
    if (progress >= 100) report.bug('Puddle Hop', 'a crashed run was shown as finished');
    else if (result.stars !== 1) report.bug('Puddle Hop', `a crash earned ${result.stars} stars, not 1`);
    else report.ok(`the first bump ended the run at ${progress}%: one star, "Nice try"`);
    const text = await page.locator('body').innerText();
    if (/\b(best|score|record|metres|distance)\b/i.test(text)) {
      report.bug('Puddle Hop', 'the end card shows a score, distance or best');
    } else {
      report.ok('the end card keeps no score, distance or best');
    }
  }
  await backHome(page, report, 'Puddle Hop');
}

console.log('\n=== Lane Dash: driving into everything ===');
if (await openGame(page, 'Lane Dash')) {
  await page.getByLabel('Steer right').click(); // start, then never steer
  const result = await waitForRound(page, 60000);
  if (!result) report.bug('Lane Dash', 'a race full of bumps never reached the flag');
  else {
    const label = (await page.getByText(/^YOU CAME /).first().innerText()).trim();
    report.ok(`bumped all the way and still finished: ${label.toLowerCase()}, ${result.stars} star${result.stars === 1 ? '' : 's'}`);
    if (result.stars < 1) report.bug('Lane Dash', 'last place earned no star');
    const text = await page.locator('body').innerText();
    if (/\b(best|record|lap|time:|seconds)\b/i.test(text)) report.bug('Lane Dash', 'a time or record is on screen');
    else report.ok('no clock, lap time or record anywhere');
  }
  await backHome(page, report, 'Lane Dash');
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
