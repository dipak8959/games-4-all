/**
 * Which face each Pattern Play tile wears.
 *
 * Data only, deliberately: kept out of `PatternMark.tsx` so the tests can
 * import it. Anything with JSX in it cannot be type-stripped by Node's test
 * runner, and the one thing genuinely worth asserting here — that there are
 * at least as many distinct marks as the hardest level puts tiles on the
 * board — is a fact about this list, not about how a triangle is drawn.
 */

export type MarkName =
  | 'disc'
  | 'ring'
  | 'square'
  | 'frame'
  | 'triangle'
  | 'triangleDown'
  | 'diamond'
  | 'cross'
  | 'bars';

/**
 * In a fixed order, so a given tile index always wears the same face within
 * a round. Nine is what `tileCountForLevel` asks for at the top level.
 */
export const MARKS: readonly MarkName[] = [
  'disc',
  'ring',
  'square',
  'frame',
  'triangle',
  'triangleDown',
  'diamond',
  'cross',
  'bars',
];

export const MARK_COUNT = MARKS.length;

/** The face for a tile index, wrapping if a level ever asks for more. */
export function markFor(index: number): MarkName {
  return MARKS[index % MARKS.length];
}

/** Said aloud in place of the shape, so the tiles are nameable. */
export const MARK_LABELS: Record<MarkName, string> = {
  disc: 'circle',
  ring: 'ring',
  square: 'square',
  frame: 'outlined square',
  triangle: 'triangle',
  triangleDown: 'upside-down triangle',
  diamond: 'diamond',
  cross: 'cross',
  bars: 'bars',
};
