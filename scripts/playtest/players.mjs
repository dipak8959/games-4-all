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
    // "Row 2, column 5: 7, given" / "Row 2, column 6: empty".
    for (const c of await page.getByLabel(/^Row \d+, column \d+: /).all()) {
      out.push((await c.getAttribute('aria-label')).split(': ')[1].split(',')[0]);
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
  const grid = values.map((v) => (v === 'empty' ? 0 : Number(v)));
  const given = grid.map((v) => v !== 0);
  if (!solve(grid, size, boxH, boxW)) {
    report.bug('Sudoku', `the ${size}x${size} puzzle dealt has no solution`);
    return;
  }
  report.ok('puzzle solved, entering answers');

  for (let i = 0; i < grid.length; i += 1) {
    if (given[i]) continue;
    if (await roundResult(page)) break;
    const cell = page.getByLabel(new RegExp(`^Row ${Math.floor(i / size) + 1}, column ${(i % size) + 1}: `));
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

/**
 * Bounce Bricks, played from inside the page: every frame it reads the ball,
 * the paddle and the bricks off the screen and slides the paddle — with the
 * real mouse, held down on the field — to catch the ball on whichever part
 * of the paddle sends it towards the nearest brick. A ball resting on the
 * paddle is served with a fresh press.
 */
const bricksHook = new WeakSet();
const bricksAt = new WeakMap();

export async function playBounceBricks(page, report) {
  const field = await page.getByTestId('field').boundingBox();
  bricksAt.set(page, { y: field.y + field.height * 0.6 });
  if (!bricksHook.has(page)) {
    bricksHook.add(page);
    await page.exposeFunction('__bricksMove', (x) => page.mouse.move(x, bricksAt.get(page).y));
    await page.exposeFunction('__bricksServe', async (x) => {
      await page.mouse.up();
      await page.mouse.move(x, bricksAt.get(page).y);
      await page.mouse.down();
    });
  }
  await page.mouse.move(field.x + field.width / 2, bricksAt.get(page).y);
  await page.mouse.down();

  const moves = await page.evaluate(
    () =>
      new Promise((resolve) => {
        let moves = 0;
        let busy = false;
        let lastServe = 0;
        const started = performance.now();
        const frame = async (now) => {
          if (document.querySelector('[aria-label="Play again"]') || now - started > 240000) {
            resolve(moves);
            return;
          }
          const ball = document.querySelector('[data-testid="ball"]')?.getBoundingClientRect();
          const paddle = document.querySelector('[data-testid="paddle"]')?.getBoundingClientRect();
          if (ball && paddle && !busy) {
            const bx = ball.left + ball.width / 2;
            const resting = document.body.innerText.includes('TAP TO SERVE');
            busy = true;
            if (resting && now - lastServe > 600) {
              lastServe = now;
              await window.__bricksServe(bx);
            } else {
              // Aim: the paddle's end sends the ball off at up to 60°.
              const bricks = [...document.querySelectorAll('[data-testid="brick"]')].map((b) => b.getBoundingClientRect());
              const target = bricks.sort(
                (a, b) => Math.abs(a.left + a.width / 2 - bx) - Math.abs(b.left + b.width / 2 - bx),
              )[0];
              let offset = 0;
              if (target) {
                const angle = Math.atan2(target.left + target.width / 2 - bx, paddle.top - target.bottom);
                offset = Math.max(-0.8, Math.min(0.8, angle / (Math.PI / 3)));
              }
              await window.__bricksMove(bx - (offset * paddle.width) / 2);
              moves += 1;
            }
            busy = false;
          }
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }),
  );
  await page.mouse.up();
  report.ok(`followed the ball with ${moves} paddle moves`);
}

/**
 * Hungry Worm, from inside the page: whenever the head moves it finds the
 * shortest way to the apple around the rocks and its own body, and presses
 * the arrow for the first step — for real — if that's a turn.
 */
const wormHook = new WeakSet();
const wormArrows = new WeakMap();

export async function playHungryWorm(page, report) {
  const arrows = {};
  for (const dir of ['up', 'down', 'left', 'right']) {
    const box = await page.getByLabel(`Go ${dir}`, { exact: true }).boundingBox();
    arrows[dir] = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }
  wormArrows.set(page, arrows);
  if (!wormHook.has(page)) {
    wormHook.add(page);
    await page.exposeFunction('__wormPress', (dir) => {
      const at = wormArrows.get(page)[dir];
      return page.mouse.click(at.x, at.y);
    });
  }

  const presses = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
        let presses = 0;
        let lastHead = null;
        let lastDecided = 0;
        let busy = false;
        const started = performance.now();
        const frame = async (now) => {
          if (document.querySelector('[aria-label="Play again"]') || now - started > 180000) {
            resolve(presses);
            return;
          }
          const board = document.querySelector('[data-testid^="worm:"]');
          if (board && !busy) {
            const [cols, rows] = board.dataset.testid.split(':')[1].split('x').map(Number);
            const segs = [...document.querySelectorAll('[data-testid^="seg:"]')].map((e) => Number(e.dataset.testid.split(':')[1]));
            const rocks = [...document.querySelectorAll('[data-testid^="rock:"]')].map((e) => Number(e.dataset.testid.split(':')[1]));
            const apple = Number(document.querySelector('[data-testid^="apple:"]')?.dataset.testid.split(':')[1]);
            const heading = (board.getAttribute('aria-label') ?? '').match(/heading (\w+)/)?.[1];
            const head = segs[0];
            const started = !document.body.innerText.includes('PRESS AN ARROW');
            // Decide again when the head moves — or when it hasn't for a
            // while: a bumped worm stops and waits for a new way.
            const stuck = document.body.innerText.includes('BUMP!') && now - lastDecided > 350;
            if (head !== lastHead || !started || stuck) {
              lastHead = head;
              lastDecided = now;
              const next = (cell, dir) => {
                const r = Math.floor(cell / cols);
                const c = cell % cols;
                if (dir === 'up') return r > 0 ? cell - cols : -1;
                if (dir === 'down') return r < rows - 1 ? cell + cols : -1;
                if (dir === 'left') return c > 0 ? cell - 1 : -1;
                return c < cols - 1 ? cell + 1 : -1;
              };
              // The tail counts as a wall: it may not move if the worm is growing.
              const route = (blocked) => {
                const from = new Map([[head, null]]);
                let frontier = [head];
                while (frontier.length && !from.has(apple)) {
                  const later = [];
                  for (const cell of frontier) {
                    for (const d of ['up', 'right', 'down', 'left']) {
                      const n = next(cell, d);
                      if (n < 0 || blocked.has(n) || from.has(n)) continue;
                      if (cell === head && n === segs[1]) continue;
                      from.set(n, { cell, d });
                      later.push(n);
                    }
                  }
                  frontier = later;
                }
                if (!from.has(apple)) return null;
                let at = apple;
                while (from.get(at).cell !== head) at = from.get(at).cell;
                return from.get(at).d;
              };
              const walls = new Set([...segs.slice(1), ...rocks]);
              let want = route(walls) ?? route(new Set([...segs.slice(1, -1), ...rocks]));
              if (!want) {
                // No way to the apple yet: any way that's open.
                want = ['up', 'right', 'down', 'left'].find((d) => {
                  const n = next(head, d);
                  return n >= 0 && !walls.has(n);
                });
              }
              if (want && (want !== heading || !started) && want !== OPP[heading ?? ''] ) {
                busy = true;
                presses += 1;
                await window.__wormPress(want);
                busy = false;
              } else if (want && want === OPP[heading ?? ''] && !started) {
                busy = true;
                presses += 1;
                await window.__wormPress(want === 'left' || want === 'right' ? 'up' : 'right');
                busy = false;
              }
            }
          }
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }),
  );
  report.ok(`steered with ${presses} presses`);
}

/**
 * Peekaboo Pals, from inside the page: taps — for real — every pal whose
 * label says it's awake, and never a sleepy one.
 */
const peekHook = new WeakSet();

export async function playPeekaboo(page, report) {
  if (!peekHook.has(page)) {
    peekHook.add(page);
    await page.exposeFunction('__peekTap', (x, y) => page.mouse.click(x, y));
  }
  await page.getByLabel(/^Hole 1, /).click(); // the first tap starts the round
  const taps = await page.evaluate(
    () =>
      new Promise((resolve) => {
        let taps = 0;
        const recent = new Map();
        const started = performance.now();
        const frame = (now) => {
          if (document.querySelector('[aria-label="Play again"]') || now - started > 120000) {
            resolve(taps);
            return;
          }
          for (const hole of document.querySelectorAll('[aria-label$=", an awake pal"]')) {
            const label = hole.getAttribute('aria-label');
            if (now - (recent.get(label) ?? -1e9) < 400) continue;
            recent.set(label, now);
            const r = hole.getBoundingClientRect();
            taps += 1;
            window.__peekTap(r.left + r.width / 2, r.top + r.height / 2);
          }
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }),
  );
  report.ok(`said hello ${taps} times`);
  const woken = await page.getByLabel(/, a woken pal$/).count();
  if (woken) report.bug('Peekaboo Pals', 'a sleepy pal woke without being tapped');
}

/**
 * Hoop Shot, played the way a child learns it: pull, look at the dots, and
 * work out from how they fall where the ball will go. It takes the first
 * three dots of a trial pull to learn how hard the ball flies for a pull of
 * a given length and how fast it drops, then picks the pull whose curve
 * falls through the middle of the hoop — and lets go.
 */
export async function playHoopShot(page, report) {
  const court = await page.getByTestId('court').boundingBox();
  const anchor = { x: court.x + court.width * 0.78, y: court.y + court.height * 0.22 };
  const read = () =>
    page.evaluate(() => {
      const box = (el) => el?.getBoundingClientRect();
      const ball = box(document.querySelector('[data-testid="ball"]'));
      const hoop = box(document.querySelector('[data-testid="hoop"]'));
      const dots = [...document.querySelectorAll('[data-testid="dot"]')].map((d) => {
        const r = d.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
      const label = document.body.innerText;
      return {
        ball: ball && { x: ball.left + ball.width / 2, y: ball.top + ball.height / 2, r: ball.width / 2 },
        hoop: hoop && { left: hoop.left, right: hoop.right, y: hoop.top + hoop.height / 2, edge: hoop.height },
        dots,
        ready: /PULL BACK/.test(label),
        over: !!document.querySelector('[aria-label="Play again"]'),
      };
    });
  const pullTo = async (angle, length) => {
    await page.mouse.move(anchor.x - length * Math.cos(angle), anchor.y + length * Math.sin(angle), { steps: 3 });
    await page.waitForTimeout(60);
  };

  let physics = null;
  let throws = 0;
  let aimed = 0;
  for (let guard = 0; guard < 400 && throws < 10; guard += 1) {
    const now = await read();
    if (now.over) break;
    if (!now.ready || !now.ball || !now.hoop) {
      await page.waitForTimeout(120);
      continue;
    }
    const hand = { x: now.ball.x, y: now.ball.y };
    await page.mouse.move(anchor.x, anchor.y);
    await page.mouse.down();
    if (!physics) {
      // A trial pull: how far the ball goes per pixel pulled, and how fast
      // it falls, read off the first three dots.
      const trial = { angle: Math.PI / 3, length: 70 };
      await pullTo(trial.angle, trial.length);
      const { dots } = await read();
      if (dots.length >= 3) {
        const t = 0.06;
        const vx = (dots[0].x - hand.x) / t;
        const g = (dots[2].y - 2 * dots[1].y + dots[0].y) / (t * t);
        const vy = (dots[0].y - hand.y) / t - 0.5 * g * t;
        physics = { perPixel: Math.hypot(vx, vy) / trial.length, g };
      }
    }
    let chosen = null;
    if (physics) {
      const { g, perPixel } = physics;
      const r = now.ball.r;
      const edgeL = now.hoop.left + now.hoop.edge;
      const edgeR = now.hoop.right - now.hoop.edge;
      const tx = (edgeL + edgeR) / 2;
      const dx = tx - hand.x;
      const up = hand.y - now.hoop.y;
      for (let deg = 60; deg <= 86 && !chosen; deg += 1) {
        const a = (deg * Math.PI) / 180;
        const room = dx * Math.tan(a) - up;
        if (room <= 0) continue;
        const v = Math.sqrt((g * dx * dx) / (2 * Math.cos(a) ** 2 * room));
        const length = v / perPixel;
        if (length > 105 * (now.ball.r / 11)) continue;
        // Follow the curve it would make: well clear of both edges of the
        // rim, all the way until it drops through the middle.
        const vx = v * Math.cos(a);
        const vy = v * Math.sin(a);
        let clear = true;
        for (let t = 0; t < 3; t += 0.01) {
          const x = hand.x + vx * t;
          const y = hand.y - vy * t + 0.5 * g * t * t;
          if (x >= tx) break;
          for (const ex of [edgeL, edgeR]) {
            if (Math.hypot(x - ex, y - now.hoop.y) < r + now.hoop.edge * 2 + 6) clear = false;
          }
        }
        if (clear) chosen = { angle: a, length };
      }
    }
    if (chosen) {
      aimed += 1;
      await pullTo(chosen.angle, chosen.length);
    } else {
      await pullTo(Math.PI / 2.6, 80);
    }
    await page.mouse.up();
    throws += 1;
    // Wait for the throw to land and the next to be ready.
    for (let w = 0; w < 60; w += 1) {
      await page.waitForTimeout(100);
      const after = await read();
      if (after.over || after.ready) break;
    }
  }
  report.ok(`threw ${throws} times, ${aimed} of them worked out from the dots`);
}

/**
 * Soft Landing, flown from inside the page with one finger, the way a
 * child on a phone mostly does: it holds whichever button matters most right
 * now — the engine if it's falling faster than it means to, otherwise a side
 * button towards the pad — reading the rocket's speed off the screen.
 */
const landingHook = new WeakSet();
const landingButtons = new WeakMap();

export async function playSoftLanding(page, report) {
  const buttons = {};
  for (const [name, label] of [
    ['up', 'Engine: slow down'],
    ['left', 'Push left'],
    ['right', 'Push right'],
  ]) {
    const control = page.getByLabel(label, { exact: true });
    if (!(await control.count())) continue;
    const box = await control.boundingBox();
    buttons[name] = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }
  landingButtons.set(page, { buttons, held: null });
  if (!landingHook.has(page)) {
    landingHook.add(page);
    await page.exposeFunction('__landingHold', async (which) => {
      const state = landingButtons.get(page);
      if (state.held === which) return;
      if (state.held) await page.mouse.up();
      state.held = null;
      const at = which && state.buttons[which];
      if (!at) return;
      await page.mouse.move(at.x, at.y);
      await page.mouse.down();
      state.held = which;
    });
  }

  const holds = await page.evaluate(
    () =>
      new Promise((resolve) => {
        let holds = 0;
        let busy = false;
        let history = [];
        let current = null;
        const started = performance.now();
        const frame = async (now) => {
          if (document.querySelector('[aria-label="Play again"]') || now - started > 180000) {
            await window.__landingHold(null);
            resolve(holds);
            return;
          }
          if (busy) {
            requestAnimationFrame(frame);
            return;
          }
          const text = document.body.innerText;
          const rocket = document.querySelector('[data-testid="rocket"]')?.getBoundingClientRect();
          const padEl = document.querySelector('[data-testid^="pad:"]');
          const pad = padEl?.getBoundingClientRect();
          let want = null;
          if (text.includes('PRESS TO DROP')) {
            history = [];
            want = 'up';
          } else if (rocket && pad && !/SOFT LANDING!|MISSED THE PAD|BUMP!/.test(text)) {
            const k = rocket.width / 28;
            history.push({ t: now, x: rocket.left + rocket.width / 2, y: rocket.bottom });
            history = history.filter((h) => now - h.t < 160);
            const first = history[0];
            const last = history[history.length - 1];
            const span = (last.t - first.t) / 1000;
            if (span > 0.06) {
              const vx = (last.x - first.x) / span / k;
              const vy = (last.y - first.y) / span / k;
              const height = (pad.top - last.y) / k;
              const gap = (pad.left + pad.width / 2 - last.x) / k;
              const over = Math.abs(gap) < pad.width / k / 2 - 18;
              // Near the ground, slow; not over the pad yet, don't come down
              // among the hills at all.
              const wantVy = over ? Math.max(8, Math.min(70, height * 0.28)) : height < 130 ? -6 : 30;
              const wantVx = Math.max(-35, Math.min(35, gap * 0.7));
              if (vy > wantVy) want = 'up';
              else if (vx < wantVx - 5 && !over) want = 'right';
              else if (vx > wantVx + 5 && !over) want = 'left';
              else if (over && Math.abs(vx) > 6) want = vx > 0 ? 'left' : 'right';
            }
          }
          if (want !== current) {
            current = want;
            if (want) holds += 1;
            busy = true;
            await window.__landingHold(want);
            busy = false;
          }
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }),
  );
  report.ok(`flew three descents with ${holds} presses`);
}

/**
 * Tall Tower, from inside the page: watches the sliding block close in on
 * the top of the tower and taps — for real — a beat before it's square,
 * allowing for how long a tap takes to land.
 */
const towerHook = new WeakSet();
const towerAt = new WeakMap();

export async function playTallTower(page, report) {
  const stage = await page.getByTestId('tower-stage').boundingBox();
  towerAt.set(page, { x: stage.x + stage.width / 2, y: stage.y + stage.height / 2 });
  if (!towerHook.has(page)) {
    towerHook.add(page);
    await page.exposeFunction('__towerTap', () => {
      const at = towerAt.get(page);
      return page.mouse.click(at.x, at.y);
    });
  }
  await page.mouse.click(towerAt.get(page).x, towerAt.get(page).y); // the first tap starts it sliding
  const drops = await page.evaluate(
    () =>
      new Promise((resolve) => {
        let drops = 0;
        let busy = false;
        let last = null;
        const LATENCY = 0.03;
        const started = performance.now();
        const frame = async (now) => {
          if (document.querySelector('[aria-label="Play again"]') || now - started > 120000) {
            resolve(drops);
            return;
          }
          const slider = document.querySelector('[data-testid="slider"]')?.getBoundingClientRect();
          const top = document.querySelector('[data-testid^="top:"]')?.getBoundingClientRect();
          if (slider && top && !busy) {
            const gap = slider.left - top.left;
            if (last && now > last.at) {
              const v = (slider.left - last.x) / ((now - last.at) / 1000);
              // Where it will be once the tap lands: tap when that's within
              // a frame's travel of square.
              const then = gap + v * LATENCY;
              if (Math.abs(then) <= Math.max(1.5, Math.abs(v) / 60)) {
                busy = true;
                drops += 1;
                await window.__towerTap();
                last = null;
                setTimeout(() => {
                  busy = false;
                }, 250);
                requestAnimationFrame(frame);
                return;
              }
            }
            last = { x: slider.left, at: now };
          }
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }),
  );
  report.ok(`dropped ${drops} blocks`);
}

/**
 * Duck Crossing, from inside the page: reads each lane's direction and
 * speed and where the vehicles are, and hops up only when the square ahead
 * will stay clear long enough to hop again — stepping back to the grass if
 * something is about to hit it where it stands.
 */
const duckHook = new WeakSet();
const duckArrows = new WeakMap();

export async function playDuckCrossing(page, report) {
  const arrows = {};
  for (const way of ['up', 'down', 'left', 'right']) {
    const box = await page.getByLabel(`Hop ${way}`, { exact: true }).boundingBox();
    arrows[way] = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }
  duckArrows.set(page, arrows);
  if (!duckHook.has(page)) {
    duckHook.add(page);
    await page.exposeFunction('__duckHop', (way) => {
      const at = duckArrows.get(page)[way];
      return page.mouse.click(at.x, at.y);
    });
  }
  const hops = await page.evaluate(
    () =>
      new Promise((resolve) => {
        let hops = 0;
        let busy = false;
        const started = performance.now();
        const lanes = () => {
          const out = {};
          for (const el of document.querySelectorAll('[data-testid^="lane:"]')) {
            const [, row, dir, speed] = el.dataset.testid.split(':');
            out[row] = { dir: Number(dir), speed: Number(speed), cars: [] };
          }
          for (const el of document.querySelectorAll('[data-testid^="car:"]')) {
            const [, row, left, right] = el.dataset.testid.split(':');
            out[row]?.cars.push({ left: Number(left), right: Number(right) });
          }
          return out;
        };
        // Clear for the next `t` seconds at this column?
        const clearFor = (lane, col, t) =>
          !lane ||
          lane.cars.every((c) => {
            const d = lane.dir * lane.speed * t;
            const lo = Math.min(c.left, c.left + d) - 0.1;
            const hi = Math.max(c.right, c.right + d) + 0.1;
            return hi <= col + 0.2 || lo >= col + 0.8;
          });
        const frame = async (now) => {
          if (document.querySelector('[aria-label="Play again"]') || now - started > 240000) {
            resolve(hops);
            return;
          }
          const duck = document.querySelector('[data-testid^="duck:"]');
          if (duck && !busy) {
            const [, row, col] = duck.dataset.testid.split(':').map(Number);
            const kinds = {};
            for (const el of document.querySelectorAll('[data-testid^="row:"]')) {
              const [, r, kind] = el.dataset.testid.split(':');
              kinds[r] = kind;
            }
            const all = lanes();
            let way = null;
            const nextRoad = all[row + 1];
            if (kinds[row + 1] === 'pond' || kinds[row + 1] === 'grass') way = 'up';
            else if (nextRoad && clearFor(nextRoad, col, 0.9)) way = 'up';
            else if (all[row] && !clearFor(all[row], col, 0.35)) {
              // In a lane with something coming: sideways if that's clear, else back.
              if (col > 0 && clearFor(all[row], col - 1, 0.6)) way = 'left';
              else if (col < 6 && clearFor(all[row], col + 1, 0.6)) way = 'right';
              else way = 'down';
            }
            if (way) {
              busy = true;
              hops += 1;
              await window.__duckHop(way);
              setTimeout(() => {
                busy = false;
              }, 120);
            }
          }
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }),
  );
  report.ok(`hopped ${hops} times`);
}

/**
 * Code Cracker: every guess fits everything learned so far, read back off
 * the screen — the marks under each shape, or the counts of pegs.
 */
export async function playCodeCracker(page, report) {
  const names = [];
  for (const b of await page.getByRole('button').all()) {
    const label = (await b.getAttribute('aria-label')) ?? '';
    if (/^(orange|blue|green|yellow|pink) (circle|square|triangle|star|diamond|heart)$/.test(label)) names.push(label);
  }
  // How long the code is: add shapes until it can be checked.
  let length = 0;
  while (length < 6 && !(await page.getByLabel('Check this guess').isEnabled())) {
    await page.getByLabel(names[0], { exact: true }).click();
    length += 1;
  }
  for (let i = 0; i < length; i += 1) await page.getByLabel('Take the last shape back').click();

  let pool = [[]];
  for (let i = 0; i < length; i += 1) pool = pool.flatMap((c) => names.map((_, s) => [...c, s]));
  const score = (code, guess) => {
    const marks = guess.map((g, i) => (g === code[i] ? 'here' : 'none'));
    const left = new Map();
    code.forEach((c, i) => guess[i] !== c && left.set(c, (left.get(c) ?? 0) + 1));
    guess.forEach((g, i) => {
      if (marks[i] === 'here') return;
      if ((left.get(g) ?? 0) > 0) {
        marks[i] = 'elsewhere';
        left.set(g, left.get(g) - 1);
      }
    });
    return marks;
  };
  let guesses = 0;
  for (let turn = 0; turn < 10; turn += 1) {
    if (await roundResult(page)) break;
    if (!(await page.getByLabel('Check this guess').count())) break;
    const guess = pool[Math.floor(pool.length / 2)];
    for (const s of guess) await page.getByLabel(names[s], { exact: true }).click();
    await page.getByLabel('Check this guess').click();
    guesses += 1;
    await page.waitForTimeout(250);
    const rows = page.locator('[aria-label*="right place"], [aria-label*="right here"], [aria-label*="somewhere else"], [aria-label*="not in the code"]');
    const label = await rows.nth((await rows.count()) - 1).getAttribute('aria-label');
    if (/right place/.test(label)) {
      const [, exact, near] = label.match(/(\d+) right place, (\d+) wrong place/);
      pool = pool.filter((c) => {
        const m = score(c, guess);
        return m.filter((x) => x === 'here').length === Number(exact) && m.filter((x) => x === 'elsewhere').length === Number(near);
      });
    } else {
      const marks = label.split(', ').map((part) => (/right here/.test(part) ? 'here' : /somewhere else/.test(part) ? 'elsewhere' : 'none'));
      pool = pool.filter((c) => score(c, guess).join() === marks.join());
    }
    if (!pool.length) {
      report.bug('Code Cracker', 'no code fits what the screen said about the guesses');
      return;
    }
  }
  await page.waitForTimeout(1900);
  report.ok(`cracked it in ${guesses} guesses`);
}

/**
 * What's the Time?: reads the clock the way a screen reader describes it —
 * where the short hand is, where the long hand is — works out the time,
 * and taps it.
 */
export async function playClockTime(page, report) {
  let read = 0;
  for (let turn = 0; turn < 40; turn += 1) {
    if (await roundResult(page)) break;
    const clock = page.getByTestId('clock');
    if (!(await clock.count())) break;
    const label = await clock.getAttribute('aria-label');
    const long = label.match(/long hand is (?:on the (\d+)|(\d+) marks? past the (\d+))/);
    const minute = long[1] ? (Number(long[1]) % 12) * 5 : (Number(long[3]) % 12) * 5 + Number(long[2]);
    const short = label.match(/short hand is (on the|just past the|between the|nearly on the) (\d+)/);
    let hour = Number(short[2]);
    if (short[1] === 'nearly on the') hour = hour === 1 ? 12 : hour - 1;
    const text = `${hour}:${String(minute).padStart(2, '0')}`;
    const button = page.getByRole('button', { name: text, exact: true });
    if (!(await button.count())) {
      report.bug("What's the Time?", `worked out ${text} from "${label}", but it isn't a choice`);
      return;
    }
    await button.first().click();
    read += 1;
    await page.waitForTimeout(200);
  }
  report.ok(`read ${read} clocks`);
}

/** Rhyme Time: knows which words rhyme from the game's own word groups (the
 *  way a reader knows it from saying them), and taps the rhyme. */
function rhymeGroups() {
  const source = readFileSync(new URL('../../src/games/rhymetime/words.ts', import.meta.url), 'utf8');
  return [...source.matchAll(/words: \[([^\]]*)\]/g)].map((m) => [...m[1].matchAll(/'([a-z]+)'/g)].map((w) => w[1]));
}

export async function playRhymeTime(page, report) {
  const groups = rhymeGroups();
  let found = 0;
  for (let turn = 0; turn < 40; turn += 1) {
    if (await roundResult(page)) break;
    const prompt = page.locator('[data-testid^="prompt:"]');
    if (!(await prompt.count())) break;
    const word = (await prompt.getAttribute('data-testid')).split(':')[1];
    const group = groups.find((g) => g.includes(word));
    let clicked = false;
    for (const b of await page.getByRole('button').all()) {
      const label = (await b.getAttribute('aria-label')) ?? '';
      if (label !== word && group?.includes(label)) {
        await b.click();
        clicked = true;
        break;
      }
    }
    if (!clicked) {
      report.bug('Rhyme Time', `no rhyme for "${word}" among the choices`);
      return;
    }
    found += 1;
    await page.waitForTimeout(200);
  }
  report.ok(`found ${found} rhymes`);
}

/** Group games start by asking how many players. */
async function choosePlayers(page, n) {
  const button = page.getByLabel(`${n} players`, { exact: true });
  if (!(await button.count())) return;
  await button.click();
  await page.waitForTimeout(300);
}

/**
 * Market Memory, played as a team with a good memory: every turn it taps
 * what went in the bag, in the order it went in, then adds the first thing
 * on the shelf that isn't already the last one in.
 */
export async function playMarketMemory(page, report) {
  await choosePlayers(page, 3);
  const bag = [];
  let taps = 0;
  for (let guard = 0; guard < 400; guard += 1) {
    if (await roundResult(page)) break;
    const el = page.locator('[data-testid^="bag:"]');
    if (!(await el.count())) break;
    const [, , recalled, phase] = (await el.getAttribute('data-testid')).split(':');
    if (await page.getByLabel('Got it, carry on').count()) {
      report.bug('Market Memory', 'a perfect memory slipped');
      await page.getByLabel('Got it, carry on').click();
      continue;
    }
    if (phase === 'recall') {
      await page.getByLabel(bag[Number(recalled)], { exact: true }).click();
    } else {
      const names = [];
      for (const b of await page.getByRole('button').all()) {
        const label = (await b.getAttribute('aria-label')) ?? '';
        if (/^(orange|blue|green|yellow|pink) (circle|square|triangle|star|diamond|heart)( in a box)?$/.test(label)) names.push(label);
      }
      const pick = names.find((n) => n !== bag[bag.length - 1]) ?? names[0];
      bag.push(pick);
      await page.getByLabel(pick, { exact: true }).click();
    }
    taps += 1;
    await page.waitForTimeout(120);
  }
  report.ok(`filled the bag with ${bag.length} things in ${taps} taps`);
}

/** Count Around: reads the count and the rules, and says the right thing. */
export async function playCountAround(page, report) {
  await choosePlayers(page, 4);
  let said = 0;
  for (let guard = 0; guard < 120; guard += 1) {
    if (await roundResult(page)) break;
    const el = page.locator('[data-testid^="count:"]');
    if (!(await el.count())) break;
    const n = Number((await el.getAttribute('data-testid')).split(':')[1]);
    const rulesEl = page.locator('[aria-label^="On every"]');
    const rules = (await rulesEl.count())
      ? [...(await rulesEl.getAttribute('aria-label')).matchAll(/On every (\d+)/g)].map((m) => Number(m[1]))
      : [];
    const clap = rules[0] && n % rules[0] === 0;
    const stomp = rules[1] && n % rules[1] === 0;
    const say = clap && stomp ? 'both' : clap ? 'clap' : stomp ? 'stomp' : String(n);
    if (/^\d+$/.test(say)) await page.getByRole('button', { name: say, exact: true }).click();
    else await page.getByLabel(say, { exact: true }).click();
    said += 1;
    await page.waitForTimeout(100);
  }
  report.ok(`counted round ${said} times`);
}

/** Star Jar: three players, one of each kind of question; works each out. */
export async function playStarJar(page, report) {
  await choosePlayers(page, 3);
  // "Play again" keeps everyone's choices, so this is asked only once.
  for (const [i, words] of ['counting', 'adding and taking away', 'times tables'].entries()) {
    const choice = page.getByLabel(`Player ${i + 1}: ${words}`, { exact: true });
    if (!(await choice.count())) break;
    await choice.click();
    await page.waitForTimeout(200);
  }
  let answered = 0;
  for (let guard = 0; guard < 40; guard += 1) {
    if (await roundResult(page)) break;
    const q = page.locator('[data-testid^="question:"]');
    if (!(await q.count())) break;
    const label = await q.getAttribute('aria-label');
    let value;
    const dots = label.match(/^(\d+) dots to count$/);
    if (dots) value = Number(dots[1]);
    else {
      const [, a, op, b] = label.match(/^(\d+) (plus|take away|times|divided by) (\d+)$/);
      const [x, y] = [Number(a), Number(b)];
      value = op === 'plus' ? x + y : op === 'take away' ? x - y : op === 'times' ? x * y : x / y;
    }
    await page.getByRole('button', { name: String(value), exact: true }).click();
    answered += 1;
    await page.waitForTimeout(150);
  }
  report.ok(`answered ${answered} questions for the jar`);
}

/**
 * Maze Team: two players, one arrow pair each — the arrows say whose they
 * are. Explores the way a team would, depth first, one square at a time,
 * starting afresh when the key opens a door.
 */
export async function playMazeTeam(page, report) {
  await choosePlayers(page, 2);
  let presses = 0;
  let current = '';
  let tried = new Map();
  let parent = new Map();
  let keyed = false;
  const step = (cols, at, dir) => (dir === 'up' ? at - cols : dir === 'down' ? at + cols : dir === 'left' ? at - 1 : at + 1);
  const back = { up: 'down', down: 'up', left: 'right', right: 'left' };
  for (let guard = 0; guard < 2000; guard += 1) {
    if (await roundResult(page)) break;
    const board = page.locator('[data-testid^="mazeteam:"]');
    if (!(await board.count()) || (await page.getByText('YOU MADE IT — TOGETHER', { exact: true }).count())) {
      await page.waitForTimeout(250);
      continue;
    }
    const [, size, index, atText] = (await board.getAttribute('data-testid')).split(':');
    const cols = Number(size.split('x')[0]);
    const at = Number(atText);
    const hasKeyNow = !(await page.getByText('GET THE KEY, THEN THE FLAG', { exact: true }).count());
    if (index !== current || hasKeyNow !== keyed) {
      current = index;
      keyed = hasKeyNow;
      tried = new Map();
      parent = new Map();
    }
    const open = ((await board.getAttribute('aria-label')).match(/Open: ([a-z, ]+)\./)?.[1] ?? '').split(', ').filter((d) => d && d !== 'nothing');
    if (!tried.has(at)) tried.set(at, new Set());
    const done = tried.get(at);
    const way = open.find((d) => !done.has(d) && d !== parent.get(at)) ?? parent.get(at);
    if (!way) {
      report.bug('Maze Team', 'nowhere left to try');
      return;
    }
    done.add(way);
    const to = step(cols, at, way);
    if (!parent.has(to) && way !== parent.get(at)) parent.set(to, back[way]);
    await page.getByLabel(new RegExp(`^Go ${way}, for Player`)).click();
    presses += 1;
    await page.waitForTimeout(60);
  }
  report.ok(`walked the mazes with ${presses} presses between two players`);
}

/**
 * Echo Beat: two players. Makes each beat from a fixed set of gaps, and
 * copies the beat it made — with real presses, so the gaps are the real
 * ones the drum heard.
 */
export async function playEchoBeat(page, report) {
  await choosePlayers(page, 2);
  const drumAt = async () => {
    const box = await page.locator('[data-testid^="drum:"]').boundingBox();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  const tapBeat = async (gaps) => {
    const at = await drumAt();
    await page.mouse.click(at.x, at.y);
    for (const g of gaps) {
      await page.waitForTimeout(g);
      await page.mouse.click(at.x, at.y);
    }
  };
  let made = null;
  let beats = 0;
  for (let guard = 0; guard < 200; guard += 1) {
    if (await roundResult(page)) break;
    const drum = page.locator('[data-testid^="drum:"]');
    if (!(await drum.count())) break;
    const phase = (await drum.getAttribute('data-testid')).split(':')[1];
    if (phase === 'make') {
      const doing = await page.locator('[data-testid^="turn:"]').getAttribute('aria-label');
      const n = Number(doing.match(/(\d+) taps/)[1]);
      made = Array.from({ length: n - 1 }, (_, i) => [300, 600, 450, 350, 700][i % 5]);
      await tapBeat(made);
      beats += 1;
    } else if (phase === 'copy') {
      await tapBeat(made);
    } else {
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(150);
  }
  report.ok(`made and echoed ${beats} beats`);
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
  'Bounce Bricks': playBounceBricks,
  'Hungry Worm': playHungryWorm,
  'Peekaboo Pals': playPeekaboo,
  'Hoop Shot': playHoopShot,
  'Soft Landing': playSoftLanding,
  'Tall Tower': playTallTower,
  'Duck Crossing': playDuckCrossing,
  'Code Cracker': playCodeCracker,
  "What's the Time?": playClockTime,
  'Rhyme Time': playRhymeTime,
  'Market Memory': playMarketMemory,
  'Count Around': playCountAround,
  'Star Jar': playStarJar,
  'Maze Team': playMazeTeam,
  'Echo Beat': playEchoBeat,
};
