import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The interface carries no emoji.
 *
 * Icons are geometry the app draws (`src/components/Icon.tsx`) and profiles
 * are a letter on a colour (`Avatar.tsx`), so nothing in the chrome depends
 * on a glyph that renders differently — or not at all — from one device to
 * the next.
 *
 * Three games still use emoji as their actual playable material: the symbols
 * you match, the objects you count, and the picture clue you spell. Those are
 * content, not decoration, and are listed here explicitly so the exemption
 * stays deliberate rather than accidental.
 *
 * Pattern Play used to be a fourth. Its tiles were emoji too, but they were
 * never really content — they were nine arbitrary faces used to tell nine
 * buttons apart, and full-colour cartoons sat badly on a flat ink interface.
 * They are drawn marks now (`PatternMark.tsx`), which is both more on-system
 * and a better fit for the game: they take the colour they are given, so a
 * lit tile inverts cleanly.
 */
const CONTENT_FILES = [
  'src/games/memory/logic.ts',
  'src/games/counting/logic.ts',
  'src/games/wordbuilder/logic.ts',
];

/**
 * Monochrome typographic glyphs the app uses on purpose: the star pip on a
 * game card, and the suit shapes Sort It Out draws. These take their colour
 * from the stylesheet like any letter and render as text, not as a colour
 * picture, so they are typography rather than emoji.
 */
const TEXT_GLYPHS = /[★☆♥♦▲▼●■◆]/gu;

/** Pictographic emoji — anything with its own colour presentation. Maths
 *  operators (× ÷ −) sit outside these ranges already. */
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;

const hasEmoji = (source: string): boolean => EMOJI.test(source.replace(TEXT_GLYPHS, ''));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return path.endsWith('.ts') || path.endsWith('.tsx') ? [path] : [];
  });
}

test('no emoji anywhere in the interface', () => {
  const offenders = sourceFiles('src')
    .filter((path) => !CONTENT_FILES.includes(path))
    .filter((path) => hasEmoji(readFileSync(path, 'utf8')));

  assert.deepEqual(offenders, [], `emoji found in chrome: ${offenders.join(', ')}`);
});

test('the content exemption list stays honest', () => {
  // If a listed file stops using emoji, it should come off the list rather
  // than sit there granting a permission nothing needs.
  for (const path of CONTENT_FILES) {
    assert.ok(hasEmoji(readFileSync(path, 'utf8')), `${path} no longer needs its exemption`);
  }
});
