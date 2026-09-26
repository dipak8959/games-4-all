/**
 * Pass 5: everything tappable is big enough, on the smallest phone.
 *
 * On a 320x568 screen, every screen the app has — Home, search, the TIME
 * tab, the parent gate, Parent Zone, Profiles, the profile editor, and every
 * game at its easiest and its hardest — is measured the way a finger meets
 * it: nothing tappable under 72dp (Sudoku's grid is the one documented
 * exception), nothing off the side, no sideways scrolling, and nothing below
 * the bottom of the screen that can't be scrolled to.
 *
 * With PLAYTEST_ADMIN_PASSWORD set, admin mode opens every game at level 1
 * and level 6. Without it, the games are reached through profiles aged 3, 8
 * and 17, at the levels those ages start on.
 *
 * See harness.mjs for how to run this.
 */
import { backHome, openApp, openGame, passParentGate, reporter, setAge, summarise } from './harness.mjs';

const report = reporter();
const { browser, page, errors } = await openApp({ viewport: { width: 320, height: 568 } });

async function measure(where, { sudoku = false } = {}) {
  const found = await page.evaluate(() => {
    const out = { sideways: document.documentElement.scrollWidth - window.innerWidth, small: [], off: [], below: [] };
    const selector = '[role="button"], button, [role="radio"], [role="switch"], [role="tab"], [role="link"], input, textarea';
    for (const el of document.querySelectorAll(selector)) {
      if (el.closest('[aria-hidden="true"]')) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const name = el.getAttribute('aria-label') ?? el.getAttribute('placeholder') ?? el.tagName;
      if (r.width < 71.5 || r.height < 71.5) out.small.push(`${name} ${Math.round(r.width)}x${Math.round(r.height)}`);
      if (r.right > window.innerWidth + 1 || r.left < -1) out.off.push(name);
      if (r.top > window.innerHeight) {
        let scrolls = false;
        for (let p = el.parentElement; p && !scrolls; p = p.parentElement) {
          const o = getComputedStyle(p).overflowY;
          scrolls = (o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight + 1;
        }
        if (!scrolls) out.below.push(name);
      }
    }
    return out;
  });
  // Sudoku's cells: a 9x9 board cannot fit 72dp cells on a phone.
  const small = [...new Set(found.small)].filter((s) => !(sudoku && /^Row \d+, column \d+: /.test(s)));
  const problems = [];
  if (found.sideways > 1) problems.push(`the page scrolls sideways by ${found.sideways}px`);
  if (small.length) problems.push(`under 72dp: ${small.slice(0, 5).join('; ')}${small.length > 5 ? ` (+${small.length - 5} more)` : ''}`);
  if (found.off.length) problems.push(`off the side of the screen: ${found.off.slice(0, 4).join('; ')}`);
  if (found.below.length) problems.push(`below the screen, with no way to scroll to it: ${found.below.slice(0, 4).join('; ')}`);
  for (const p of problems) report.bug(where, p);
  if (!problems.length) report.ok(where);
}

console.log('=== the screens around the games ===');
await measure('Home');
await page.getByLabel('Search games').fill('count');
await page.waitForTimeout(300);
await measure('Home, searching');
await page.getByLabel('Clear search').click();
await page.waitForTimeout(300);
await page.getByLabel("Today's play time").click();
await page.waitForTimeout(500);
await measure('TIME');
await page.getByLabel('Games', { exact: true }).click();
await page.waitForTimeout(500);
await page.getByLabel('Parent zone, grown-ups only').click();
await page.waitForTimeout(500);
await measure('the parent gate');
await passParentGate(page);
await measure('Parent Zone');
await page.getByLabel('Done', { exact: true }).first().click();
await page.waitForTimeout(500);
await page.getByLabel('Profiles, grown-ups only').click();
await page.waitForTimeout(500);
await passParentGate(page);
await measure('Profiles');
await page.getByLabel(/^Edit /).first().click();
await page.waitForTimeout(400);
await measure('the profile editor');
await page.getByLabel('Done', { exact: true }).first().click();
await page.waitForTimeout(600);

/** The games Home lists right now, read off their cards. */
const listed = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('[aria-label$=" stars earned."]')].map((el) =>
      el.getAttribute('aria-label').replace(/\. \d+ stars? earned\.$/, ''),
    ),
  );

async function measureGame(title, where) {
  if (!(await openGame(page, title))) return false;
  await page.waitForTimeout(500);
  // A group game asks how many are playing first.
  if (await page.getByLabel('2 players', { exact: true }).count()) {
    await measure(`${where}, choosing players`);
    await page.getByLabel('2 players', { exact: true }).click();
    await page.waitForTimeout(400);
    // Star Jar asks each player what kind of question they'd like.
    for (let i = 0; i < 2; i += 1) {
      const kind = page.getByLabel(new RegExp(`^Player ${i + 1}: `)).first();
      if (await kind.count()) {
        await kind.click();
        await page.waitForTimeout(300);
      }
    }
  }
  await measure(where, { sudoku: title === 'Sudoku' });
  await backHome(page, report, title);
  return true;
}

const adminPassword = process.env.PLAYTEST_ADMIN_PASSWORD;
if (adminPassword) {
  for (const level of [1, 6]) {
    console.log(`\n=== every game at level ${level} ===`);
    await page.getByLabel('Parent zone, grown-ups only').click();
    await page.waitForTimeout(500);
    await passParentGate(page);
    const box = page.getByLabel('Admin password');
    for (let i = 0; i < 14 && !(await box.count()); i += 1) {
      await page.mouse.wheel(0, 700);
      await page.waitForTimeout(150);
    }
    if (!(await page.getByLabel(`Level ${level}`).count())) {
      await box.fill(adminPassword);
      await page.getByLabel('Turn on admin mode').click();
      await page.waitForTimeout(1200);
    }
    await page.getByLabel(`Level ${level}`).click();
    await page.waitForTimeout(200);
    await page.getByLabel('Done', { exact: true }).first().click();
    await page.waitForTimeout(600);
    const titles = await listed();
    console.log(`  (${titles.length} games listed)`);
    for (const title of titles) {
      if (!(await measureGame(title, `${title}, level ${level}`))) report.bug(title, 'listed, but its card could not be opened');
    }
  }
} else {
  const seen = new Set();
  for (const age of [3, 8, 17]) {
    console.log(`\n=== every game for age ${age} ===`);
    await setAge(page, age);
    for (const title of await listed()) {
      if (seen.has(title)) continue;
      if (await measureGame(title, `${title}, age ${age}`)) seen.add(title);
      else report.bug(title, 'listed, but its card could not be opened');
    }
  }
  console.log(`  (${seen.size} games measured)`);
}

const code = summarise(report, errors);
await browser.close();
process.exit(code);
