/**
 * Writes the web pages the store listings point to — docs/privacy.html,
 * docs/support.html and docs/index.html — from the same text the app shows
 * (src/safety/privacyPolicy.ts). Served by GitHub Pages from /docs.
 *
 * The pages load nothing from anywhere else: no fonts, scripts or images
 * from other sites, so reading a privacy policy doesn't tell anyone you did.
 *
 *   npm run store:pages
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { APP_NAME, APP_VERSION, POLICY_DATE, PRIVACY_POLICY, SUPPORT_URL } from '../../src/safety/privacyPolicy.ts';

const DOCS = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs');

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** Links a bare URL in running text. */
const linkify = (s) => escape(s).replace(/https:\/\/[^\s<]+/g, (url) => `<a href="${url}">${url.replace(/^https:\/\//, '')}</a>`);

const page = (title, body) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title>
<style>
  :root { --bg: #f3f2f2; --ink: #201e1d; --soft: #605d5d; --rule: #d7d3d3; --accent: #ae1800; color-scheme: light; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 17px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  main { max-width: 680px; margin: 0 auto; padding: 32px 20px 64px; }
  .mark { display: grid; grid-template-columns: 20px 20px; gap: 3px; margin-bottom: 20px; }
  .mark span { width: 20px; height: 20px; }
  .label { font: 600 12px/1.4 ui-monospace, Menlo, Consolas, monospace; letter-spacing: 0.08em; text-transform: uppercase; color: var(--soft); }
  h1 { font-size: 36px; line-height: 1.1; margin: 6px 0 4px; text-wrap: balance; }
  h2 { font-size: 19px; margin: 32px 0 8px; padding-top: 16px; border-top: 1px solid var(--rule); }
  p, li { max-width: 62ch; }
  a { color: var(--accent); }
  nav { display: flex; gap: 20px; margin: 20px 0 8px; flex-wrap: wrap; }
  dt { font-weight: 700; margin-top: 18px; }
  dd { margin: 4px 0 0; }
</style>
</head>
<body>
<main>
<div class="mark" aria-hidden="true"><span style="background:#ec3013"></span><span style="background:#0091D6"></span><span style="background:#F3A712"></span><span style="background:#00A97A"></span></div>
<div class="label">${escape(APP_NAME)}</div>
${body}
<nav><a href="index.html">About</a><a href="support.html">Support</a><a href="privacy.html">Privacy policy</a></nav>
</main>
</body>
</html>
`;

const privacy = page(
  `Privacy policy — ${APP_NAME}`,
  `<h1>Privacy policy</h1>
<p class="label">Dated ${escape(POLICY_DATE)} · version ${escape(APP_VERSION)}</p>
${PRIVACY_POLICY.map((s) => `<h2>${escape(s.heading)}</h2>\n${s.paragraphs.map((p) => `<p>${linkify(p)}</p>`).join('\n')}`).join('\n')}`,
);

const FAQ = [
  ['Where are the settings?', 'On the Home screen, tap Parent Zone and answer the grown-ups’ question (it asks you to work out a sum like 7 × 93). Profiles, play-time limits, sound, vibration and reduced motion are all there.'],
  ['How do I limit play time?', 'In Parent Zone, choose a limit for each sitting and for each day. When a limit arrives mid-round, the round finishes first (for three minutes at most), then a break screen appears. A sitting ends after ten minutes away from play; the day’s allowance comes back at midnight.'],
  ['Why did the game stop?', 'A play-time limit was reached. The break screen says how long is left, and clears itself when the break is over. A grown-up can change the limit in Parent Zone.'],
  ['Which games will my child see?', 'The ones that suit the age in their profile. Each game starts at a level for that age, steps up after a clean round and down after a rough one.'],
  ['Does it need the internet, or cost anything?', 'No. It works entirely offline, and there is nothing to buy, no ads and no account.'],
  ['How do I delete everything?', 'Parent Zone → Delete all data, or delete the app. Nothing is stored anywhere else.'],
];

const support = page(
  `Support — ${APP_NAME}`,
  `<h1>Support</h1>
<p>Questions, a problem, or something that doesn’t seem right? Tell us at <a href="${SUPPORT_URL}">${SUPPORT_URL.replace(/^https:\/\//, '')}</a> and we’ll answer there.</p>
<h2>Common questions</h2>
<dl>
${FAQ.map(([q, a]) => `<dt>${escape(q)}</dt><dd>${escape(a)}</dd>`).join('\n')}
</dl>`,
);

const index = page(
  APP_NAME,
  `<h1>${escape(APP_NAME)}</h1>
<p>Sixty short, calm games for children and families — counting, reading, memory, logic, timing, and games to play together on one device.</p>
<p>Every game grows with the player and every round has a fixed end. No ads, no accounts, nothing to buy, no scores to chase, and it works entirely offline.</p>`,
);

mkdirSync(DOCS, { recursive: true });
writeFileSync(join(DOCS, 'privacy.html'), privacy);
writeFileSync(join(DOCS, 'support.html'), support);
writeFileSync(join(DOCS, 'index.html'), index);
console.log('wrote docs/index.html, docs/support.html, docs/privacy.html');
