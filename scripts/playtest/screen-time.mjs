/**
 * Pass 4: the limits a grown-up sets actually hold.
 *
 * The page runs on a clock this pass controls, so ten minutes of play take a
 * moment. A sitting is one sitting however many games it spans; the stop
 * screen stays up until a grown-up changes the limit; and a day's allowance
 * comes back at midnight even if the app was left open on the stop screen.
 *
 * See harness.mjs for how to run this.
 */
import { openApp, openGame, passParentGate, reporter, summarise } from './harness.mjs';

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
await play(8);
if (await onBreak()) report.bug('sitting', 'the break came after 8 of 10 minutes');
else report.ok('still playing after 8 of 10 minutes');
await page.getByLabel('Back to games').click();
await page.waitForTimeout(400);
await openGame(page, 'How Many?');
await play(3);
await page.waitForTimeout(400);
if (await onBreak()) report.ok('break time after 11 minutes across two games');
else report.bug('sitting', 'no break after 11 minutes across two games — going Home restarted the sitting');

console.log('\n=== the stop screen stays ===');
await play(1);
await page.waitForTimeout(800);
if (!(await onBreak())) report.bug('sitting', 'the break screen went away on its own');
else if (await page.getByLabel('Back to games').count()) report.bug('sitting', 'a game is still reachable from the break screen');
else report.ok('the break screen stays up, with only the grown-ups’ door on it');

console.log('\n=== a grown-up lifts it ===');
await setLimit('sitting', 'No limit');
if (await atHome()) report.ok('lifting the limit goes straight back to the games');
else report.bug('sitting', 'still stopped after a grown-up lifted the limit');

console.log('\n=== a day, and midnight ===');
await setLimit('day', '15 minutes');
await openGame(page, 'Sort It Out');
await play(16);
await page.waitForTimeout(400);
if (await doneForToday()) report.ok('done for today after 16 of 15 minutes');
else report.bug('daily', 'no stop after 16 of 15 minutes');
await play(8 * 60);
await page.waitForTimeout(800);
if (await doneForToday()) report.bug('daily', 'still "done for today" the next morning, with the app left open');
else if (await atHome()) report.ok('a new day brings a new allowance, even left open overnight');
else report.bug('daily', 'the next morning shows neither the stop screen nor Home');

const code = summarise(report, errors);
await browser.close();
process.exit(code);
