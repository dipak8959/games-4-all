import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import {
  font,
  gutter,
  hitTarget,
  palette,
  playColor,
  playPalette,
  radius,
  rule,
  space,
} from '../src/theme/tokens.ts';

/**
 * The `Games Hub` design handoff, held in place.
 *
 * Its rules are load-bearing rather than decorative — zero radius, flat
 * fills, structure carried by 2px and 1px rules, one accent used sparingly —
 * so they are asserted here the same way the safety rules are asserted by
 * `npm run safety`. A future "just round this one corner" has to argue with
 * a failing test rather than slip in unnoticed.
 */

test('the palette is the handoff\'s, exactly', () => {
  assert.equal(palette.bg, '#f3f2f2', 'ground');
  assert.equal(palette.surface, '#eae9e9', 'surface');
  assert.equal(palette.ink, '#201e1d', 'ink');
  assert.equal(palette.inkSoft, '#605d5d', 'muted text');
  assert.equal(palette.border, 'rgba(32,30,29,0.4)', 'divider');
  assert.equal(palette.accent, '#ec3013');
  assert.equal(palette.accentHover, '#dd2b0f');
  assert.equal(palette.accentPressed, '#ae1800');
  assert.equal(palette.accentText, '#ae1800', 'body-size red on a light ground');
  assert.equal(palette.accentTint, '#ffe0d9');
  assert.equal(palette.accentTintText, '#7c1405');
  assert.equal(palette.surfaceAlt, '#d7d3d3', 'placeholder fill');
});

test('radius is zero, everywhere', () => {
  assert.equal(radius, 0);
});

test('rules are 2px between sections and 1px between rows', () => {
  assert.deepEqual({ ...rule }, { major: 2, hair: 1 });
});

test('spacing is the handoff\'s 4/8/12/16/24/32, on a 16px gutter', () => {
  assert.deepEqual(Object.values(space), [4, 8, 12, 16, 24, 32]);
  assert.equal(gutter, 16);
});

test('the type scale is the handoff\'s', () => {
  assert.equal(font.display, 42);
  assert.equal(font.h2, 32);
  assert.equal(font.h3, 25);
  assert.equal(font.h5, 16);
  assert.equal(font.body, 15);
  assert.equal(font.secondary, 13);
  assert.equal(font.meta, 12);
  assert.equal(font.mono, 10);
  assert.equal(font.monoSm, 9);
});

test('touch targets stay at 72dp — larger than the handoff draws them, never smaller', () => {
  // The handoff's rows are 44-52px. This app's floor is higher on purpose
  // (SAFETY.md, "Big targets"), so the two only ever disagree in the safe
  // direction.
  assert.ok(hitTarget >= 52, `${hitTarget} is below the handoff's own CTA height`);
});

test('play colours survive the flattening, and resolve safely', () => {
  // Chrome went to ink, but colour still identifies people and play objects:
  // a four-year-old picks "the blue one" long before they can read a name,
  // and Sort It Out literally sorts by colour.
  assert.ok(Object.keys(playPalette).length >= 5);
  assert.equal(playColor('sky'), playPalette.sky);
  assert.equal(playColor('not-a-colour'), playPalette.sky, 'unknown keys fall back, never crash');
});

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return path.endsWith('.ts') || path.endsWith('.tsx') ? [path] : [];
  });
}

/**
 * Circles are geometry, not rounded corners: the icon set draws rings and
 * dots, and Sort It Out draws an actual circle to sort. Everything else in
 * the app is square.
 */
const MAY_DRAW_CIRCLES = ['src/components/Icon.tsx', 'src/games/shapes/Shape.tsx'];

test('nothing rounds a corner', () => {
  const offenders = sourceFiles('src')
    .filter((path) => !MAY_DRAW_CIRCLES.includes(path))
    .filter((path) => readFileSync(path, 'utf8').includes('borderRadius'));

  assert.deepEqual(offenders, [], `borderRadius found in: ${offenders.join(', ')}`);
});

test('nothing casts a shadow', () => {
  const shadowProps = /shadowColor|shadowOpacity|shadowRadius|shadowOffset|elevation:/;
  const offenders = sourceFiles('src').filter((path) => shadowProps.test(readFileSync(path, 'utf8')));

  assert.deepEqual(offenders, [], `shadow styling found in: ${offenders.join(', ')}`);
});

test('nothing draws a gradient, and no gradient library is installed', () => {
  const offenders = sourceFiles('src').filter((path) =>
    /LinearGradient|expo-linear-gradient/.test(readFileSync(path, 'utf8')),
  );
  assert.deepEqual(offenders, [], `gradient usage found in: ${offenders.join(', ')}`);

  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
    dependencies?: Record<string, string>;
  };
  assert.ok(
    !('expo-linear-gradient' in (pkg.dependencies ?? {})),
    'the flat design needs no gradient dependency',
  );
});
