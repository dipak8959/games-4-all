/**
 * Shared machinery for the playtest passes.
 *
 * These scripts drive the exported web build in a real browser and play the
 * games the way a player does: they read the board through the same
 * accessibility labels a screen reader gets, work out the right answer, and
 * check what the app does. Nothing here reaches into React state, so a pass
 * only goes green if the thing a child actually touches works.
 *
 * Playwright is deliberately *not* a dependency of this project — the app
 * ships with a minimal dep surface on purpose (see SAFETY.md), and a browser
 * driver has no business in it. To run a pass:
 *
 *     npx expo export --platform web --output-dir dist-web
 *     python3 -m http.server 8099 --directory dist-web &
 *     node scripts/playtest/play-every-game.mjs
 *
 * with playwright available on the machine.
 */
import { chromium } from 'playwright';

/** Where the exported web build is being served from. */
export const BASE_URL = process.env.PLAYTEST_URL ?? 'http://localhost:8099/';

export function reporter() {
  const bugs = [];
  return {
    bugs,
    bug(where, what) {
      bugs.push(`${where}: ${what}`);
      console.log(`  BUG  ${what}`);
    },
    ok(what) {
      console.log(`  ok   ${what}`);
    },
  };
}

/** Opens the app on a phone-sized viewport, past the onboarding screen. */
export async function openApp() {
  const browser = await chromium.launch({
    executablePath: process.env.PLAYTEST_CHROME ?? undefined,
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  if (await page.getByLabel('Skip for now').count()) {
    await page.getByLabel('Skip for now').click();
    await page.waitForTimeout(800);
  }
  return { browser, page, errors };
}

/** Answers the grown-ups-only multiplication gate with the right product. */
export async function passParentGate(page) {
  const prompt = await page.getByText(/\d+\s*×\s*\d+/).first().innerText();
  const [a, b] = prompt.split('×').map((x) => parseInt(x.trim(), 10));
  await page.getByText(String(a * b), { exact: true }).first().click();
  await page.waitForTimeout(900);
}

/** Sets the active profile's age, which is what decides both which games are
 *  listed and the level each of them starts at. */
export async function setAge(page, target) {
  await page.getByLabel('Profiles, grown-ups only').click();
  await page.waitForTimeout(500);
  await passParentGate(page);
  await page.getByLabel(/^Edit /).first().click();
  await page.waitForTimeout(400);
  const current = parseInt(await page.getByLabel(/^\d+ years old$/).innerText(), 10);
  const step = target > current ? 'Older' : 'Younger';
  for (let i = 0; i < Math.abs(target - current); i += 1) {
    await page.getByLabel(step).click();
    await page.waitForTimeout(60);
  }
  await page.getByLabel('Save changes').click();
  await page.waitForTimeout(500);
  await page.getByLabel('Done').click();
  await page.waitForTimeout(800);
}

/** Taps a game's card on Home, scrolling to find it. */
export async function openGame(page, title) {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const tile = page.getByLabel(new RegExp(`^${escaped}\\.`)).first();
    if (await tile.count()) {
      await tile.click();
      await page.waitForTimeout(700);
      return true;
    }
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(300);
  }
  return false;
}

/** The round-complete card, or null while the round is still running. */
export async function roundResult(page) {
  if (!(await page.getByLabel('Play again').count())) return null;
  const label = await page
    .getByLabel(/You earned \d+ stars?/)
    .first()
    .getAttribute('aria-label');
  return { stars: parseInt(label.match(/\d+/)[0], 10) };
}

/** The overlay mounts a beat after the last move lands, so give it one. */
export async function waitForRound(page, ms = 6000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    const result = await roundResult(page);
    if (result) return result;
    await page.waitForTimeout(150);
  }
  return null;
}

/** Gets back to Home from wherever a pass left off, so one stuck game can't
 *  make every game after it look unreachable. */
export async function backHome(page, report, where) {
  for (let i = 0; i < 4; i += 1) {
    if (await page.getByText('ON THIS DEVICE').count()) return;
    const back = page.getByLabel(/^(Back to games|Back|Done)$/).first();
    if (await back.count()) await back.click();
    await page.waitForTimeout(700);
  }
  report.bug(where, 'could not get back to Home');
}

export function summarise(report, errors) {
  console.log('\n================ RESULT ================');
  if (errors.length) {
    console.log('Runtime errors:');
    for (const e of [...new Set(errors)]) console.log(`  ${e}`);
  }
  console.log(report.bugs.length === 0 ? 'No bugs found.' : `${report.bugs.length} bug(s):`);
  for (const b of report.bugs) console.log(`  - ${b}`);
  return report.bugs.length === 0 && errors.length === 0 ? 0 : 1;
}
