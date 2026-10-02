/**
 * Pass 6: every game, at every level, played to the end.
 *
 * Admin mode opens every game at each of the six levels in turn. For each
 * one, the pass looks at the screen as a player first meets it — nothing
 * scrolling sideways, nothing tappable off the edge, a prompt to say what to
 * do — then hands the round to the game's player (players.mjs), which plays
 * it reading only the screen, and checks it ends with stars. Pages that log
 * an error fail the pass, as in every other one.
 *
 * Needs PLAYTEST_ADMIN_PASSWORD. Levels default to all six; PLAYTEST_LEVELS
 * (e.g. "1,2,3") runs some of them, so the pass can be split across
 * machines, and PLAYTEST_GAMES (titles, comma-separated) some of the games. PLAYTEST_SHOTS names a folder to save a picture of each game at
 * the start and partway through, for a person to look over.
 *
 * See harness.mjs for how to run this.
 */
import { mkdirSync } from 'node:fs';

import { backHome, openApp, openGame, passParentGate, reporter, roundResult, summarise, waitForRound } from './harness.mjs';
import { PLAYERS } from './players.mjs';

const password = process.env.PLAYTEST_ADMIN_PASSWORD;
if (!password) {
  console.error('every-level.mjs needs PLAYTEST_ADMIN_PASSWORD: it opens games at chosen levels through admin mode.');
  process.exit(2);
}
const levels = (process.env.PLAYTEST_LEVELS ?? '1,2,3,4,5,6').split(',').map(Number);
const only = process.env.PLAYTEST_GAMES ? process.env.PLAYTEST_GAMES.split(',') : null;
const shots = process.env.PLAYTEST_SHOTS;
if (shots) mkdirSync(shots, { recursive: true });
/** Longest any one round may take before the pass calls it stuck. */
const ROUND_MS = 330000;

const report = reporter();
let { browser, page, errors } = await openApp();
const results = [];
/** Errors from pages already closed, so a restart doesn't lose them. */
const earlier = [];

/** Admin mode on, at a level. It lasts until the page closes, so a fresh
 *  page needs it again. */
async function atLevel(level) {
  await page.getByLabel('Parent zone, grown-ups only').click();
  await page.waitForTimeout(500);
  await passParentGate(page);
  const box = page.getByLabel('Admin password');
  for (let i = 0; i < 14 && !(await page.getByLabel(`Level ${level}`).count()) && !(await box.count()); i += 1) {
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(150);
  }
  if (!(await page.getByLabel(`Level ${level}`).count())) {
    await box.fill(password);
    await page.getByLabel('Turn on admin mode').click();
    await page.waitForTimeout(1200);
  }
  await page.getByLabel(`Level ${level}`).click();
  await page.waitForTimeout(200);
  await page.getByLabel('Done', { exact: true }).first().click();
  await page.waitForTimeout(600);
}

/** The games Home lists right now, read off their cards. */
const listed = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('[aria-label$=" stars earned."]')].map((el) =>
      el.getAttribute('aria-label').replace(/\. \d+ stars? earned\.$/, ''),
    ),
  );

/** What a player meets on opening a game: does it fit, and does it say what
 *  to do? */
async function firstLook(where) {
  const found = await page.evaluate(() => {
    const out = { sideways: document.documentElement.scrollWidth - window.innerWidth, off: [], prompt: '' };
    for (const el of document.querySelectorAll('[role="button"], [role="switch"], [role="radio"], button')) {
      if (el.closest('[aria-hidden="true"]')) continue;
      const r = el.getBoundingClientRect();
      if (r.width && (r.right > window.innerWidth + 1 || r.left < -1)) out.off.push(el.getAttribute('aria-label') ?? el.tagName);
    }
    // The game's prompt is the header that sits under the progress bar.
    const headers = [...document.querySelectorAll('[role="heading"]')].map((h) => h.innerText.trim()).filter(Boolean);
    out.prompt = headers[headers.length - 1] ?? '';
    return out;
  });
  if (found.sideways > 1) report.bug(where, `the page scrolls sideways by ${found.sideways}px`);
  if (found.off.length) report.bug(where, `off the side of the screen: ${found.off.slice(0, 4).join('; ')}`);
  if (!found.prompt) report.bug(where, 'no prompt saying what to do');
  return found.prompt;
}

const slug = (s) => s.replace(/\W/g, '');

async function playOne(title, level) {
  const where = `${title}, level ${level}`;
  if (!(await openGame(page, title))) {
    report.bug(title, `level ${level}: listed, but its card could not be opened`);
    return 'unopened';
  }
  await page.waitForTimeout(900);
  const prompt = await firstLook(where);
  if (shots) await page.screenshot({ path: `${shots}/${slug(title)}-L${level}-a.png` });
  const player = PLAYERS[title];
  if (!player) {
    report.bug(where, 'no player to play it');
    await backHome(page, report, where);
    return 'no player';
  }
  const t0 = Date.now();
  const midShot = shots ? setTimeout(() => page.screenshot({ path: `${shots}/${slug(title)}-L${level}-b.png` }).catch(() => {}), 5000) : null;
  let stuck = false;
  let threw = null;
  try {
    await Promise.race([
      player(page, report),
      new Promise((_, reject) => setTimeout(() => reject(new Error('stuck')), ROUND_MS)),
    ]);
  } catch (e) {
    if (e.message === 'stuck') stuck = true;
    else threw = e.message;
  }
  clearTimeout(midShot);
  const result = stuck ? await roundResult(page) : await waitForRound(page, 10000);
  const seconds = Math.round((Date.now() - t0) / 1000);
  if (threw) report.bug(where, `the player threw: ${threw.split('\n')[0]}`);
  if (!result) report.bug(where, stuck ? `still not finished after ${ROUND_MS / 1000}s` : 'played, but the round never finished');
  else report.ok(`${where}: ${result.stars} star${result.stars === 1 ? '' : 's'} in ${seconds}s`);
  results.push({ title, level, stars: result?.stars ?? 0, seconds, prompt });
  if (stuck || threw) {
    // A player still running in the page would play the next game too:
    // start a fresh page.
    earlier.push(...errors);
    await browser.close();
    ({ browser, page, errors } = await openApp());
    await atLevel(level);
    return 'restarted';
  }
  await backHome(page, report, where);
  return 'played';
}

for (const level of levels) {
  console.log(`\n=== every game at level ${level} ===`);
  await atLevel(level);
  const titles = await listed();
  console.log(`  (${titles.length} games listed)`);
  for (const title of titles.filter((t) => !only || only.includes(t))) {
    console.log(`\n${title}, level ${level}`);
    await playOne(title, level);
  }
}

// Every game that finished below three stars, for a person to look into.
const short = results.filter((r) => r.stars < 3);
console.log(`\n${results.length} rounds played; ${short.length} under three stars:`);
for (const r of short) console.log(`  ${r.title}, level ${r.level}: ${r.stars} star${r.stars === 1 ? '' : 's'} (${r.seconds}s)`);

const code = summarise(report, [...earlier, ...errors]);
await browser.close();
process.exit(code);
