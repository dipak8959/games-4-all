import { randInt, shuffle, type Rng } from '../../util/random';

/**
 * Lane Dash.
 *
 * A top-down race on a straight road, against two rival cars, to a
 * chequered flag. Tap the left or right half of the screen to move a lane
 * over. Cones, puddles and roadworks sit in the lanes; hit one and the car
 * spins and drops to half speed for a moment, and the rivals get ahead.
 * Where you cross the flag is the result: first is three stars, second two,
 * third one.
 *
 * The racing game that fits the charter:
 *
 *   - It ends. The track is laid out before the race and ends at the flag,
 *     twenty-five to thirty-five seconds away. There is no clock on screen,
 *     no lap time and no record — the only thing that matters is the order
 *     you cross the line in, and that's forgotten once the round is over.
 *   - Nothing to lose, in the charter's sense. A bump costs time, not the
 *     race: you always reach the flag, and even third place is a star.
 *   - Fair rivals. Each rival's pace is fixed before the start and never
 *     changes. They don't speed up when you're ahead or slow down when
 *     you're behind — the "rubber band" that makes other racing games feel
 *     close by quietly cheating. A clean race always wins.
 *
 * What it practises: looking ahead and choosing a lane early enough to get
 * round what's coming — a different skill from Puddle Hop's when-to-jump.
 *
 * Everything here is pure: `step` advances time, `steer` changes lane. The
 * track is built in the road's own units: `ROAD_WIDTH` across, and forward
 * distance along it. The screen scales that to the phone.
 */

export const ROAD_WIDTH = 320;
export const CAR_LENGTH = 70;
export const CAR_WIDTH = 56;

/** How fast a lane change happens, in lanes per second. A change of one
 *  lane takes about a sixth of a second — quick, but visible. */
export const LANE_SPEED = 6;

/** A bump: half speed for this long, spinning for part of it. */
export const SLOW_FOR = 1;
export const SLOW_FACTOR = 0.5;
export const SPIN_FOR = 0.6;

const RUNWAY = 520;
const RUN_OUT = 420;

export type ObstacleKind = 'cone' | 'puddle' | 'roadworks';

/** How much of a lane each kind fills across, and how long it is. Told
 *  apart by shape: a small triangle, a wide flat pool, a long striped block. */
export const OBSTACLE_SHAPES: Readonly<Record<ObstacleKind, { readonly width: number; readonly length: number }>> = {
  cone: { width: 30, length: 30 },
  puddle: { width: 76, length: 50 },
  roadworks: { width: 64, length: 120 },
};

export type Obstacle = {
  readonly kind: ObstacleKind;
  readonly lane: number;
  /** Distance along the track of the obstacle's near edge. */
  readonly y: number;
  readonly width: number;
  readonly length: number;
  /** Already bumped into; a bump counts once. */
  readonly hit: boolean;
};

/** Where a rival is heading: be in `lane` by the time you reach `y`. */
export type Waypoint = { readonly y: number; readonly lane: number };

export type Rival = {
  readonly number: number;
  /** Track units per second, fixed for the whole race. */
  readonly pace: number;
  /** Starting grid: which lane, and how far behind the line. */
  readonly startLane: number;
  readonly startBack: number;
  readonly path: readonly Waypoint[];
};

/** How far along the track a rival is after `seconds`. */
export function rivalDistance(rival: Rival, seconds: number, finish: number): number {
  return Math.min(finish, rival.pace * seconds - rival.startBack);
}

/** When a rival crosses the flag. Fixed before the race starts. */
export function rivalFinishTime(rival: Rival, finish: number): number {
  return (finish + rival.startBack) / rival.pace;
}

export type LaneDashState = {
  readonly lanes: number;
  readonly speed: number;
  readonly obstacles: readonly Obstacle[];
  readonly finish: number;
  readonly rivals: readonly Rival[];
  /** Seconds since the start. */
  readonly elapsed: number;
  /** Distance along the track of the car's front bumper. */
  readonly distance: number;
  /** The lane being steered to, and where the car actually is across the
   *  road, in lanes (it slides from one to the other). */
  readonly lane: number;
  readonly laneX: number;
  readonly slowFor: number;
  readonly spinFor: number;
  readonly bumps: number;
  readonly started: boolean;
  /** Where the car finished: 1, 2 or 3. Set when it crosses the flag. */
  readonly place: number | null;
  readonly complete: boolean;
};

type LevelSpec = {
  readonly lanes: number;
  readonly speed: number;
  /** Rows of obstacles along the track. */
  readonly rows: number;
  readonly kinds: readonly ObstacleKind[];
  /** Chance a row blocks two lanes rather than one (three-lane roads only). */
  readonly doubleChance: number;
  /** Time between rows, in seconds at full speed. */
  readonly gapMin: number;
  readonly gapMax: number;
  /** How many seconds a clean race finishes ahead of the nearer rival. A
   *  bump loses half a second, so this is roughly how many bumps you can
   *  afford — halved — before you lose first place. */
  readonly margin: number;
};

/**
 * One entry per level, 1-6. Every dial moves the same way: a wider road
 * with more to block it, faster, busier, with less room between rows and
 * rivals who are closer behind a clean race.
 */
const LEVELS: readonly LevelSpec[] = [
  { lanes: 2, speed: 170, rows: 9, kinds: ['cone'], doubleChance: 0, gapMin: 1.6, gapMax: 2.4, margin: 2.25 },
  { lanes: 2, speed: 195, rows: 11, kinds: ['cone', 'puddle'], doubleChance: 0, gapMin: 1.4, gapMax: 2.1, margin: 1.75 },
  { lanes: 3, speed: 225, rows: 13, kinds: ['cone', 'puddle'], doubleChance: 0.3, gapMin: 1.25, gapMax: 1.85, margin: 1.25 },
  { lanes: 3, speed: 255, rows: 15, kinds: ['cone', 'puddle', 'roadworks'], doubleChance: 0.4, gapMin: 1.1, gapMax: 1.6, margin: 1 },
  { lanes: 3, speed: 290, rows: 17, kinds: ['cone', 'puddle', 'roadworks'], doubleChance: 0.5, gapMin: 0.95, gapMax: 1.4, margin: 0.75 },
  { lanes: 3, speed: 330, rows: 19, kinds: ['cone', 'puddle', 'roadworks'], doubleChance: 0.6, gapMin: 0.8, gapMax: 1.2, margin: 0.45 },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

export const laneWidth = (lanes: number): number => ROAD_WIDTH / lanes;

/** Centre of a lane (or a fractional lane position), across the road. */
export const laneCentre = (lanes: number, lane: number): number => (lane + 0.5) * laneWidth(lanes);

/**
 * Plans a line through the rows: at each row, stay in the current lane if
 * it's clear, otherwise take the nearest clear lane. Used for the rivals'
 * paths, and by the tests as the "perfect driver".
 */
export function cleanLine(
  rows: readonly (readonly number[])[],
  rowY: readonly number[],
  startLane: number,
  lanes: number,
  rng: Rng,
): Waypoint[] {
  const path: Waypoint[] = [];
  let lane = startLane;
  rows.forEach((blocked, i) => {
    if (blocked.includes(lane)) {
      const free = Array.from({ length: lanes }, (_, l) => l).filter((l) => !blocked.includes(l));
      const nearest = Math.min(...free.map((l) => Math.abs(l - lane)));
      const options = free.filter((l) => Math.abs(l - lane) === nearest);
      lane = options[randInt(rng, 0, options.length - 1)];
    }
    path.push({ y: rowY[i], lane });
  });
  return path;
}

export function createGame(rng: Rng, level: number): LaneDashState {
  const spec = specForLevel(level);
  const allLanes = Array.from({ length: spec.lanes }, (_, l) => l);

  // Every kind the level allows turns up at least once.
  const kindQueue = shuffle(rng, [
    ...spec.kinds,
    ...Array.from({ length: spec.rows * 2 }, () => spec.kinds[randInt(rng, 0, spec.kinds.length - 1)]),
  ]);

  const obstacles: Obstacle[] = [];
  const rows: number[][] = [];
  const rowY: number[] = [];
  let y = RUNWAY;
  for (let r = 0; r < spec.rows; r += 1) {
    // Never every lane: there is always a way through.
    const blockCount = spec.lanes >= 3 && rng() < spec.doubleChance ? 2 : 1;
    const blocked = shuffle(rng, allLanes).slice(0, Math.min(blockCount, spec.lanes - 1));
    let rowLength = 0;
    for (const lane of blocked) {
      const kind = kindQueue.pop() ?? 'cone';
      const { width, length } = OBSTACLE_SHAPES[kind];
      obstacles.push({ kind, lane, y, width, length, hit: false });
      rowLength = Math.max(rowLength, length);
    }
    rows.push(blocked);
    rowY.push(y);
    // Measured from the far end of this row, so a long block of roadworks
    // never eats into the time to move over for the next one.
    const gapSeconds = spec.gapMin + rng() * (spec.gapMax - spec.gapMin);
    y += rowLength + Math.round(spec.speed * gapSeconds);
  }
  const finish = y + RUN_OUT;

  // The grid: your car in the middle lane, rivals in the others — and where
  // a two-lane road runs out of lanes, a car-length and a bit behind.
  const start = Math.floor(spec.lanes / 2);
  const others = allLanes.filter((l) => l !== start);

  // Rivals: a fixed pace each, set so a clean race finishes `margin` seconds
  // ahead of the nearer one and twice that ahead of the other.
  const clean = finish / spec.speed;
  const rivals: Rival[] = [0, 1].map((i) => {
    const startLane = others[i % others.length];
    const startBack = Math.floor(i / others.length) * (CAR_LENGTH + 40);
    return {
      number: i + 2,
      pace: (finish + startBack) / (clean + spec.margin * (i + 1)),
      startLane,
      startBack,
      path: cleanLine(rows, rowY, startLane, spec.lanes, rng),
    };
  });

  return {
    lanes: spec.lanes,
    speed: spec.speed,
    obstacles,
    finish,
    rivals,
    elapsed: 0,
    distance: 0,
    lane: start,
    laneX: start,
    slowFor: 0,
    spinFor: 0,
    bumps: 0,
    started: false,
    place: null,
    complete: false,
  };
}

/** A tap on one side of the road. The first tap starts the race and steers
 *  nowhere; after that, each tap moves one lane that way, to the edge. */
export function steer(state: LaneDashState, direction: -1 | 1): LaneDashState {
  if (state.complete) return state;
  if (!state.started) return { ...state, started: true };
  const lane = Math.max(0, Math.min(state.lanes - 1, state.lane + direction));
  return lane === state.lane ? state : { ...state, lane };
}

/** Where a rival is across the road at a distance along the track: in the
 *  lane of its next waypoint, sliding over during the stretch before it. */
export function rivalLaneAt(rival: Rival, y: number): number {
  let from = rival.startLane;
  let fromY = 0;
  for (const point of rival.path) {
    if (y < point.y) {
      const changeStart = Math.max(fromY, point.y - 90);
      if (y <= changeStart || from === point.lane) return from;
      const t = Math.min(1, (y - changeStart) / (point.y - 20 - changeStart));
      return from + (point.lane - from) * Math.max(0, t);
    }
    from = point.lane;
    fromY = point.y;
  }
  return from;
}

const FORGIVE = 6;

function touches(state: LaneDashState, o: Obstacle): boolean {
  const front = state.distance;
  const back = state.distance - CAR_LENGTH;
  const along = front > o.y + FORGIVE && back < o.y + o.length - FORGIVE;
  const across =
    Math.abs(laneCentre(state.lanes, state.laneX) - laneCentre(state.lanes, o.lane)) <
    (CAR_WIDTH + o.width) / 2 - FORGIVE;
  return along && across;
}

/** Where the car is in the race right now: 1 + the rivals ahead of it. */
export function positionNow(state: LaneDashState): number {
  return 1 + state.rivals.filter((r) => rivalDistance(r, state.elapsed, state.finish) > state.distance).length;
}

/** Advances the race by `seconds`, in small slices so a slow frame can
 *  never carry the car through an obstacle without touching it. */
export function step(state: LaneDashState, seconds: number): LaneDashState {
  let next = state;
  let left = Math.min(seconds, 0.25);
  while (left > 0 && !next.complete) {
    const dt = Math.min(left, 1 / 120);
    next = tick(next, dt);
    left -= dt;
  }
  return next;
}

function tick(state: LaneDashState, dt: number): LaneDashState {
  if (!state.started || state.complete) return state;

  const speed = state.speed * (state.slowFor > 0 ? SLOW_FACTOR : 1);
  const distance = Math.min(state.finish, state.distance + speed * dt);
  const elapsed = state.elapsed + dt;

  const move = LANE_SPEED * dt;
  const gap = state.lane - state.laneX;
  const laneX = Math.abs(gap) <= move ? state.lane : state.laneX + Math.sign(gap) * move;

  let next: LaneDashState = {
    ...state,
    distance,
    elapsed,
    laneX,
    slowFor: Math.max(0, state.slowFor - dt),
    spinFor: Math.max(0, state.spinFor - dt),
  };

  const bumped = next.obstacles.findIndex((o) => !o.hit && touches(next, o));
  if (bumped >= 0) {
    next = {
      ...next,
      obstacles: next.obstacles.map((o, i) => (i === bumped ? { ...o, hit: true } : o)),
      bumps: next.bumps + 1,
      slowFor: SLOW_FOR,
      spinFor: SPIN_FOR,
    };
  }

  if (distance >= state.finish) {
    // Placed by who was over the line first. Rivals' finishing times are
    // fixed, so this is exact rather than a guess from the last frame.
    const place = 1 + next.rivals.filter((r) => rivalFinishTime(r, next.finish) < elapsed).length;
    return { ...next, place, complete: true };
  }
  return next;
}

/** Stars by finishing place: first three, second two, third one. */
export function starsForPlace(place: number): number {
  return Math.max(1, 4 - place);
}

/** How long a clean race takes, in seconds. */
export function raceTime(state: LaneDashState): number {
  return state.finish / state.speed;
}
