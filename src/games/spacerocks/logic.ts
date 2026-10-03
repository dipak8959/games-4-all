import { type Rng } from '../../util/random';

/**
 * Space Rocks.
 *
 * A little ship sits in the middle of space with rocks drifting past. Tap
 * where to shoot: the ship turns to face it and fires. A big rock breaks
 * into two middling ones, each of those into two small ones, and a small
 * one into dust. Break every rock, and the next wave drifts in.
 *
 * It practises aiming ahead of something moving — the ship takes a moment
 * to turn and the shot a moment to get there, so the tap has to go where
 * the rock will be — and choosing which rock to take first. It grows with
 * the player: more rocks, faster rocks, and a ship slower to turn.
 *
 * Kind like everything else: a rock that reaches the ship just bumps off its
 * shield. Three waves is the round, fixed before it starts. There's no score:
 * the stars come from how few rocks got through to the shield.
 */

export const FIELD_WIDTH = 320;
export const FIELD_HEIGHT = 480;
export const SHIP = { x: FIELD_WIDTH / 2, y: FIELD_HEIGHT / 2 } as const;
export const SHIP_RADIUS = 14;
/** Rock radius by size: big, middling, small. */
export const ROCK_RADIUS = [30, 18, 10] as const;
export const WAVES = 3;
export const SHOT_SPEED = 420;
/** A shot fades after this long, and only so many fly at once. */
export const SHOT_LIFE = 1;
export const MAX_SHOTS = 3;
/** A shield bump flashes this long, and can't happen twice in it. */
export const FLASH = 0.8;
/** The pause between one wave cleared and the next arriving. */
export const BETWEEN = 1.2;
/** Pieces fly off this much faster than the rock they broke from. */
const SPLIT_SPEEDUP = 1.12;

export type Rock = { readonly id: number; readonly x: number; readonly y: number; readonly vx: number; readonly vy: number; readonly size: 0 | 1 | 2 };
export type Shot = { readonly x: number; readonly y: number; readonly vx: number; readonly vy: number; readonly age: number };

export type SpaceRocksState = {
  readonly rocksPerWave: number;
  readonly rockSpeed: number;
  /** How fast the ship turns, in radians a second. */
  readonly turn: number;
  /** Where the ship points (radians; 0 is right, down is positive), and
   *  where it has been asked to. */
  readonly angle: number;
  readonly aim: number;
  /** A shot waits for the ship to face its way. */
  readonly loaded: boolean;
  readonly rocks: readonly Rock[];
  readonly shots: readonly Shot[];
  readonly wave: number;
  readonly bumps: number;
  readonly flash: number;
  /** Seconds left of the pause before the next wave. */
  readonly pause: number;
  readonly broken: number;
  readonly nextId: number;
  readonly time: number;
  readonly complete: boolean;
};

type LevelSpec = {
  readonly rocks: number;
  readonly speed: number;
  /** Degrees a second the ship can turn. */
  readonly turn: number;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { rocks: 2, speed: 28, turn: 720 },
  { rocks: 2, speed: 38, turn: 600 },
  { rocks: 3, speed: 44, turn: 520 },
  { rocks: 3, speed: 52, turn: 450 },
  { rocks: 4, speed: 56, turn: 410 },
  { rocks: 4, speed: 62, turn: 370 },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

function spawnWave(state: SpaceRocksState, rng: Rng): SpaceRocksState {
  const rocks: Rock[] = [];
  let id = state.nextId;
  for (let i = 0; i < state.rocksPerWave; i += 1) {
    // From the edges, well clear of the ship, drifting across — never
    // straight at it on the first pass.
    const side = (i + Math.floor(rng() * 4)) % 4;
    const along = rng();
    const x = side === 0 ? 0 : side === 1 ? FIELD_WIDTH : along * FIELD_WIDTH;
    const y = side === 2 ? 0 : side === 3 ? FIELD_HEIGHT : along * FIELD_HEIGHT;
    const toShip = Math.atan2(SHIP.y - y, SHIP.x - x);
    const heading = toShip + (rng() < 0.5 ? -1 : 1) * (0.5 + rng() * 0.6);
    const speed = state.rockSpeed * (0.85 + rng() * 0.3);
    rocks.push({ id, x, y, vx: Math.cos(heading) * speed, vy: Math.sin(heading) * speed, size: 0 });
    id += 1;
  }
  return { ...state, rocks, nextId: id };
}

export function createGame(rng: Rng, level: number): SpaceRocksState {
  const spec = specForLevel(level);
  const blank: SpaceRocksState = {
    rocksPerWave: spec.rocks,
    rockSpeed: spec.speed,
    turn: (spec.turn * Math.PI) / 180,
    angle: -Math.PI / 2,
    aim: -Math.PI / 2,
    loaded: false,
    rocks: [],
    shots: [],
    wave: 0,
    bumps: 0,
    flash: 0,
    pause: 0,
    broken: 0,
    nextId: 0,
    time: 0,
    complete: false,
  };
  return spawnWave(blank, rng);
}

/** Every piece a wave breaks into: each big rock is 1 + 2 + 4. */
export function piecesPerWave(state: Pick<SpaceRocksState, 'rocksPerWave'>): number {
  return state.rocksPerWave * 7;
}

/** A tap on space: turn to face it, and shoot. */
export function tapAt(state: SpaceRocksState, x: number, y: number): SpaceRocksState {
  if (state.complete) return state;
  if (Math.hypot(x - SHIP.x, y - SHIP.y) < 4) return state;
  return { ...state, aim: Math.atan2(y - SHIP.y, x - SHIP.x), loaded: true };
}

function wrapAngle(a: number): number {
  let r = a;
  while (r > Math.PI) r -= Math.PI * 2;
  while (r < -Math.PI) r += Math.PI * 2;
  return r;
}

/** Off one edge and straight back in at the other, as soon as a rock's
 *  middle crosses: never drifting along out of sight, where no one can
 *  tap it. */
function wrap(v: number, size: number): number {
  if (v < 0) return v + size;
  if (v > size) return v - size;
  return v;
}

export function step(state: SpaceRocksState, seconds: number, rng: Rng): SpaceRocksState {
  if (state.complete) return state;
  let next = state;
  let left = Math.min(seconds, 0.25);
  while (left > 0 && !next.complete) {
    const dt = Math.min(left, 1 / 240);
    next = tick(next, dt, rng);
    left -= dt;
  }
  return next;
}

function tick(state: SpaceRocksState, dt: number, rng: Rng): SpaceRocksState {
  const time = state.time + dt;
  if (state.pause > 0) {
    const pause = Math.max(0, state.pause - dt);
    if (pause > 0) return { ...state, pause, time };
    return spawnWave({ ...state, pause: 0, time, shots: [] }, rng);
  }

  // Turn towards the aim; fire once facing it.
  const diff = wrapAngle(state.aim - state.angle);
  const turnBy = Math.sign(diff) * Math.min(Math.abs(diff), state.turn * dt);
  const angle = wrapAngle(state.angle + turnBy);
  let shots = state.shots
    .map((s) => ({ ...s, x: s.x + s.vx * dt, y: s.y + s.vy * dt, age: s.age + dt }))
    .filter((s) => s.age < SHOT_LIFE && s.x > -10 && s.x < FIELD_WIDTH + 10 && s.y > -10 && s.y < FIELD_HEIGHT + 10);
  let loaded = state.loaded;
  if (loaded && Math.abs(wrapAngle(state.aim - angle)) < 0.03 && shots.length < MAX_SHOTS) {
    const nose = SHIP_RADIUS + 2;
    shots = [
      ...shots,
      {
        x: SHIP.x + Math.cos(angle) * nose,
        y: SHIP.y + Math.sin(angle) * nose,
        vx: Math.cos(angle) * SHOT_SPEED,
        vy: Math.sin(angle) * SHOT_SPEED,
        age: 0,
      },
    ];
    loaded = false;
  }

  // Rocks drift, and wrap round the edges of space.
  let rocks = state.rocks.map((r) => ({ ...r, x: wrap(r.x + r.vx * dt, FIELD_WIDTH), y: wrap(r.y + r.vy * dt, FIELD_HEIGHT) }));

  // Shots break rocks.
  let { nextId, broken } = state;
  const spent = new Set<number>();
  const pieces: Rock[] = [];
  const hit = new Set<number>();
  shots.forEach((s, si) => {
    const r = rocks.find((rock) => !hit.has(rock.id) && Math.hypot(rock.x - s.x, rock.y - s.y) < ROCK_RADIUS[rock.size]);
    if (!r) return;
    spent.add(si);
    hit.add(r.id);
    broken += 1;
    if (r.size < 2) {
      const speed = Math.hypot(r.vx, r.vy) * SPLIT_SPEEDUP;
      const heading = Math.atan2(r.vy, r.vx);
      for (const turn of [-0.6, 0.6]) {
        pieces.push({
          id: nextId,
          x: r.x,
          y: r.y,
          vx: Math.cos(heading + turn) * speed,
          vy: Math.sin(heading + turn) * speed,
          size: (r.size + 1) as 1 | 2,
        });
        nextId += 1;
      }
    }
  });
  shots = shots.filter((_, i) => !spent.has(i));
  rocks = [...rocks.filter((r) => !hit.has(r.id)), ...pieces];

  // A rock at the ship bumps off its shield.
  let { bumps } = state;
  let flash = Math.max(0, state.flash - dt);
  rocks = rocks.map((r) => {
    const dx = r.x - SHIP.x;
    const dy = r.y - SHIP.y;
    const d = Math.hypot(dx, dy);
    const reach = ROCK_RADIUS[r.size] + SHIP_RADIUS;
    if (d >= reach) return r;
    const nx = d > 0 ? dx / d : 1;
    const ny = d > 0 ? dy / d : 0;
    if (flash <= 0) {
      bumps += 1;
      flash = FLASH;
    }
    const into = r.vx * nx + r.vy * ny;
    return {
      ...r,
      x: SHIP.x + nx * reach,
      y: SHIP.y + ny * reach,
      vx: into < 0 ? r.vx - 2 * into * nx : r.vx,
      vy: into < 0 ? r.vy - 2 * into * ny : r.vy,
    };
  });

  const base = { ...state, angle, loaded, shots, rocks, nextId, broken, bumps, flash, time };
  if (rocks.length === 0) {
    const wave = state.wave + 1;
    if (wave >= WAVES) return { ...base, wave, complete: true };
    return { ...base, wave, pause: BETWEEN, loaded: false };
  }
  return base;
}

/** None through to the shield is three stars; a couple, two; more, one. */
export function starsForBumps(bumps: number): number {
  if (bumps === 0) return 3;
  if (bumps <= 2) return 2;
  return 1;
}

/** How far through the round: pieces broken of every piece there is. */
export function progressOf(state: SpaceRocksState): number {
  return state.complete ? 1 : state.broken / (piecesPerWave(state) * WAVES);
}
