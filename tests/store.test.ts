import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

/**
 * What the App Store and Google Play check on submission, held here so a
 * change can't quietly undo it. See SUBMISSION.md.
 */

test('store-facing config: no network or overlay permission, iPad full screen, privacy manifest, real version', () => {
  const app = JSON.parse(readFileSync('app.json', 'utf8')).expo;
  assert.match(app.version, /^[1-9]\d*\.\d+\.\d+$/, 'a release version, not 0.x');
  assert.equal(app.ios.requireFullScreen, true, 'portrait-only on iPad needs full screen');
  assert.equal(app.ios.privacyManifests.NSPrivacyTracking, false);
  assert.deepEqual(app.ios.privacyManifests.NSPrivacyCollectedDataTypes, []);
  const declared = app.ios.privacyManifests.NSPrivacyAccessedAPITypes.map((t: { NSPrivacyAccessedAPIType: string }) => t.NSPrivacyAccessedAPIType);
  for (const api of ['UserDefaults', 'FileTimestamp', 'SystemBootTime']) {
    assert.ok(declared.includes(`NSPrivacyAccessedAPICategory${api}`), `${api} declared`);
  }
  const config = readFileSync('app.config.ts', 'utf8');
  for (const permission of ['INTERNET', 'SYSTEM_ALERT_WINDOW']) assert.match(config, new RegExp(`android\\.permission\\.${permission}`));
  // Blocked by default: only an explicit development build keeps them.
  assert.match(config, /const isDev = process\.env\.APP_VARIANT === 'development';/);
});

test('the privacy policy on the web is the one in the app, word for word, and loads nothing from elsewhere', async () => {
  const { APP_VERSION, PRIVACY_POLICY } = await import('../src/safety/privacyPolicy.ts');
  const app = JSON.parse(readFileSync('app.json', 'utf8')).expo;
  assert.equal(APP_VERSION, app.version, 'privacyPolicy.ts APP_VERSION must match app.json');
  const html = readFileSync('docs/privacy.html', 'utf8');
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  for (const section of PRIVACY_POLICY) {
    assert.ok(html.includes(escape(section.heading)), `"${section.heading}" missing: run npm run store:pages`);
    for (const p of section.paragraphs) {
      const plain = escape(p).replace(/https:\/\/\S+/g, '');
      assert.ok(html.replace(/<a [^>]*>[^<]*<\/a>/g, '').includes(plain.trim()), `a paragraph of "${section.heading}" differs: run npm run store:pages`);
    }
  }
  for (const file of ['docs/privacy.html', 'docs/support.html', 'docs/index.html']) {
    const page = readFileSync(file, 'utf8');
    assert.doesNotMatch(page, /<script|<link[^>]+stylesheet|src="https?:/i, `${file} loads something from elsewhere`);
  }
});

test('the store listings fit each store\'s limits', () => {
  const { app_store: apple, google_play: play } = JSON.parse(readFileSync('store/listing.json', 'utf8'));
  const limits: [string, string, number][] = [
    ['App Store name', apple.name, 30],
    ['App Store subtitle', apple.subtitle, 30],
    ['App Store promotional text', apple.promotional_text, 170],
    ['App Store description', apple.description, 4000],
    ['Play title', play.title, 30],
    ['Play short description', play.short_description, 80],
    ['Play full description', play.full_description, 4000],
  ];
  for (const [what, text, most] of limits) assert.ok(text.length > 0 && text.length <= most, `${what}: ${text.length} of ${most}`);
  // Apple counts keyword bytes, and the name's words are already searched.
  assert.ok(Buffer.byteLength(apple.keywords) <= 100, `keywords: ${Buffer.byteLength(apple.keywords)} bytes`);
  for (const word of apple.name.toLowerCase().split(/\s+/)) {
    assert.ok(!apple.keywords.split(',').includes(word), `keyword "${word}" repeats the name`);
  }
  // Nothing a reviewer would call misleading: no prices, rankings or other platforms.
  for (const text of [apple.description, apple.promotional_text, play.full_description, play.short_description]) {
    assert.doesNotMatch(text, /\$|£|€|#1|number one|best |android|iphone|google play|app store/i);
  }
});

test('store images are the sizes the stores require; the App Store icon has no alpha channel', () => {
  const png = (file: string) => {
    const b = readFileSync(file);
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), alpha: b[25] === 6 || b[25] === 4 };
  };
  const icon = png('assets/icon.png');
  assert.deepEqual([icon.w, icon.h, icon.alpha], [1024, 1024, false]);
  const sizes: Record<string, [number, number]> = { 'iphone-6.9': [1320, 2868], 'ipad-13': [2064, 2752], android: [1080, 1920] };
  for (const [dir, [w, h]] of Object.entries(sizes)) {
    const shots = readdirSync(`store/screenshots/${dir}`).filter((f) => f.endsWith('.png'));
    assert.ok(shots.length >= 3 && shots.length <= 8, `${dir}: ${shots.length} screenshots`);
    for (const f of shots) {
      const s = png(`store/screenshots/${dir}/${f}`);
      assert.deepEqual([s.w, s.h], [w, h], `${dir}/${f}`);
    }
  }
  const feature = png('store/play-feature-graphic.png');
  assert.deepEqual([feature.w, feature.h], [1024, 500]);
  const playIcon = png('store/play-icon-512.png');
  assert.deepEqual([playIcon.w, playIcon.h], [512, 512]);
});
