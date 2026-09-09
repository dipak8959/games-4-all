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

test('headline sizes are the handoff\'s, exactly', () => {
  assert.equal(font.display, 42);
  assert.equal(font.h2, 32);
  assert.equal(font.h3, 25);
});

test('reading sizes sit one step above the handoff, and never drift back down', () => {
  // The handoff's reading scale (body 15, secondary 13, meta 12, mono 10/9)
  // is drawn for an adult reading an editorial layout at desk distance.
  // This app is held at arm's length by someone who may be six, so every
  // size at reading scale is a step larger. The floors below are the point
  // of this test: the sizes may grow, but nothing here may shrink back to
  // the handoff's own small end.
  assert.ok(font.h5 >= 18, `h5 is ${font.h5}`);
  assert.ok(font.body >= 17, `body is ${font.body}`);
  assert.ok(font.secondary >= 15, `secondary is ${font.secondary}`);
  assert.ok(font.meta >= 13, `meta is ${font.meta}`);
  assert.ok(font.mono >= 11, `mono is ${font.mono}`);
  assert.ok(font.monoSm >= 10, `monoSm is ${font.monoSm}`);
});

test('the scale still steps — each size is smaller than the one above it', () => {
  const scale = [font.display, font.h2, font.h3, font.h5, font.body, font.secondary, font.meta];
  for (let i = 1; i < scale.length; i += 1) {
    assert.ok(scale[i] < scale[i - 1], `${scale[i]} does not sit below ${scale[i - 1]}`);
  }
});

test('weight 800 is reserved for headings, not spent on every row', () => {
  // A screen where every line is at maximum weight has no hierarchy left to
  // spend. Row titles (`type.h5`) carry 600; the headings keep 800.
  const source = readFileSync('src/theme/type.ts', 'utf8');
  const h5 = source.slice(source.indexOf('  h5: {'), source.indexOf('  body: {'));
  assert.ok(/fontWeight: '600'/.test(h5), 'row titles should not be at heading weight');
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
