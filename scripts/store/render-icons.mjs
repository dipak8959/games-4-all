/**
 * Draws the app's icons, splash image and favicon from one design, and
 * writes them to assets/ (and the SVG sources to assets/brand/).
 *
 * The mark: four play tiles in a 2×2 grid — red, blue, yellow, green, the
 * app's own colours — each holding one of the shapes the games are built
 * from. Flat, square-cornered and gradient-free, like the rest of the app;
 * the systems round the corners themselves.
 *
 * The App Store icon is written without an alpha channel, which Apple
 * requires. Android's adaptive icon keeps its grid inside the 66dp safe
 * circle, so no launcher mask clips it.
 *
 * Needs Playwright, like the playtests (scripts/playtest/README.md):
 *   PLAYTEST_CHROME=/path/to/chrome node scripts/store/render-icons.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, crc32 } from 'node:zlib';

import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ASSETS = join(ROOT, 'assets');

// From src/theme/tokens.ts.
const BG = '#f3f2f2';
const INK = '#201e1d';
const TILES = [
  { fill: '#ec3013', shape: 'circle', on: BG }, // accent
  { fill: '#0091D6', shape: 'triangle', on: BG }, // sky
  { fill: '#F3A712', shape: 'square', on: INK }, // sun
  { fill: '#00A97A', shape: 'diamond', on: BG }, // leaf
];

/** A shape centred at (cx, cy), about `r` from its middle to its edge. */
function shape(kind, cx, cy, r, fill) {
  switch (kind) {
    case 'circle':
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;
    case 'square':
      return `<rect x="${cx - r * 0.86}" y="${cy - r * 0.86}" width="${r * 1.72}" height="${r * 1.72}" fill="${fill}"/>`;
    case 'triangle': {
      const h = r * 1.9;
      const w = h * 1.12;
      return `<polygon points="${cx},${cy - h * 0.55} ${cx + w / 2},${cy + h * 0.45} ${cx - w / 2},${cy + h * 0.45}" fill="${fill}"/>`;
    }
    case 'diamond':
      return `<polygon points="${cx},${cy - r * 1.18} ${cx + r * 1.18},${cy} ${cx},${cy + r * 1.18} ${cx - r * 1.18},${cy}" fill="${fill}"/>`;
    default:
      throw new Error(kind);
  }
}

/** The 2×2 grid, `size` across, its top-left corner at (x, y). */
function grid(x, y, size, { mono = false } = {}) {
  const gap = size * 0.055;
  const tile = (size - gap) / 2;
  const parts = [];
  const cuts = [];
  TILES.forEach((t, i) => {
    const tx = x + (i % 2) * (tile + gap);
    const ty = y + Math.floor(i / 2) * (tile + gap);
    const cx = tx + tile / 2;
    const cy = ty + tile / 2;
    if (mono) {
      parts.push(`<rect x="${tx}" y="${ty}" width="${tile}" height="${tile}" fill="#fff"/>`);
      cuts.push(shape(t.shape, cx, cy, tile * 0.24, '#000'));
    } else {
      parts.push(`<rect x="${tx}" y="${ty}" width="${tile}" height="${tile}" fill="${t.fill}"/>`);
      parts.push(shape(t.shape, cx, cy, tile * 0.24, t.on));
    }
  });
  if (!mono) return parts.join('');
  // A one-colour icon: the tiles, with the shapes cut out of them.
  return `<defs><mask id="cut"><rect width="100%" height="100%" fill="#fff"/>${cuts.join('')}</mask></defs><g mask="url(#cut)">${parts.join('')}</g>`;
}

const svg = (inner, background) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${background ? `<rect width="1024" height="1024" fill="${background}"/>` : ''}${inner}</svg>`;

/** Each file: its SVG, its size, and whether it may be see-through. */
const OUTPUTS = {
  // The store icon and iOS: the grid on the app's ground, opaque.
  'icon.png': { svg: svg(grid(172, 172, 680), BG), size: 1024, alpha: false },
  // Android's adaptive icon: the grid alone, inside the safe circle, over a plain ground.
  'android-icon-foreground.png': { svg: svg(grid(292, 292, 440)), size: 1024, alpha: true },
  'android-icon-background.png': { svg: svg('', BG), size: 1024, alpha: false },
  'android-icon-monochrome.png': { svg: svg(grid(292, 292, 440, { mono: true })), size: 1024, alpha: true },
  // The launch screen's mark, shown small on the app's ground.
  'splash-icon.png': { svg: svg(grid(112, 112, 800)), size: 1024, alpha: true },
  'favicon.png': { svg: svg(grid(112, 112, 800), BG), size: 48, alpha: false },
};

/** A PNG from raw RGBA pixels: RGB (no alpha channel) or RGBA. */
function encodePng(rgba, size, alpha) {
  const channels = alpha ? 4 : 3;
  const rows = Buffer.alloc((size * channels + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * channels + 1);
    rows[row] = 0; // no filter
    for (let x = 0; x < size; x += 1) {
      for (let c = 0; c < channels; c += 1) rows[row + 1 + x * channels + c] = rgba[(y * size + x) * 4 + c];
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bits per channel
  header[9] = alpha ? 6 : 2; // RGBA or RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const browser = await chromium.launch({ executablePath: process.env.PLAYTEST_CHROME || undefined });
const page = await browser.newPage();
mkdirSync(join(ASSETS, 'brand'), { recursive: true });
for (const [file, { svg: source, size, alpha }] of Object.entries(OUTPUTS)) {
  const pixels = await page.evaluate(
    async ({ source, size }) => {
      const img = new Image();
      img.src = `data:image/svg+xml;base64,${btoa(source)}`;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, size, size);
      // Back as base64: far quicker to hand over than an array of numbers.
      const data = ctx.getImageData(0, 0, size, size).data;
      let binary = '';
      for (let i = 0; i < data.length; i += 0x8000) binary += String.fromCharCode(...data.subarray(i, i + 0x8000));
      return btoa(binary);
    },
    { source, size },
  );
  writeFileSync(join(ASSETS, file), encodePng(Buffer.from(pixels, 'base64'), size, alpha));
  writeFileSync(join(ASSETS, 'brand', file.replace(/\.png$/, '.svg')), source);
  console.log(`wrote assets/${file} (${size}×${size}, ${alpha ? 'RGBA' : 'RGB'})`);
}
await browser.close();
