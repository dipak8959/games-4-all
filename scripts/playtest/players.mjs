/**
 * One routine per game: play a round through to the end, correctly.
 *
 * Each of these works out the right answer from what's on screen rather than
 * from the game's own logic, so a round only completes if the board, the
 * labels and the rules genuinely agree with each other.
 */
import { readFileSync } from 'node:fs';

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

/** Watches one reveal through and returns the tiles in the order they lit. */
export async function watchPattern(page, report) {
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
  return seen;
}

export async function playPatternPlay(page, report) {
  const seen = await watchPattern(page, report);
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

/** A piece as the screen draws it in the tray: each block's position,
 *  worked out from where it sits inside the button. */
async function trayPieces(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('[role="button"]')]
      .filter((el) => /^Piece of/.test(el.getAttribute('aria-label') ?? ''))
      .map((el) => {
        const blocks = [...el.querySelectorAll('[data-testid="piece-block"]')].map((b) =>
          b.getBoundingClientRect(),
        );
        const top = Math.min(...blocks.map((b) => b.top));
        const left = Math.min(...blocks.map((b) => b.left));
        const size = blocks[0].width;
        return {
          label: el.getAttribute('aria-label'),
          placed: el.getAttribute('aria-disabled') === 'true',
          cells: blocks
            .map((b) => [Math.round((b.top - top) / size), Math.round((b.left - left) / size)])
            .sort((a, b) => a[0] - b[0] || a[1] - b[1]),
        };
      }),
  );
}

const norm = (cells) => {
  const r0 = Math.min(...cells.map(([r]) => r));
  const c0 = Math.min(...cells.map(([, c]) => c));
  return cells.map(([r, c]) => [r - r0, c - c0]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
};
const turn = (cells) => norm(cells.map(([r, c]) => [c, -r]));
const k = ([r, c]) => `${r},${c}`;

/** Backtracking over the first open cell: which piece, which way round,
 *  which of its blocks covers it. Returns [{ piece, turns, at }]. */
function packOutline(outline, pieces, canTurn) {
  const open = new Set(outline.map(k));
  const plan = [];
  const go = (left) => {
    if (open.size === 0) return true;
    const target = outline.find((cell) => open.has(k(cell)));
    for (const i of left) {
      let cells = pieces[i];
      for (let t = 0; t < (canTurn ? 4 : 1); t += 1) {
        for (const [r, c] of cells) {
          const at = [target[0] - r, target[1] - c];
          const covers = cells.map(([pr, pc]) => [pr + at[0], pc + at[1]]);
          if (covers.every((cell) => open.has(k(cell)))) {
            covers.forEach((cell) => open.delete(k(cell)));
            plan.push({ piece: i, turns: t, at, first: cells[0] });
            if (go(left.filter((j) => j !== i))) return true;
            plan.pop();
            covers.forEach((cell) => open.add(k(cell)));
          }
        }
        cells = turn(cells);
      }
    }
    return false;
  };
  return go(pieces.map((_, i) => i)) ? plan : null;
}

export async function playShapeBuilder(page, report) {
  const outline = [];
  for (const cell of await page.getByLabel(/^Row \d+, column \d+, /).all()) {
    const [, r, c] = (await cell.getAttribute('aria-label')).match(/^Row (\d+), column (\d+)/);
    outline.push([Number(r) - 1, Number(c) - 1]);
  }
  const tray = await trayPieces(page);
  const canTurn = (await page.getByLabel('Turn the piece').count()) > 0;
  const blocks = tray.reduce((n, p) => n + p.cells.length, 0);
  if (blocks !== outline.length) {
    report.bug('Shape Builder', `the pieces make ${blocks} blocks but the outline has ${outline.length}`);
    return;
  }
  report.ok(`${tray.length} pieces for a ${outline.length}-block outline${canTurn ? ', turning on' : ''}`);

  const plan = packOutline(outline, tray.map((p) => p.cells), canTurn);
  if (!plan) {
    report.bug('Shape Builder', 'the outline cannot be filled with the pieces shown');
    return;
  }

  for (const step of plan) {
    await page.getByLabel(/^Piece of/).nth(step.piece).click();
    await page.waitForTimeout(120);
    for (let t = 0; t < step.turns; t += 1) {
      await page.getByLabel('Turn the piece').click();
      await page.waitForTimeout(80);
    }
    // The piece's first block goes on the tapped cell, so tap where the plan
    // puts that block.
    const [r, c] = [step.at[0] + step.first[0], step.at[1] + step.first[1]];
    await page.getByLabel(new RegExp(`^Row ${r + 1}, column ${c + 1}, empty$`)).click();
    await page.waitForTimeout(160);
  }
}

/**
 * Puddle Hop, played from inside the page: a real-time game needs a player
 * that reacts every frame, and a round trip from the test runner per frame
 * is too slow to time a hop honestly. The player still only uses what's on
 * screen — where the runner is, where each obstacle is and how wide, and
 * how fast they're coming (measured, not read from the game) — and it
 * presses the stage the way a finger would.
 */
/** A page can only be given the tap hook once, and a pass may play more
 *  than one round on the same page. */
const exposed = new WeakSet();
const tapAt = new WeakMap();

export async function playPuddleHop(page, report) {
  const stage = page.getByLabel('Start running');
  const box = await stage.boundingBox();
  const tapX = box.x + box.width / 2;
  const tapY = box.y + box.height * 0.85;
  // Presses are real mouse presses, sent from here: react-native-web ignores
  // pointer events a script fabricates inside the page, as it should. The
  // page only decides *when*. Every hop is held the whole way up — the one
  // size that clears everything.
  tapAt.set(page, { x: tapX, y: tapY });
  if (!exposed.has(page)) {
    exposed.add(page);
    // A long press, for the biggest hop: down now, up once the climb is done.
    await page.exposeFunction('__puddleHopTap', async () => {
      const at = tapAt.get(page);
      await page.mouse.move(at.x, at.y);
      await page.mouse.down();
      setTimeout(() => page.mouse.up().catch(() => {}), 560);
    });
  }
  await page.mouse.click(tapX, tapY);

  const hops = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const AIRTIME = 0.826; // how long a held hop lasts, learned by feel
        let last = null;
        let speed = null;
        let hops = 0;
        let busy = false;
        const started = performance.now();
        const frame = (now) => {
          if (document.querySelector('[aria-label="Play again"]') || now - started > 90000) {
            resolve(hops);
            return;
          }
          const runner = document.querySelector('[data-testid="runner"]')?.getBoundingClientRect();
          const next = [...document.querySelectorAll('[data-testid^="obstacle:"]')]
            .map((el) => ({
              left: el.getBoundingClientRect().left,
              width: Number(el.dataset.testid.split(':')[1]),
            }))
            .filter((o) => runner && o.left + o.width > runner.left)
            .sort((a, b) => a.left - b.left)[0];
          if (next && runner) {
            // How fast things are coming, measured off the obstacle itself.
            if (last && last.width === next.width && last.left > next.left) {
              speed = (last.left - next.left) / ((now - last.at) / 1000);
            }
            last = { ...next, at: now };
            // Hop so the middle of the hop is over the middle of the
            // obstacle, then wait the hop out before deciding again.
            const gap = next.left + next.width / 2 - (runner.left + runner.width / 2);
            if (!busy && speed && gap <= (speed * AIRTIME) / 2 && gap > -next.width / 2) {
              busy = true;
              hops += 1;
              window.__puddleHopTap();
              setTimeout(() => {
                busy = false;
              }, AIRTIME * 1000 + 40);
            }
          }
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }),
  );
  report.ok(`hopped ${hops} times on the way to the flag`);
}

/**
 * Lane Dash, played from inside the page like Puddle Hop: it reads the road
 * off the screen — how many lanes, where your car is, where each obstacle is
 * and which lane it blocks — picks the nearest clear lane for the next row,
 * and taps that lane for real, however far across it is.
 */
const steerHook = new WeakSet();
const steerAt = new WeakMap();

export async function playLaneDash(page, report) {
  // Each lane is its own button; note where each one is, left to right.
  const lanes = [];
  for (const button of await page.getByLabel(/^(Left|Middle|Right) lane/).all()) {
    const box = await button.boundingBox();
    lanes.push({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
  }
  lanes.sort((a, b) => a.x - b.x);
  steerAt.set(page, lanes);
  if (!steerHook.has(page)) {
    steerHook.add(page);
    await page.exposeFunction('__laneDashSteer', (lane) => {
      const at = steerAt.get(page)[lane];
      return page.mouse.click(at.x, at.y);
    });
  }
  await page.getByLabel(/^Right lane/).click(); // the first tap starts the race

  const { presses, hops } = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const road = document.querySelector('[data-testid^="road:"]');
        const lanes = Number(road.dataset.testid.split(':')[1]);
        let lane = Math.floor(lanes / 2);
        let presses = 0;
        let hops = 0;
        let busyUntil = 0;
        const started = performance.now();
        const frame = (now) => {
          if (document.querySelector('[aria-label="Play again"]') || now - started > 90000) {
            resolve({ presses, hops });
            return;
          }
          const car = document.querySelector('[data-testid="player-car"]').getBoundingClientRect();
          const things = [...document.querySelectorAll('[data-testid^="obstacle:"]')].map((el) => ({
            lane: Number(el.dataset.testid.split(':')[1]),
            box: el.getBoundingClientRect(),
          }));
          // Anything level with the car right now: don't swerve into it.
          const alongside = things.some((t) => t.box.bottom > car.top && t.box.top < car.bottom);
          const ahead = things.filter((t) => t.box.bottom <= car.top);
          if (!alongside && ahead.length && now >= busyUntil) {
            const nearest = Math.max(...ahead.map((t) => t.box.bottom));
            const blocked = ahead.filter((t) => Math.abs(t.box.bottom - nearest) < 4).map((t) => t.lane);
            if (blocked.includes(lane)) {
              const free = Array.from({ length: lanes }, (_, l) => l).filter((l) => !blocked.includes(l));
              const target = free.reduce((a, b) => (Math.abs(b - lane) < Math.abs(a - lane) ? b : a));
              if (Math.abs(target - lane) > 1) hops += 1;
              lane = target;
              presses += 1;
              busyUntil = now + 60;
              window.__laneDashSteer(target);
            }
          }
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }),
  );
  report.ok(`steered ${presses} times on the way to the flag, ${hops} of them a hop across two lanes`);
}

/** Odd One Out, played by ear: each shape's label says its size, which way
 *  up it is, its colour and its shape. The odd one is the only one that
 *  differs from all the rest on shape, size or turn. Colour is ignored
 *  entirely, so the game has to be winnable the way a colour-blind child
 *  plays it. */
export async function playOddOneOut(page, report) {
  for (let q = 0; q < 8; q += 1) {
    if (await roundResult(page)) break;
    const buttons = await page.getByRole('button').all();
    const shapes = [];
    for (const b of buttons) {
      const label = (await b.getAttribute('aria-label')) ?? '';
      const m = label.match(/^(small )?(upside-down )?(orange|blue|green|yellow|pink) (circle|square|triangle|star|diamond|heart)$/);
      if (m) shapes.push({ b, small: !!m[1], turned: !!m[2], shape: m[4] });
    }
    const unique = (key) => {
      const counts = new Map();
      for (const s of shapes) counts.set(s[key], (counts.get(s[key]) ?? 0) + 1);
      return counts.size === 2 ? shapes.find((s) => counts.get(s[key]) === 1) : null;
    };
    const odd = unique('shape') ?? unique('small') ?? unique('turned');
    if (!odd) {
      report.bug('Odd One Out', `no shape differs by anything but colour among ${shapes.length}`);
      return;
    }
    await odd.b.click();
    await page.waitForTimeout(350);
  }
}

/** Memory Grid: watch which squares say they're lit, then tap them back once
 *  the pattern has gone — five times over. */
export async function playMemoryGrid(page, report) {
  for (let pattern = 0; pattern < 6; pattern += 1) {
    if (await roundResult(page)) break;
    const seen = new Set();
    for (let t = 0; t < 120; t += 1) {
      const lit = await page.evaluate(() =>
        [...document.querySelectorAll('[role="button"]')]
          .map((el) => el.getAttribute('aria-label') ?? '')
          .filter((l) => /, lit$/.test(l))
          .map((l) => l.replace(/, lit$/, '')),
      );
      lit.forEach((l) => seen.add(l));
      if (seen.size && (await page.getByText('TAP THE ONES THAT LIT UP').count())) break;
      await page.waitForTimeout(50);
    }
    if (seen.size === 0) {
      report.bug('Memory Grid', 'no square ever lit up');
      return;
    }
    for (const label of seen) {
      await page.getByLabel(label, { exact: true }).click();
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(300);
  }
}

/** Shadow Match: read what the thing is, and tap the shadow with its name. */
export async function playShadowMatch(page, report) {
  for (let q = 0; q < 8; q += 1) {
    if (await roundResult(page)) break;
    const thing = await page.getByLabel(/^A (orange|blue|green|yellow|pink) /).first().getAttribute('aria-label');
    const name = thing.replace(/^A \w+ /, '');
    const shadows = [];
    for (const b of await page.getByRole('button').all()) {
      const label = (await b.getAttribute('aria-label')) ?? '';
      const m = label.match(/^Shadow of a (.+?)(, on its side|, upside down)?$/);
      if (m) shadows.push({ b, name: m[1] });
    }
    const matches = shadows.filter((s) => s.name === name);
    if (matches.length !== 1) {
      report.bug('Shadow Match', `${matches.length} shadows of a ${name} among ${shadows.length}`);
      return;
    }
    await matches[0].b.click();
    await page.waitForTimeout(350);
  }
}

/** Which Cup?: note which cup the ball went under, follow that cup across
 *  the screen as it moves, and tap the slot it ends up in. */
export async function playWhichCup(page, report) {
  for (let q = 0; q < 7; q += 1) {
    if (await roundResult(page)) break;
    let shown = false;
    for (let t = 0; t < 80 && !shown; t += 1) {
      shown = (await page.getByLabel(/, the ball is under it$/).count()) > 0;
      if (!shown) await page.waitForTimeout(50);
    }
    if (!shown) {
      report.bug('Which Cup?', 'the ball was never shown going under a cup');
      return;
    }
    // Exact: the header's "Which Cup?" would match a case-blind search.
    await page.getByText('WHICH CUP?', { exact: true }).waitFor({ timeout: 15000 });
    const cup = await page.locator('[data-testid$="-ball"]').first().boundingBox();
    const middle = cup.x + cup.width / 2;
    let picked = false;
    for (const slot of await page.getByLabel(/^Cup \d+$/).all()) {
      const box = await slot.boundingBox();
      if (middle >= box.x && middle <= box.x + box.width) {
        await slot.click();
        picked = true;
        break;
      }
    }
    if (!picked) {
      report.bug('Which Cup?', 'the ball\'s cup did not end up over any slot');
      return;
    }
    try {
      await page.getByText('FOUND IT', { exact: true }).waitFor({ timeout: 2000 });
    } catch {
      report.bug('Which Cup?', 'the cup the ball was followed to was not the right one');
      return;
    }
    await page.waitForTimeout(1300);
  }
}

/** Big to Small: tap whatever is biggest of what's left, until the line is
 *  full; four times. */
export async function playBigToSmall(page, report) {
  for (let t = 0; t < 60; t += 1) {
    if (await roundResult(page)) break;
    const items = [];
    for (const b of await page.getByRole('button').all()) {
      const label = (await b.getAttribute('aria-label')) ?? '';
      const m = label.match(/^\w+, size (\d+)$/);
      if (m) items.push({ b, size: parseInt(m[1], 10) });
    }
    if (items.length === 0) {
      await page.waitForTimeout(300);
      continue;
    }
    items.sort((a, b) => b.size - a.size);
    await items[0].b.click();
    await page.waitForTimeout(items.length === 1 ? 1100 : 150);
  }
}

/** The fewest gap moves that solve a sliding board, by search: breadth-first
 *  up to 3x3, iterative deepening on distance-from-home for 4x4. */
function solveSlide(board, size) {
  const goal = board.map((_, i) => (i === board.length - 1 ? 0 : i + 1)).join();
  const moves = (b) => {
    const gap = b.indexOf(0);
    const r = Math.floor(gap / size);
    const c = gap % size;
    return [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ]
      .filter(([rr, cc]) => rr >= 0 && rr < size && cc >= 0 && cc < size)
      .map(([rr, cc]) => rr * size + cc);
  };
  const swap = (b, to) => {
    const n = [...b];
    const gap = n.indexOf(0);
    [n[gap], n[to]] = [n[to], n[gap]];
    return n;
  };
  if (size <= 3) {
    const prev = new Map([[board.join(), null]]);
    let frontier = [board];
    while (frontier.length) {
      const next = [];
      for (const b of frontier) {
        if (b.join() === goal) {
          const path = [];
          for (let k = b.join(); prev.get(k); k = prev.get(k).from) path.unshift(prev.get(k).cell);
          return path;
        }
        for (const to of moves(b)) {
          const n = swap(b, to);
          if (!prev.has(n.join())) {
            prev.set(n.join(), { from: b.join(), cell: to });
            next.push(n);
          }
        }
      }
      frontier = next;
    }
    return null;
  }
  const h = (b) =>
    b.reduce((sum, t, i) => (t === 0 ? sum : sum + Math.abs(Math.floor((t - 1) / size) - Math.floor(i / size)) + Math.abs(((t - 1) % size) - (i % size))), 0);
  const path = [];
  const search = (b, g, bound, last) => {
    const f = g + h(b);
    if (f > bound) return f;
    if (b.join() === goal) return true;
    let min = Infinity;
    for (const to of moves(b)) {
      if (to === last) continue;
      const gap = b.indexOf(0);
      path.push(to);
      const t = search(swap(b, to), g + 1, bound, gap);
      if (t === true) return true;
      path.pop();
      if (t < min) min = t;
    }
    return min;
  };
  for (let bound = h(board); bound < 80; ) {
    const t = search(board, 0, bound, -1);
    if (t === true) return path;
    bound = t;
  }
  return null;
}

/** Tile Slide: read the board off the labels, solve it, and slide the tiles
 *  one at a time. */
export async function playTileSlide(page, report) {
  const cells = await page.evaluate(() =>
    [...document.querySelectorAll('[aria-label]')]
      .map((el) => el.getAttribute('aria-label'))
      .map((l) => l.match(/^(\d+|Gap), row (\d+), column (\d+)/))
      .filter(Boolean)
      .map((m) => ({ tile: m[1] === 'Gap' ? 0 : parseInt(m[1], 10), row: +m[2], col: +m[3] })),
  );
  const size = Math.round(Math.sqrt(cells.length));
  if (size * size !== cells.length || size < 2) {
    report.bug('Tile Slide', `read ${cells.length} cells, not a square`);
    return;
  }
  const board = Array(size * size);
  for (const c of cells) board[(c.row - 1) * size + (c.col - 1)] = c.tile;
  const path = solveSlide(board, size);
  if (!path) {
    report.bug('Tile Slide', 'the board as dealt cannot be solved');
    return;
  }
  report.ok(`${size}x${size}, solved in ${path.length} slides`);
  for (const cell of path) {
    const row = Math.floor(cell / size) + 1;
    const col = (cell % size) + 1;
    await page.getByLabel(new RegExp(`^\\d+, row ${row}, column ${col}, can slide$`)).click();
    await page.waitForTimeout(60);
  }
}

/** A reader's vocabulary for Word Ladder: the game's own word list, read as
 *  text — the words a player knows, not the game's rules. */
function vocabulary() {
  const source = readFileSync(new URL('../../src/games/wordladder/words.ts', import.meta.url), 'utf8');
  return [...source.matchAll(/`([^`]*)`/g)].flatMap((m) => m[1].split(/\s+/).filter(Boolean));
}

/** Word Ladder: from the goal and the rungs left, pick the word that is
 *  exactly the right number of one-letter steps from the goal. */
export async function playWordLadder(page, report) {
  const words = vocabulary();
  const oneApart = (a, b) => a.length === b.length && [...a].filter((ch, i) => b[i] !== ch).length === 1;
  const distances = (goal) => {
    const dist = new Map([[goal, 0]]);
    let frontier = [goal];
    while (frontier.length) {
      const next = [];
      for (const w of frontier) {
        for (const n of words) {
          if (!dist.has(n) && oneApart(w, n)) {
            dist.set(n, dist.get(w) + 1);
            next.push(n);
          }
        }
      }
      frontier = next;
    }
    return dist;
  };
  for (let t = 0; t < 40; t += 1) {
    if (await roundResult(page)) break;
    const title = await page.getByText(/ TO .*, ONE LETTER AT A TIME$/).first().innerText();
    const goal = title.match(/ TO (\w+),/)[1].toLowerCase();
    const choices = [];
    for (const b of await page.getByRole('button').all()) {
      const label = (await b.getAttribute('aria-label')) ?? '';
      if (/^[a-z]{3,4}$/.test(label) && !(await b.isDisabled())) choices.push({ b, word: label });
    }
    if (choices.length === 0) {
      await page.waitForTimeout(400);
      continue;
    }
    const dist = distances(goal);
    const best = Math.min(...choices.map((c) => dist.get(c.word) ?? Infinity));
    const right = choices.filter((c) => (dist.get(c.word) ?? Infinity) === best);
    if (right.length !== 1) {
      report.bug('Word Ladder', `${right.length} words equally close among ${choices.map((c) => c.word).join('/')}`);
      return;
    }
    await right[0].b.click();
    await page.waitForTimeout(best === 0 ? 1600 : 250);
  }
}

/**
 * Fruit Catch, played from inside the page like Lane Dash: it watches what
 * is falling, and taps the column of whatever will land next — or, if
 * that's a pine cone over the basket, the column beside it.
 */
const catchHook = new WeakSet();
const catchAt = new WeakMap();
export async function playFruitCatch(page, report) {
  const columns = [];
  for (const button of await page.getByLabel(/^Column \d+ of \d+/).all()) {
    const box = await button.boundingBox();
    columns.push({ x: box.x + box.width / 2, y: box.y + box.height / 3 });
  }
  columns.sort((a, b) => a.x - b.x);
  catchAt.set(page, columns);
  if (!catchHook.has(page)) {
    catchHook.add(page);
    await page.exposeFunction('__fruitCatchTap', (column) => {
      const at = catchAt.get(page)[column];
      return page.mouse.click(at.x, at.y);
    });
  }
  await page.getByLabel(/^Column 1 of/).click(); // the first tap starts the round

  const taps = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const field = document.querySelector('[data-testid^="field:"]');
        const columns = Number(field.dataset.testid.split(':')[1]);
        let target = -1;
        let taps = 0;
        const started = performance.now();
        const frame = (now) => {
          if (document.querySelector('[aria-label="Play again"]') || now - started > 120000) {
            resolve(taps);
            return;
          }
          const falling = [...document.querySelectorAll('[data-testid^="falling:"]')].map((el) => {
            const [, kind, column] = el.dataset.testid.split(':');
            return { kind, column: Number(column), bottom: el.getBoundingClientRect().bottom };
          });
          falling.sort((a, b) => b.bottom - a.bottom);
          const next = falling[0];
          if (next) {
            const fruit = falling.find((f) => f.kind === 'fruit');
            let want = target;
            if (next.kind === 'fruit') want = next.column;
            else if (target === next.column || target === -1) {
              // Out from under the cone, towards the next fruit if there is one.
              const toward = fruit && fruit.column !== next.column ? fruit.column : next.column === 0 ? 1 : next.column - 1;
              want = Math.max(0, Math.min(columns - 1, toward));
            }
            if (want !== target && want >= 0) {
              target = want;
              taps += 1;
              window.__fruitCatchTap(want);
            }
          }
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }),
  );
  report.ok(`moved the basket ${taps} times`);
}

/**
 * Maze Explorer: explores like someone who can't see the whole maze —
 * only where they are, which ways are open and which way they came in,
 * all from the maze's description. Depth-first: an untried way if there is
 * one, otherwise back the way it came. That finds the key and the flag in
 * any maze with no loops.
 */
export async function playMaze(page, report) {
  let presses = 0;
  let tried = new Map();
  let parent = new Map();
  let current = '';
  let hadKeyToFind = false;
  for (let t = 0; t < 600; t += 1) {
    if (await roundResult(page)) break;
    const maze = page.locator('[data-testid^="maze:"]').first();
    if ((await page.getByText('YOU MADE IT', { exact: true }).count()) || !(await maze.count())) {
      await page.waitForTimeout(300);
      continue;
    }
    // Which maze this is: a new one starts with a fresh memory.
    const id = (await maze.getAttribute('data-testid')).split(':').slice(0, 3).join(':');
    if (id !== current) {
      current = id;
      tried = new Map();
      parent = new Map();
    }
    const label = (await maze.getAttribute('aria-label')) ?? '';
    // Picking up the key opens a door somewhere already explored: start
    // exploring afresh from here, the way a person would go back to look.
    const keyShown = /The key is at/.test(label);
    if (hadKeyToFind && !keyShown) {
      tried = new Map();
      parent = new Map();
    }
    hadKeyToFind = keyShown;
    const at = label.match(/You are at (row \d+, column \d+)/)[1];
    const open = (label.match(/Open: ([a-z, ]+)\./)?.[1] ?? '').split(', ').filter(Boolean);
    const came = label.match(/You came in from (?:the )?(above|below|left|right)/)?.[1];
    const back = came === 'above' ? 'up' : came === 'below' ? 'down' : came;
    if (!tried.has(at)) {
      tried.set(at, new Set());
      parent.set(at, back ?? null);
    }
    const done = tried.get(at);
    const way = open.find((d) => !done.has(d) && d !== parent.get(at)) ?? parent.get(at);
    if (!way) {
      report.bug('Maze Explorer', `stuck at ${at} with nowhere left to try`);
      return;
    }
    done.add(way);
    await page.getByLabel(new RegExp(`^Go ${way}(, wall)?$`)).click();
    presses += 1;
    await page.waitForTimeout(90);
  }
  report.ok(`explored with ${presses} presses`);
}

/** Balloon Count: works out what comes next from the string at the top —
 *  its last number and its step — and pops that balloon. */
export async function playBalloonCount(page, report) {
  for (let t = 0; t < 80; t += 1) {
    if (await roundResult(page)) break;
    const string = await page.getByLabel(/^On the string:/).first().getAttribute('aria-label');
    const on = (string.match(/^On the string: ([^.]*)\./)?.[1] ?? '')
      .split(', ')
      .filter((x) => /^\d+$/.test(x))
      .map(Number);
    const balloons = [];
    for (const b of await page.getByRole('button').all()) {
      const label = (await b.getAttribute('aria-label')) ?? '';
      const m = label.match(/^Balloon (?:with )?(\d+)(?: dots?)?$/);
      if (m) balloons.push({ b, value: Number(m[1]) });
    }
    if (balloons.length === 0 || /0 more to go/.test(string)) {
      await page.waitForTimeout(300);
      continue;
    }
    const want =
      on.length === 0
        ? Math.min(...balloons.map((x) => x.value))
        : on.length === 1
          ? on[0] + 1
          : on[on.length - 1] + (on[on.length - 1] - on[on.length - 2]);
    const hit = balloons.find((x) => x.value === want);
    if (!hit) {
      report.bug('Balloon Count', `after ${on.join(', ')} there is no balloon ${want}`);
      return;
    }
    await hit.b.click();
    await page.waitForTimeout(160);
  }
}

/** Treasure Hunt: reads every dug square's clue, keeps only the squares that
 *  agree with all of them, and digs one of those. */
export async function playTreasureHunt(page, report) {
  for (let t = 0; t < 80; t += 1) {
    if (await roundResult(page)) break;
    const cells = [];
    for (const b of await page.getByRole('button').all()) {
      const label = (await b.getAttribute('aria-label')) ?? '';
      const m = label.match(/^Row (\d+), column (\d+)(.*)$/);
      if (m) cells.push({ b, r: Number(m[1]), c: Number(m[2]), rest: m[3] });
    }
    if (cells.some((x) => /treasure!/.test(x.rest)) || cells.length === 0) {
      await page.waitForTimeout(400);
      continue;
    }
    const dug = cells.filter((x) => !/not dug/.test(x.rest));
    const fits = (x, d) => {
      const steps = d.rest.match(/(\d+) steps? away/);
      if (steps) return Math.abs(x.r - d.r) + Math.abs(x.c - d.c) === Number(steps[1]);
      const up = /up/.test(d.rest) ? -1 : /down/.test(d.rest) ? 1 : 0;
      const across = /left/.test(d.rest) ? -1 : /right/.test(d.rest) ? 1 : 0;
      return Math.sign(x.r - d.r) === up && Math.sign(x.c - d.c) === across;
    };
    const possible = cells.filter((x) => /not dug/.test(x.rest) && dug.every((d) => fits(x, d)));
    if (possible.length === 0) {
      report.bug('Treasure Hunt', 'the clues rule out every square');
      return;
    }
    await possible[Math.floor(possible.length / 2)].b.click();
    await page.waitForTimeout(200);
  }
}

/** Water Works: reads each piece and which way it faces, finds the cheapest
 *  way from the tap to the flower, and turns each piece on it until it
 *  fits. */
export async function playWaterWorks(page, report) {
  const BIT = { up: 1, right: 2, down: 4, left: 8 };
  const OPP = { 1: 4, 2: 8, 4: 1, 8: 2 };
  const turn = (s) => ((s << 1) | (s >> 3)) & 15;
  const turnsToFit = (sides, need) => {
    let s = sides;
    for (let t = 0; t < 4; t += 1) {
      if ((s & need) === need) return t;
      s = turn(s);
    }
    return -1;
  };
  for (let round = 0; round < 6; round += 1) {
    if (await roundResult(page)) break;
    if (await page.getByText('THE FLOWER HAS WATER', { exact: true }).count()) {
      await page.waitForTimeout(500);
      continue;
    }
    const tapRow = Number((await page.getByLabel(/^The tap, at row/).getAttribute('aria-label')).match(/\d+/)[0]) - 1;
    const flowerRow = Number((await page.getByLabel(/^The flower, at row/).getAttribute('aria-label')).match(/\d+/)[0]) - 1;
    const pieces = [];
    for (const b of await page.getByRole('button').all()) {
      const label = (await b.getAttribute('aria-label')) ?? '';
      const m = label.match(/^Row (\d+), column (\d+): \w+, open ([a-z ]+?)(, water in it)?$/);
      if (m) pieces.push({ b, r: Number(m[1]) - 1, c: Number(m[2]) - 1, sides: m[3].split(' and ').reduce((s, n) => s | BIT[n], 0) });
    }
    const cols = Math.max(...pieces.map((p) => p.c)) + 1;
    const rows = Math.max(...pieces.map((p) => p.r)) + 1;
    // The grid on screen has to be the grid the puzzle is: a piece that
    // wraps onto the wrong row breaks every join between squares.
    const lefts = new Set();
    for (const p of pieces) lefts.add(Math.round((await p.b.boundingBox()).x));
    if (lefts.size !== cols) {
      report.bug('Water Works', `the ${cols}-wide grid is drawn ${lefts.size} across`);
      return;
    }
    const at = (r, c) => pieces.find((p) => p.r === r && p.c === c);
    // Cheapest way, never through a square twice.
    const queue = [{ cost: 0, r: tapRow, c: 0, from: 8, used: new Set([`${tapRow},0`]), steps: [] }];
    let best = null;
    const seen = new Map();
    while (queue.length) {
      queue.sort((a, b) => a.cost - b.cost);
      const n = queue.shift();
      if (n.done) {
        best = n;
        break;
      }
      const key = `${n.r},${n.c},${n.from},${[...n.used].sort().join('|')}`;
      if (seen.has(key)) continue;
      seen.set(key, true);
      for (const out of [1, 2, 4, 8]) {
        if (out === n.from) continue;
        const need = n.from | out;
        const t = turnsToFit(at(n.r, n.c).sides, need);
        if (t < 0) continue;
        const steps = [...n.steps, { r: n.r, c: n.c, t }];
        if (n.r === flowerRow && n.c === cols - 1 && out === 2) {
          queue.push({ cost: n.cost + t, done: true, steps });
          continue;
        }
        const [r, c] = out === 1 ? [n.r - 1, n.c] : out === 4 ? [n.r + 1, n.c] : out === 8 ? [n.r, n.c - 1] : [n.r, n.c + 1];
        if (r < 0 || r >= rows || c < 0 || c >= cols || n.used.has(`${r},${c}`)) continue;
        queue.push({ cost: n.cost + t, r, c, from: OPP[out], used: new Set([...n.used, `${r},${c}`]), steps });
      }
    }
    if (!best) {
      report.bug('Water Works', 'no way from the tap to the flower');
      return;
    }
    for (const { r, c, t } of best.steps) {
      for (let i = 0; i < t; i += 1) {
        await at(r, c).b.click();
        await page.waitForTimeout(50);
      }
    }
    await page.waitForTimeout(1500);
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
  'Shape Builder': playShapeBuilder,
  'Puddle Hop': playPuddleHop,
  'Lane Dash': playLaneDash,
  'Odd One Out': playOddOneOut,
  'Memory Grid': playMemoryGrid,
  'Shadow Match': playShadowMatch,
  'Which Cup?': playWhichCup,
  'Big to Small': playBigToSmall,
  'Tile Slide': playTileSlide,
  'Word Ladder': playWordLadder,
  'Fruit Catch': playFruitCatch,
  'Maze Explorer': playMaze,
  'Balloon Count': playBalloonCount,
  'Treasure Hunt': playTreasureHunt,
  'Water Works': playWaterWorks,
};
