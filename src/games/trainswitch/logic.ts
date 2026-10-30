import { randInt, type Rng } from '../../util/random';

/**
 * Train Switch.
 *
 * Trains roll in from the left along a branching track. Each carries a
 * shape, and so does each station at the far end. Tap a junction to flip its
 * points — up or down — and send every train home to the station with its
 * shape. Trains don't stop and don't wait: the points have to be set before
 * each train gets there, and set again for the one behind it.
 *
 * It practises planning ahead: working out which way each junction must go
 * for the train that reaches it next, while watching the rest. It grows
 * with the player: more stations and junctions, faster trains, and trains
 * closer together — so the points must be flipped between one train and the
 * next.
 *
 * Kind like everything else: a train at the wrong station just unloads
 * there. Twelve trains is the round, fixed before the first one sets off.
 * There's no score: the stars come from how many found their own station.
 */

export const FIELD_WIDTH = 320;
export const FIELD_HEIGHT = 480;
export const TRAINS = 12;
/** Junctions stand at these distances across, by depth; stations at the end. */
export const JUNCTION_X = [56, 136, 216] as const;
export const STATION_X = 290;
export const ENTRY: { readonly x: number; readonly y: number } = { x: -20, y: 0 };

export type Shape = 'circle' | 'square' | 'triangle' | 'star' | 'diamond' | 'heart';
export const SHAPES: readonly Shape[] = ['circle', 'square', 'triangle', 'star', 'diamond', 'heart'];

export type TrackNode = {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  /** A junction's two ways on, upper then lower; a station has none. */
  readonly next: readonly [number, number] | null;
  readonly shape: Shape | null;
};

export type Train = {
  readonly id: number;
  readonly shape: Shape;
  /** Along the track from one node to the next (-1 is the way in). */
  readonly from: number;
  readonly to: number;
  readonly along: number;
};

export type Arrival = { readonly shape: Shape; readonly station: Shape; readonly right: boolean };

export type TrainSwitchState = {
  readonly nodes: readonly TrackNode[];
  readonly root: number;
  /** Each junction's points: 0 sends trains up, 1 down. */
  readonly points: readonly number[];
  readonly speed: number;
  /** Seconds between one train setting off and the next. */
  readonly gap: number;
  readonly trains: readonly Train[];
  /** The shapes of the trains still to set off, in order. */
  readonly queue: readonly Shape[];
  readonly sinceLast: number;
  readonly arrivals: readonly Arrival[];
  readonly nextId: number;
  readonly started: boolean;
  readonly complete: boolean;
};

type LevelSpec = {
  readonly stations: number;
  readonly speed: number;
  readonly gap: number;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { stations: 2, speed: 50, gap: 7 },
  { stations: 3, speed: 56, gap: 6 },
  { stations: 4, speed: 62, gap: 5 },
  { stations: 5, speed: 68, gap: 4.2 },
  { stations: 6, speed: 74, gap: 3.6 },
  { stations: 6, speed: 82, gap: 3 },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

/** Builds the track: a tree of junctions, at most three deep, over the
 *  stations stacked down the right. */
function buildTrack(rng: Rng, stations: number): { nodes: TrackNode[]; root: number } {
  const shapes = [...SHAPES].sort(() => rng() - 0.5).slice(0, stations);
  const top = 70;
  const bottom = FIELD_HEIGHT - 50;
  const stationY = (i: number) => (stations === 1 ? (top + bottom) / 2 : top + ((bottom - top) * i) / (stations - 1));
  const nodes: TrackNode[] = [];
  const add = (node: Omit<TrackNode, 'id'>): number => {
    nodes.push({ ...node, id: nodes.length });
    return nodes.length - 1;
  };
  const build = (lo: number, hi: number, depth: number): number => {
    if (hi - lo === 1) return add({ x: STATION_X, y: stationY(lo), next: null, shape: shapes[lo] });
    // Split so neither side is deeper than the three junction columns allow.
    const n = hi - lo;
    const room = 2 ** (JUNCTION_X.length - depth - 1);
    const least = Math.max(1, n - room);
    const most = Math.min(n - 1, room);
    const upper = randInt(rng, least, most);
    const a = build(lo, lo + upper, depth + 1);
    const b = build(lo + upper, hi, depth + 1);
    return add({ x: JUNCTION_X[depth], y: (nodes[a].y + nodes[b].y) / 2, next: [a, b], shape: null });
  };
  const root = build(0, stations, 0);
  return { nodes, root };
}

export function createGame(rng: Rng, level: number): TrainSwitchState {
  const spec = specForLevel(level);
  const { nodes, root } = buildTrack(rng, spec.stations);
  const stationShapes = nodes.filter((n) => n.shape).map((n) => n.shape as Shape);
  const queue = Array.from({ length: TRAINS }, () => stationShapes[randInt(rng, 0, stationShapes.length - 1)]);
  return {
    nodes,
    root,
    points: nodes.map(() => 0),
    speed: spec.speed,
    gap: spec.gap,
    trains: [],
    queue,
    sinceLast: spec.gap,
    arrivals: [],
    nextId: 0,
    started: false,
    complete: false,
  };
}

/** Where a train is on the field. */
export function trainAt(state: TrainSwitchState, train: Train): { x: number; y: number } {
  const to = state.nodes[train.to];
  const from = train.from < 0 ? { x: ENTRY.x, y: to.y } : state.nodes[train.from];
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const t = length > 0 ? Math.min(1, train.along / length) : 1;
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}

/** Flips a junction's points. The first tap anywhere starts the trains. */
export function flip(state: TrainSwitchState, junction: number): TrainSwitchState {
  if (state.complete) return state;
  const node = state.nodes[junction];
  if (!node || !node.next) return state;
  const points = [...state.points];
  points[junction] = points[junction] ? 0 : 1;
  return { ...state, points, started: true };
}

/** Sets the trains going without flipping anything. */
export function start(state: TrainSwitchState): TrainSwitchState {
  return state.started || state.complete ? state : { ...state, started: true };
}

export function step(state: TrainSwitchState, seconds: number): TrainSwitchState {
  if (state.complete || !state.started) return state;
  let next = state;
  let left = Math.min(seconds, 0.25);
  while (left > 0 && !next.complete) {
    const dt = Math.min(left, 1 / 120);
    next = tick(next, dt);
    left -= dt;
  }
  return next;
}

function edgeLength(state: TrainSwitchState, from: number, to: number): number {
  const b = state.nodes[to];
  const a = from < 0 ? { x: ENTRY.x, y: b.y } : state.nodes[from];
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function tick(state: TrainSwitchState, dt: number): TrainSwitchState {
  let { queue, nextId, trains } = state;
  let sinceLast = state.sinceLast + dt;
  // The next train sets off.
  if (queue.length && sinceLast >= state.gap) {
    trains = [...trains, { id: nextId, shape: queue[0], from: -1, to: state.root, along: 0 }];
    queue = queue.slice(1);
    nextId += 1;
    sinceLast = 0;
  }
  const arrivals = [...state.arrivals];
  const moving: Train[] = [];
  for (const t of trains) {
    let train = { ...t, along: t.along + state.speed * dt };
    let length = edgeLength(state, train.from, train.to);
    let arrived = false;
    // Past a node: a junction sends it on by its points; a station is home.
    while (train.along >= length) {
      const node = state.nodes[train.to];
      if (!node.next) {
        arrivals.push({ shape: train.shape, station: node.shape as Shape, right: node.shape === train.shape });
        arrived = true;
        break;
      }
      const on = node.next[state.points[node.id]];
      train = { ...train, from: node.id, to: on, along: train.along - length };
      length = edgeLength(state, train.from, train.to);
    }
    if (!arrived) moving.push(train);
  }
  const complete = arrivals.length >= TRAINS;
  return { ...state, trains: moving, queue, nextId, sinceLast, arrivals, complete };
}

/** The way a train must go at a junction to reach its station: 0 up, 1
 *  down, or null if its station isn't beyond this junction. */
export function wayAt(state: TrainSwitchState, junction: number, shape: Shape): number | null {
  const node = state.nodes[junction];
  if (!node.next) return null;
  const reaches = (id: number): boolean => {
    const n = state.nodes[id];
    return n.next ? reaches(n.next[0]) || reaches(n.next[1]) : n.shape === shape;
  };
  if (reaches(node.next[0])) return 0;
  if (reaches(node.next[1])) return 1;
  return null;
}

export function wrong(state: Pick<TrainSwitchState, 'arrivals'>): number {
  return state.arrivals.filter((a) => !a.right).length;
}

/** Every train home is three stars; a couple astray, two; more, one. */
export function starsForTrains(state: Pick<TrainSwitchState, 'arrivals'>): number {
  const astray = wrong(state);
  if (astray === 0) return 3;
  if (astray <= 2) return 2;
  return 1;
}
