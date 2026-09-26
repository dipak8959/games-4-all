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
  passParentGate,
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
for (const title of [
  'Find the Pairs',
  'How Many?',
  'Sort It Out',
  'Odd One Out',
  'Shadow Match',
  'Which Cup?',
  'Big to Small',
  'Fruit Catch',
  'Maze Explorer',
  'Balloon Count',
  'Peekaboo Pals',
]) {
  await round(title, 'age 3');
}
await setAge(page, 4);
await round('Puddle Hop', 'age 4');
await round('Memory Grid', 'age 4');
await round('Tall Tower', 'age 4');
await round('Duck Crossing', 'age 4');
for (const title of ['Market Memory', 'Star Jar', 'Maze Team', 'Echo Beat']) await round(title, 'age 4');
await setAge(page, 5);
for (const title of ['Lane Dash', 'Bounce Bricks', 'Hungry Worm', 'Hoop Shot', "What's the Time?", 'Rhyme Time', 'Count Around']) {
  await round(title, 'age 5');
}
await setAge(page, 7);
for (const title of ['Shadow Match', 'Big to Small', 'Tile Slide', 'Soft Landing', 'Code Cracker']) await round(title, 'age 7');
await setAge(page, 8);
await round('Balloon Count', 'age 8');
await round('Rhyme Time', 'age 8');
await setAge(page, 10);
await round('Which Cup?', 'age 10');
await round('Word Ladder', 'age 10');
await round('Fruit Catch', 'age 10');
await round('Peekaboo Pals', 'age 10');
await round("What's the Time?", 'age 10');
await setAge(page, 12);
for (const title of ['Maze Explorer', 'Treasure Hunt', 'Water Works']) await round(title, 'age 12');

console.log('\n=== age 17: every game at full difficulty ===');
await setAge(page, 17);
for (let i = 0; i < 6; i += 1) {
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(150);
}
report.ok(`Home lists: ${(await listed()).join(', ')}`);
for (const title of [
  'Pattern Play',
  'Number Crunch',
  'Sudoku',
  'Shape Builder',
  'Puddle Hop',
  'Lane Dash',
  'Odd One Out',
  'Memory Grid',
  'Tile Slide',
  'Word Ladder',
  'Bounce Bricks',
  'Hungry Worm',
  'Hoop Shot',
  'Soft Landing',
  'Tall Tower',
  'Duck Crossing',
  'Code Cracker',
  'Market Memory',
  'Count Around',
  'Star Jar',
  'Maze Team',
  'Echo Beat',
]) {
  await round(title, 'age 17');
}

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
  await page.getByLabel(/^Right lane/).click(); // start, then never steer
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

console.log('\n=== Lane Dash: one tap, two lanes ===');
// Still age 9 here, and Lane Dash already played at 17: a three-lane road.
if (await openGame(page, 'Lane Dash')) {
  const car = () => page.locator('[data-testid="player-car"]').boundingBox();
  await page.getByLabel(/^Left lane/).click(); // starts the race
  await page.getByLabel(/^Left lane/).click();
  await page.waitForTimeout(400);
  const leftX = (await car()).x;
  await page.getByLabel(/^Right lane/).click();
  await page.waitForTimeout(250); // one lane's time and a little: the whole hop
  const rightX = (await car()).x;
  const road = await page.locator('[data-testid^="road:"]').boundingBox();
  if (rightX - leftX < road.width * 0.55) {
    report.bug('Lane Dash', `one tap on the right lane moved the car ${Math.round(rightX - leftX)}px of a ${Math.round(road.width)}px road`);
  } else if (!(await page.getByLabel('Right lane, your car').count())) {
    report.bug('Lane Dash', 'the right lane does not say the car is in it');
  } else {
    report.ok('one tap on the far lane crosses the whole road, in a quarter of a second');
  }
  await backHome(page, report, 'Lane Dash');
}

console.log('\n=== Which Cup?: the wrong cup, and cups that move ===');
if (await openGame(page, 'Which Cup?')) {
  await page.getByText('KEEP WATCHING', { exact: true }).waitFor({ timeout: 8000 });
  if (await page.getByLabel(/^Cup \d+$/).first().isEnabled()) {
    report.bug('Which Cup?', 'a cup can be picked while the cups are still moving');
  } else {
    report.ok('no cup can be picked mid-shuffle');
  }
  await page.getByText('WHICH CUP?', { exact: true }).waitFor({ timeout: 15000 });
  const cup = await page.locator('[data-testid$="-ball"]').first().boundingBox();
  const middle = cup.x + cup.width / 2;
  let wrong = null;
  for (const slot of await page.getByLabel(/^Cup \d+$/).all()) {
    const box = await slot.boundingBox();
    if (middle < box.x || middle > box.x + box.width) wrong = slot;
  }
  const label = await wrong.getAttribute('aria-label');
  await wrong.click();
  await page.waitForTimeout(300);
  if (!(await page.getByLabel(`${label}, empty`).count())) {
    report.bug('Which Cup?', 'a wrong cup did not lift to show it was empty');
  } else if (await page.getByLabel(`${label}, empty`).isEnabled()) {
    report.bug('Which Cup?', 'an empty cup can be picked again');
  } else {
    report.ok('a wrong cup lifts, shows it is empty, and cannot be charged twice');
  }
  if (!(await page.getByText('WHICH CUP?', { exact: true }).count())) {
    report.bug('Which Cup?', 'a wrong cup moved on instead of letting the child pick again');
  }
  await backHome(page, report, 'Which Cup?');
}

console.log('\n=== Tile Slide: a tile out of line ===');
if (await openGame(page, 'Tile Slide')) {
  const read = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('[aria-label]')]
        .map((el) => el.getAttribute('aria-label'))
        .filter((l) => /^(\d+|Gap), row/.test(l))
        .join('|'),
    );
  const before = await read();
  const stuck = page.getByLabel(/^\d+, row \d+, column \d+$/).first();
  await stuck.click();
  await page.waitForTimeout(250);
  if ((await read()) !== before) report.bug('Tile Slide', 'a tile out of line with the gap moved');
  else report.ok('a tile out of line with the gap stays put');
  await backHome(page, report, 'Tile Slide');
}

console.log('\n=== admin mode ===');
await setAge(page, 3);
const listedAt3 = (await listed()).length;
await page.getByLabel('Parent zone, grown-ups only').click();
await page.waitForTimeout(500);
await passParentGate(page);
const passwordBox = page.getByLabel('Admin password');
for (let i = 0; i < 12 && !(await passwordBox.count()); i += 1) {
  await page.mouse.wheel(0, 700);
  await page.waitForTimeout(150);
}
await passwordBox.fill('not the password');
await page.getByLabel('Turn on admin mode').click();
await page.waitForTimeout(800);
if (!(await page.getByText("That isn't the admin password.").count())) {
  report.bug('admin', 'a wrong password was not turned away');
} else {
  report.ok('a wrong admin password is turned away');
}
// The real password is never in the repository: pass it in to test it.
const adminPassword = process.env.PLAYTEST_ADMIN_PASSWORD;
if (!adminPassword) {
  report.ok('PLAYTEST_ADMIN_PASSWORD not set: skipping the unlock itself');
  await page.getByLabel('Done').click();
  await page.waitForTimeout(600);
} else {
  await passwordBox.fill(adminPassword);
  await page.getByLabel('Turn on admin mode').click();
  await page.waitForTimeout(1500);
  if (!(await page.getByLabel('Level 6').count())) {
    report.bug('admin', 'the right password did not turn admin mode on');
  } else {
    await page.getByLabel('Level 6').click();
    await page.waitForTimeout(200);
    await page.getByLabel('Done').click();
    await page.waitForTimeout(600);
    for (let i = 0; i < 8; i += 1) {
      await page.mouse.wheel(0, 700);
      await page.waitForTimeout(150);
    }
    const all = (await listed()).length;
    if (all <= listedAt3) report.bug('admin', `admin mode lists ${all} games, a 3-year-old ${listedAt3}`);
    else report.ok(`admin mode lists all ${all} games (a 3-year-old sees ${listedAt3})`);
    if (await openGame(page, 'Tile Slide')) {
      const tiles = await page.getByLabel(/^\d+, row \d+, column \d+/).count();
      if (tiles !== 15) report.bug('admin', `Tile Slide opened with ${tiles} tiles, not level 6's 15`);
      else report.ok('with level 6 chosen, Tile Slide opens as a 4x4 for a 3-year-old profile');
      await backHome(page, report, 'Tile Slide');
    }
    await page.getByLabel('Turn off admin mode').click();
    await page.waitForTimeout(500);
    for (let i = 0; i < 8; i += 1) {
      await page.mouse.wheel(0, 700);
      await page.waitForTimeout(150);
    }
    const after = (await listed()).length;
    if (after !== listedAt3) report.bug('admin', `turning admin mode off left ${after} games listed`);
    else report.ok('turning it off puts Home back to the profile\'s own games');
  }
}
await setAge(page, 9);

console.log('\n=== How to play ===');
// Still age 9 here. Every game on Home has it, and it closes in one tap.
for (const title of await listed()) {
  if (!(await openGame(page, title))) continue;
  const button = page.getByLabel(`How to play ${title}`);
  if (!(await button.count())) {
    report.bug(title, 'no "How to play" button');
  } else {
    await button.click();
    await page.waitForTimeout(250);
    const opened = (await page.getByText('THE GOAL', { exact: true }).count()) > 0;
    await page.getByLabel('Close how to play').click();
    await page.waitForTimeout(250);
    const closed = (await page.getByText('THE GOAL', { exact: true }).count()) === 0;
    if (!opened) report.bug(title, '"How to play" did not open');
    else if (!closed) report.bug(title, '"How to play" did not close');
  }
  await backHome(page, report, title);
}
report.ok(`"How to play" opens and closes in every game at age 9`);

if (await openGame(page, 'Fruit Catch')) {
  await page.getByLabel(/^Column 1 of/).click();
  await page.waitForTimeout(3000);
  const progress = async () => page.getByText(/^\d+%$/).first().innerText();
  await page.getByLabel('How to play Fruit Catch').click();
  const before = await progress();
  await page.waitForTimeout(4000);
  const during = await progress();
  await page.getByLabel('Back to the game').click();
  await page.waitForTimeout(5000);
  const after = await progress();
  if (during !== before) report.bug('Fruit Catch', `kept going under "How to play": ${before} to ${during}`);
  else if (after === during) report.bug('Fruit Catch', 'did not carry on after "How to play" closed');
  else report.ok(`Fruit Catch holds still while "How to play" is open (${before}), and carries on after (${after})`);
  await backHome(page, report, 'Fruit Catch');
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

console.log('\n=== leaving a finished round by the arrow at the top ===');
{
  // The round-complete card has its own "Back to games", which records the
  // round. The arrow at the top of the screen is still there under it, and a
  // child is as likely to tap that: the round must count either way.
  const starsFor = async (title) => {
    const label = await page.evaluate(
      (t) => [...document.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label')).find((l) => l.startsWith(`${t}. `) && l.endsWith(' earned.')) ?? '',
      title,
    );
    return Number(label.match(/(\d+) stars? earned/)?.[1] ?? NaN);
  };
  const before = await starsFor('How Many?');
  if (await openGame(page, 'How Many?')) {
    await PLAYERS['How Many?'](page, report);
    const result = await waitForRound(page, 8000);
    if (!result) {
      report.bug('How Many?', 'the round did not finish');
      await backHome(page, report, 'How Many?');
    } else {
      // The header's arrow comes first on the page; the card's button second.
      await page.getByLabel('Back to games').first().click();
      await page.waitForTimeout(800);
      const after = await starsFor('How Many?');
      if (after === before + result.stars) report.ok(`the round still counts: ${before} → ${after} stars`);
      else report.bug('How Many?', `left by the top arrow, a ${result.stars}-star round went unrecorded (${before} → ${after})`);
    }
  }
}

// Nothing above should have left a round-complete card hanging around.
if (await roundResult(page)) report.bug('chrome', 'a round-complete card survived returning to Home');

const code = summarise(report, errors);
await browser.close();
process.exit(code);
