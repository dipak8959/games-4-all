/**
 * Pass 4: the limits a grown-up sets actually hold.
 *
 * The page runs on a clock this pass controls, so ten minutes of play take a
 * moment. A sitting is one sitting however many games it spans; the game
 * says when two minutes are left; a limit reached mid-round lets that round
 * finish, for three minutes at most; the break screen survives the app put
 * away or reopened and clears itself after a ten-minute break; and a day's
 * allowance comes back at midnight even if the app was left open on the
 * stop screen.
 *
 * See harness.mjs for how to run this.
 */
import { openApp, openGame, passParentGate, reporter, summarise } from './harness.mjs';
import { PLAYERS } from './players.mjs';

const report = reporter();
const { browser, page, errors } = await openApp({ clockAt: new Date('2026-09-26T17:00:00') });

const play = (minutes) => page.clock.runFor(minutes * 60 * 1000);
const onBreak = async () => (await page.getByText('BREAK TIME', { exact: true }).count()) > 0;
const doneForToday = async () => (await page.getByText('DONE FOR TODAY', { exact: true }).count()) > 0;
const atHome = async () => (await page.getByText('ON THIS DEVICE').count()) > 0;

/** Through the gate, from Home or from the stop screen, to set one limit. */
async function setLimit(which, choice) {
  const door = (await page.getByLabel('Grown-up settings').count())
    ? page.getByLabel('Grown-up settings')
    : page.getByLabel('Parent zone, grown-ups only');
  await door.click();
  await page.waitForTimeout(400);
  await passParentGate(page);
  // The sitting's choices come first on the page, the day's second.
  await page.getByLabel(choice, { exact: true }).nth(which === 'sitting' ? 0 : 1).click();
  await page.waitForTimeout(300);
  await page.getByLabel('Done', { exact: true }).first().click();
  await page.waitForTimeout(600);
}

console.log('=== a sitting spans games ===');
await setLimit('sitting', '10 minutes');
await openGame(page, 'Sort It Out');
await play(8.5);
if (await onBreak()) report.bug('sitting', 'the break came after 8½ of 10 minutes');
else report.ok('still playing after 8½ of 10 minutes');
// Two minutes out, the game's header says so: the stop is never a surprise.
const headsUp = page.getByLabel(/^2 minutes of play left, then a break$/);
if (await headsUp.count()) report.ok('two minutes out, the header says "2 MIN" left');
else report.bug('sitting', 'no heads-up in the game two minutes before the break');
await page.getByLabel('Back to games').click();
await page.waitForTimeout(400);
await openGame(page, 'How Many?');
await play(2.5);
await page.waitForTimeout(400);

console.log('\n=== the last round finishes ===');
// The limit came mid-round: that round goes on, and says it's the last.
if (await onBreak()) report.bug('sitting', 'the round was snatched away the moment the limit came, or going Home restarted the sitting');
else if (await page.getByLabel('Last round, then a break').count()) report.ok('the limit came mid-round: "LAST ROUND", and the round goes on');
else report.bug('sitting', 'no "LAST ROUND" in the header once the limit came mid-round');
await PLAYERS['How Many?'](page, report);
await page.waitForTimeout(600);
await page.getByLabel('Play again').click();
await page.waitForTimeout(600);
if (await onBreak()) report.ok('after the last round, "Play again" goes to the break, not another round');
else report.bug('sitting', 'another round started after the last one');

console.log('\n=== the break holds ===');
await play(1);
await page.waitForTimeout(800);
if (!(await onBreak())) report.bug('sitting', 'the break screen went away after a minute');
else if (await page.getByLabel('Back to games').count()) report.bug('sitting', 'a game is still reachable from the break screen');
else if (!(await page.getByText(/^BACK TO PLAY IN \d+ MIN$/).count())) report.bug('sitting', 'the break screen does not say how long the break is');
else report.ok('the break screen stays, says how long is left, and has only the grown-ups’ door');
// Away and straight back is not a break.
const visibility = (state) =>
  page.evaluate((state) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => state === 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  }, state);
await visibility('hidden');
await page.waitForTimeout(300);
await visibility('visible');
await page.waitForTimeout(800);
if (await onBreak()) report.ok('putting the app away and straight back does not end the break');
else report.bug('sitting', 'putting the app away for a moment ended the break');
await page.reload();
await page.waitForTimeout(2500);
if (await onBreak()) report.ok('nor does closing and reopening the app');
else report.bug('sitting', 'reopening the app ended the break');
await play(10);
await page.waitForTimeout(800);
if (await atHome()) report.ok('ten minutes on, the break is over by itself: back to the games');
else report.bug('sitting', 'still on the break screen after a ten-minute break');

console.log('\n=== a last round has an end ===');
await openGame(page, 'Sort It Out');
await play(11);
await page.waitForTimeout(400);
if (await onBreak()) report.bug('sitting', 'no last round at the limit, the second time');
await play(3);
await page.waitForTimeout(800);
if (await onBreak()) report.ok('a last round left unfinished still stops after three minutes');
else report.bug('sitting', 'a last round ran on past three minutes');

console.log('\n=== a grown-up lifts it ===');
await setLimit('sitting', 'No limit');
if (await atHome()) report.ok('lifting the limit goes straight back to the games');
else report.bug('sitting', 'still stopped after a grown-up lifted the limit');

console.log('\n=== a day, and midnight ===');
// The day has had nearly half an hour of play already: an hour's limit,
// played up to a minute at a time.
await setLimit('day', '60 minutes');
await openGame(page, 'Sort It Out');
const lastOfDay = page.getByLabel("Last round, then that's all for today");
for (let m = 0; m < 45 && !(await lastOfDay.count()) && !(await doneForToday()); m += 1) {
  await play(1);
  await page.waitForTimeout(150);
}
if (await lastOfDay.count()) report.ok('the day\'s limit came mid-round: "LAST ROUND"');
else report.bug('daily', 'no last round when the day\'s limit came mid-round');
await play(3);
await page.waitForTimeout(400);
if (await doneForToday()) report.ok('done for today once the last round ran out');
else report.bug('daily', 'no stop three minutes after the day\'s limit');
await play(8 * 60);
await page.waitForTimeout(800);
if (await doneForToday()) report.bug('daily', 'still "done for today" the next morning, with the app left open');
else if (await atHome()) report.ok('a new day brings a new allowance, even left open overnight');
else report.bug('daily', 'the next morning shows neither the stop screen nor Home');

const code = summarise(report, errors);
await browser.close();
process.exit(code);
