/**
 * One routine per game: play a round through to the end, correctly.
 *
 * Each of these works out the right answer from what's on screen rather than
 * from the game's own logic, so a round only completes if the board, the
 * labels and the rules genuinely agree with each other.
 */
import { roundResult } from './harness.mjs';

/** Reads the memory board as a list of `{ locator, label }`. */
async function memoryBoard(page) {
  const out = [];
  for (const card of await page.getByRole('button').all()) {
    const label = (await card.getAttribute('aria-label')) ?? '';
    if (/Face down card|Card showing/.test(label)) out.push({ card, label });
  }
  return out;
}

export async function playMemory(page, report) {
  const size = (await memoryBoard(page)).length;
  if (size === 0 || size % 2 !== 0) {
    report.bug('Find the Pairs', `dealt ${size} cards — a pairs game needs an even number`);
    return;
  }
  report.ok(`dealt ${size} cards`);

  // Turn every card over once to learn the layout, letting each peek resolve.
  const symbols = new Map();
  for (let i = 0; i < size; i += 1) {
    if (await roundResult(page)) break;
    const cards = await memoryBoard(page);
    if (cards[i].label !== 'Face down card') continue;
    await cards[i].card.click();
    await page.waitForTimeout(260);
    symbols.set(i, (await memoryBoard(page))[i].label.replace('Card showing ', ''));
    await page.waitForTimeout(1400);
  }

  const pairs = new Map();
  for (const [i, symbol] of symbols) pairs.set(symbol, [...(pairs.get(symbol) ?? []), i]);
  for (const [symbol, idxs] of pairs) {
    if (idxs.length !== 2) {
      report.bug('Find the Pairs', `${symbol} was dealt ${idxs.length} time(s), not as a pair`);
    }
  }

  for (const [, idxs] of pairs) {
    if (idxs.length !== 2) continue;
    if (await roundResult(page)) break;
    let cards = await memoryBoard(page);
    if (cards[idxs[0]].label === 'Face down card') {
      await cards[idxs[0]].card.click();
      await page.waitForTimeout(260);
    }
    if (await roundResult(page)) break;
    cards = await memoryBoard(page);
    if (cards[idxs[1]].label === 'Face down card') {
      await cards[idxs[1]].card.click();
      await page.waitForTimeout(900);
    }
  }
}

export async function playCounting(page, report) {
  for (let q = 0; q < 14; q += 1) {
    if (await roundResult(page)) break;
    const stage = await page.getByLabel(/\d+ objects to count/).first().getAttribute('aria-label');
    const count = parseInt(stage.match(/\d+/)[0], 10);
    const answer = page.getByLabel(String(count), { exact: true }).first();
    if (!(await answer.count())) {
      report.bug('How Many?', `the correct answer ${count} was not offered as a choice`);
      break;
    }
    await answer.click();
    await page.waitForTimeout(440);
  }
}

export async function playShapes(page, report) {
  for (let item = 0; item < 24; item += 1) {
    if (await roundResult(page)) break;
    const rule = (await page.getByText(/^MATCH THE /).first().innerText()).trim();
    const itemLabel = await page.getByLabel(/^Sort this /).first().getAttribute('aria-label');
    const described = itemLabel.replace('Sort this ', '').replace(/ shape$/, '');

    // "Sort this green circle" against "Basket for circle" or "Basket for
    // green"; "Sort this small" against "Basket for small things".
    let want;
    if (/SIZE/.test(rule)) want = `Basket for ${described} things`;
    else if (/SHAPE/.test(rule)) want = `Basket for ${described.split(' ')[1]}`;
    else want = `Basket for ${described.split(' ')[0]}`;

    const basket = page.getByLabel(want).first();
    if (!(await basket.count())) {
      const available = [];
      for (const b of await page.getByLabel(/^Basket for /).all()) {
        available.push(await b.getAttribute('aria-label'));
      }
      report.bug(
        'Sort It Out',
        `no basket matches "${itemLabel}" under ${rule}. Wanted "${want}", saw: ${available.join(' | ')}`,
      );
      break;
    }
    await basket.click();
    await page.waitForTimeout(420);
  }
}

export async function playWordBuilder(page, report) {
  for (let w = 0; w < 12; w += 1) {
    if (await roundResult(page)) break;
    // The picture carries the word as its label.
    const stage = page.getByLabel(/^[a-z]+$/i).first();
    if (!(await stage.count())) {
      report.bug('Spell It!', 'could not read the word from the picture');
      break;
    }
    const word = (await stage.getAttribute('aria-label')).toUpperCase();
    for (const letter of word) {
      // A word like BOOK has two O tiles and one may already be spent, so
      // take the first one still enabled rather than the first one matching.
      const all = await page.getByLabel(letter, { exact: true }).all();
      let clicked = false;
      for (const tile of all) {
        if (await tile.isEnabled()) {
          await tile.click();
          clicked = true;
          break;
        }
      }
      if (!clicked) {
        report.bug('Spell It!', `"${word}" needs "${letter}" but no enabled tile offers it`);
        break;
      }
      await page.waitForTimeout(190);
    }
    await page.waitForTimeout(500);
  }
}

/** Which tile is lit right now, by label and by fill. The two are read
 *  separately on purpose: if they ever disagree, the lit state has stopped
 *  reaching the accessibility tree and the game is signalling by colour
 *  alone. */
async function litTile(page) {
  return page.evaluate(() => {
    const tiles = [...document.querySelectorAll('[role="button"]')].filter((el) =>
      / tile(, lit)?$/.test(el.getAttribute('aria-label') ?? ''),
    );
    const named = tiles.find((el) => /, lit$/.test(el.getAttribute('aria-label')));
    const accent = tiles.find(
      (el) => getComputedStyle(el).backgroundColor === 'rgb(236, 48, 19)',
    );
    const bare = (el) => (el ? el.getAttribute('aria-label').replace(/, lit$/, '') : null);
    return { byLabel: bare(named), byColour: bare(accent) };
  });
}

export async function playPatternPlay(page, report) {
  // Watch: poll for the lit tile and record the order it lights up in.
  const seen = [];
  let last = null;
  for (let t = 0; t < 400; t += 1) {
    const { byLabel, byColour } = await litTile(page);
    if (byLabel !== byColour) {
      report.bug(
        'Pattern Play',
        `the lit tile is ${byColour ?? 'none'} on screen but ${byLabel ?? 'none'} in the accessibility tree`,
      );
    }
    if (byLabel && byLabel !== last) seen.push(byLabel);
    last = byLabel;
    if (await page.getByText('NOW REPEAT IT BACK').count()) break;
    await page.waitForTimeout(50);
  }
  if (seen.length === 0) {
    report.bug('Pattern Play', 'no tile ever lit up during the reveal');
    return;
  }
  report.ok(`watched a ${seen.length}-step sequence`);

  for (const label of seen) {
    await page.getByLabel(label, { exact: true }).first().click();
    await page.waitForTimeout(170);
  }
  await page.waitForTimeout(800);
}

export async function playNumberCrunch(page, report) {
  for (let q = 0; q < 14; q += 1) {
    if (await roundResult(page)) break;
    const sum = await page.getByLabel(/^\d+ [-+×÷−] \d+$/).first().getAttribute('aria-label');
    const [, a, op, b] = sum.match(/^(\d+) ([-+×÷−]) (\d+)$/);
    const [x, y] = [Number(a), Number(b)];
    const answer = op === '+' ? x + y : op === '×' ? x * y : op === '÷' ? x / y : x - y;
    const choice = page.getByLabel(String(answer), { exact: true }).first();
    if (!(await choice.count())) {
      const offered = [];
      for (const c of await page.getByRole('button').all()) {
        const label = await c.getAttribute('aria-label');
        if (/^\d+$/.test(label ?? '')) offered.push(label);
      }
      report.bug('Number Crunch', `${sum} = ${answer} but that was not offered. Saw: ${offered.join(', ')}`);
      break;
    }
    await choice.click();
    await page.waitForTimeout(430);
  }
}

/** Plain backtracking — the harness has to solve the puzzle itself, since
 *  the only thing it is allowed to read is the board on screen. */
function solve(grid, size, boxH, boxW) {
  const idx = grid.findIndex((v) => v === 0);
  if (idx === -1) return true;
  const row = Math.floor(idx / size);
  const col = idx % size;
  for (let v = 1; v <= size; v += 1) {
    let fits = true;
    for (let i = 0; i < size; i += 1) {
      if (grid[row * size + i] === v || grid[i * size + col] === v) fits = false;
    }
    const br = Math.floor(row / boxH) * boxH;
    const bc = Math.floor(col / boxW) * boxW;
    for (let r = br; r < br + boxH; r += 1) {
      for (let c = bc; c < bc + boxW; c += 1) if (grid[r * size + c] === v) fits = false;
    }
    if (!fits) continue;
    grid[idx] = v;
    if (solve(grid, size, boxH, boxW)) return true;
    grid[idx] = 0;
  }
  return false;
}

export async function playSudoku(page, report) {
  const read = async () => {
    const out = [];
    for (const c of await page.getByLabel(/^(empty cell|\d+)$/).all()) {
      out.push(await c.getAttribute('aria-label'));
    }
    return out;
  };
  const values = await read();
  const size = Math.round(Math.sqrt(values.length));
  if (size * size !== values.length) {
    report.bug('Sudoku', `board is not square: ${values.length} cells read`);
    return;
  }
  report.ok(`read a ${size}x${size} board`);

  // Box shape by board size, matching `sizeForLevel` in the game's logic.
  const boxH = size === 6 ? 2 : size === 4 ? 2 : 3;
  const boxW = size === 6 ? 3 : size === 4 ? 2 : 3;
  const grid = values.map((v) => (v === 'empty cell' ? 0 : Number(v)));
  const given = grid.map((v) => v !== 0);
  if (!solve(grid, size, boxH, boxW)) {
    report.bug('Sudoku', `the ${size}x${size} puzzle dealt has no solution`);
    return;
  }
  report.ok('puzzle solved, entering answers');

  for (let i = 0; i < grid.length; i += 1) {
    if (given[i]) continue;
    if (await roundResult(page)) break;
    const cell = (await page.getByLabel(/^(empty cell|\d+)$/).all())[i];
    await cell.click();
    await page.waitForTimeout(110);
    await page.getByLabel(`Enter ${grid[i]}`).click();
    await page.waitForTimeout(130);
  }
}

export const PLAYERS = {
  'Find the Pairs': playMemory,
  'How Many?': playCounting,
  'Sort It Out': playShapes,
  'Spell It!': playWordBuilder,
  'Pattern Play': playPatternPlay,
  'Number Crunch': playNumberCrunch,
  Sudoku: playSudoku,
};
