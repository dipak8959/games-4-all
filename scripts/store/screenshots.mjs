/**
 * Store screenshots, straight from the app: the web build in a browser at the
 * sizes each store asks for, set up the way a parent would set it up.
 *
 *   store/screenshots/iphone-6.9/   1320×2868, App Store (required)
 *   store/screenshots/ipad-13/      2064×2752, App Store (required: the app runs on iPad)
 *   store/screenshots/android/      1080×1920, Google Play phone
 *   store/play-feature-graphic.png  1024×500,  Google Play (required)
 *   store/play-icon-512.png         512×512,   Google Play (required)
 *
 * Nothing is staged or mocked up: every screen is one a player meets. Needs
 * Playwright and the web build served, like the playtests:
 *
 *   npx expo export --platform web --output-dir dist-web
 *   python3 -m http.server 8099 --directory dist-web &
 *   PLAYTEST_CHROME=/path/to/chrome node scripts/store/screenshots.mjs
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

import { passParentGate } from '../playtest/harness.mjs';
import { PLAYERS } from '../playtest/players.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'store');
const BASE_URL = process.env.PLAYTEST_URL ?? 'http://localhost:8099';

const DEVICES = [
  { dir: 'iphone-6.9', viewport: { width: 440, height: 956 }, scale: 3 },
  { dir: 'ipad-13', viewport: { width: 1032, height: 1376 }, scale: 2 },
  { dir: 'android', viewport: { width: 360, height: 640 }, scale: 3 },
];

const browser = await chromium.launch({ executablePath: process.env.PLAYTEST_CHROME || undefined });

/** First launch, as a parent would do it: a profile called Star, aged 6. */
async function setUp(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.getByLabel("Let's set this up").click();
  await page.waitForTimeout(500);
  await passParentGate(page);
  await page.getByLabel('Star', { exact: true }).click();
  const age = async () => parseInt(await page.getByLabel(/^\d+ years old$/).innerText(), 10);
  for (let i = 0; i < 12 && (await age()) !== 6; i += 1) {
    await page.getByLabel((await age()) < 6 ? 'Older' : 'Younger').click();
    await page.waitForTimeout(60);
  }
  await page.getByLabel('Start playing').click();
  await page.waitForTimeout(1200);
}

async function openGame(page, title) {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (let i = 0; i < 8; i += 1) {
    const tile = page.getByLabel(new RegExp(`^${escaped}\\.`)).first();
    if (await tile.count()) {
      await tile.scrollIntoViewIfNeeded();
      await tile.click();
      await page.waitForTimeout(1200);
      return;
    }
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(300);
  }
  throw new Error(`${title} is not on Home`);
}

async function home(page) {
  await page.getByLabel('Back to games').first().click();
  await page.waitForTimeout(600);
  await page.evaluate(() => window.scrollTo(0, 0));
}

for (const device of DEVICES) {
  const dir = join(OUT, 'screenshots', device.dir);
  mkdirSync(dir, { recursive: true });
  const page = await browser.newPage({ viewport: device.viewport, deviceScaleFactor: device.scale });
  const shot = (name) => page.screenshot({ path: join(dir, `${name}.png`) });

  await setUp(page);
  await shot('01-home');

  await openGame(page, 'Balloon Count');
  await shot('02-balloon-count');
  await home(page);

  await openGame(page, 'Dot to Dot');
  // A few dots joined, the way a child would: the next one each time.
  for (let i = 0; i < 4; i += 1) {
    const field = await page.getByTestId('field').boundingBox();
    const next = await page.evaluate(() => {
      const dots = [...document.querySelectorAll('[data-testid^="dot:"]')];
      const el = dots.find((d) => d.dataset.testid.endsWith(':0'));
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
    });
    if (!next || !field) break;
    await page.mouse.click(next.x, next.y);
    await page.waitForTimeout(250);
  }
  await shot('03-dot-to-dot');
  await home(page);

  await openGame(page, 'Water Works');
  await shot('04-water-works');
  await home(page);

  await openGame(page, 'Hungry Worm');
  await shot('05-hungry-worm');
  await home(page);

  // A round played to its end, for the stars and a few words from a sportsperson.
  await openGame(page, 'How Many?');
  await PLAYERS['How Many?'](page, { bug() {}, ok() {} });
  await page.waitForTimeout(1500);
  await shot('06-round-complete');
  await page.getByLabel('Back to games').first().click();
  await page.waitForTimeout(800);

  await page.getByLabel('Parent zone, grown-ups only').click();
  await page.waitForTimeout(500);
  await passParentGate(page);
  await page.waitForTimeout(600);
  await shot('07-parent-zone');

  await page.close();
  console.log(`wrote store/screenshots/${device.dir}/ (7 screens)`);
}

// Google Play's feature graphic and icon, drawn from the app's mark.
const icon = `data:image/svg+xml;base64,${readFileSync(join(ROOT, 'assets', 'brand', 'icon.svg')).toString('base64')}`;
const tiles = `data:image/svg+xml;base64,${readFileSync(join(ROOT, 'assets', 'brand', 'splash-icon.svg')).toString('base64')}`;
const page = await browser.newPage({ viewport: { width: 1024, height: 500 } });
await page.setContent(`<body style="margin:0;width:1024px;height:500px;background:#f3f2f2;display:flex;align-items:center;gap:56px;padding:0 72px;box-sizing:border-box;font-family:Helvetica,Arial,sans-serif;color:#201e1d">
  <img src="${tiles}" style="width:300px;height:300px">
  <div><div style="font:700 15px/1 monospace;letter-spacing:3px;color:#605d5d">OFFLINE · NO ADS · NOTHING TO BUY</div>
  <div style="font-weight:800;font-size:76px;line-height:1;margin:14px 0 18px">Games 4 All</div>
  <div style="font-size:28px;line-height:1.3;max-width:520px">Sixty calm games that grow with your child.</div></div></body>`);
await page.screenshot({ path: join(OUT, 'play-feature-graphic.png') });
await page.setViewportSize({ width: 512, height: 512 });
await page.setContent(`<body style="margin:0"><img src="${icon}" style="width:512px;height:512px;display:block"></body>`);
await page.screenshot({ path: join(OUT, 'play-icon-512.png') });
console.log('wrote store/play-feature-graphic.png and store/play-icon-512.png');
await browser.close();
