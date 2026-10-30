/**
 * The things Shadow Match draws, as plain geometry.
 *
 * Each figure is a handful of rectangles, discs and triangles laid out on a
 * 100-unit square, so the same description draws the thing in colour and
 * its shadow in ink, at any size, without an image file or a drawing
 * library.
 *
 * Figures come in families of three: three houses, three trees, three boats.
 * The members of a family share most of their outline and differ in one
 * part — a chimney, a second sail, a third snowball — which is what makes a
 * near miss at the harder levels. Figures from different families are the
 * easy decoys.
 *
 * No two figures are the same outline turned, so a turned shadow can only
 * ever be one thing.
 */

export type Part =
  | { readonly k: 'rect'; readonly x: number; readonly y: number; readonly w: number; readonly h: number }
  | { readonly k: 'disc'; readonly cx: number; readonly cy: number; readonly r: number }
  /** An isosceles triangle in the box (x, y, w, h), its point facing `dir`. */
  | {
      readonly k: 'tri';
      readonly x: number;
      readonly y: number;
      readonly w: number;
      readonly h: number;
      readonly dir: 'up' | 'down' | 'left' | 'right';
    };

export type Figure = {
  readonly id: string;
  readonly family: string;
  /** What a screen reader calls it: "house with a chimney". */
  readonly name: string;
  readonly parts: readonly Part[];
};

const rect = (x: number, y: number, w: number, h: number): Part => ({ k: 'rect', x, y, w, h });
const disc = (cx: number, cy: number, r: number): Part => ({ k: 'disc', cx, cy, r });
const tri = (x: number, y: number, w: number, h: number, dir: 'up' | 'down' | 'left' | 'right' = 'up'): Part => ({
  k: 'tri',
  x,
  y,
  w,
  h,
  dir,
});

const wheels = [disc(28, 74, 10), disc(72, 74, 10)];

export const FIGURES: readonly Figure[] = [
  // Houses: the same roof and walls, then a chimney, then long and low.
  { id: 'house', family: 'house', name: 'house', parts: [rect(25, 50, 50, 40), tri(15, 15, 70, 35)] },
  {
    id: 'house-chimney',
    family: 'house',
    name: 'house with a chimney',
    parts: [rect(25, 50, 50, 40), tri(15, 15, 70, 35), rect(56, 0, 18, 42)],
  },
  { id: 'house-wide', family: 'house', name: 'wide house', parts: [rect(8, 58, 84, 34), tri(4, 28, 92, 30)] },

  // Trees.
  {
    id: 'tree-pine',
    family: 'tree',
    name: 'pine tree',
    parts: [tri(24, 6, 52, 36), tri(14, 30, 72, 44), rect(44, 74, 12, 18)],
  },
  { id: 'tree-round', family: 'tree', name: 'round tree', parts: [disc(50, 36, 28), rect(40, 58, 20, 34)] },
  { id: 'tree-tall', family: 'tree', name: 'tall pointed tree', parts: [tri(28, 6, 44, 72), rect(45, 78, 10, 14)] },

  // Boats.
  {
    id: 'boat-sail',
    family: 'boat',
    name: 'sailing boat',
    parts: [rect(16, 70, 68, 12), rect(47, 12, 4, 58), tri(51, 16, 30, 50, 'right')],
  },
  {
    id: 'boat-two-sails',
    family: 'boat',
    name: 'boat with two sails',
    parts: [rect(16, 70, 68, 12), rect(47, 12, 4, 58), tri(51, 16, 30, 50, 'right'), tri(15, 20, 32, 48, 'left')],
  },
  {
    id: 'boat-cabin',
    family: 'boat',
    name: 'boat with a cabin',
    parts: [rect(16, 70, 68, 12), rect(32, 50, 36, 20), rect(47, 30, 6, 20)],
  },

  // Rockets.
  {
    id: 'rocket',
    family: 'rocket',
    name: 'rocket',
    parts: [rect(40, 26, 20, 56), tri(40, 6, 20, 20), rect(24, 56, 16, 26), rect(60, 56, 16, 26)],
  },
  { id: 'rocket-plain', family: 'rocket', name: 'rocket without fins', parts: [rect(40, 26, 20, 56), tri(40, 6, 20, 20)] },
  {
    id: 'rocket-flame',
    family: 'rocket',
    name: 'rocket with a flame',
    parts: [rect(40, 20, 20, 52), tri(40, 2, 20, 18), rect(28, 54, 12, 18), rect(60, 54, 12, 18), tri(42, 72, 16, 24, 'down')],
  },

  // Snowmen.
  { id: 'snowman', family: 'snowman', name: 'snowman', parts: [disc(50, 68, 22), disc(50, 32, 15)] },
  {
    id: 'snowman-three',
    family: 'snowman',
    name: 'snowman with three snowballs',
    parts: [disc(50, 76, 17), disc(50, 48, 13), disc(50, 24, 10)],
  },
  {
    id: 'snowman-hat',
    family: 'snowman',
    name: 'snowman in a hat',
    parts: [disc(50, 72, 20), disc(50, 40, 14), rect(40, 8, 20, 16), rect(33, 22, 34, 5)],
  },

  // Things on a stick.
  { id: 'lollipop', family: 'stick', name: 'lollipop', parts: [disc(50, 30, 22), rect(48, 50, 4, 46)] },
  { id: 'flag', family: 'stick', name: 'flag', parts: [rect(22, 8, 6, 86), rect(28, 10, 50, 32)] },
  { id: 'signpost', family: 'stick', name: 'signpost', parts: [rect(47, 36, 6, 58), rect(18, 10, 64, 30)] },

  // Cars and the like.
  { id: 'car', family: 'car', name: 'car', parts: [rect(8, 46, 84, 24), rect(28, 26, 40, 22), ...wheels] },
  { id: 'van', family: 'car', name: 'van', parts: [rect(8, 26, 84, 44), ...wheels] },
  { id: 'truck', family: 'car', name: 'truck', parts: [rect(8, 46, 52, 24), rect(62, 30, 30, 40), ...wheels] },

  // Castles.
  {
    id: 'castle',
    family: 'castle',
    name: 'castle',
    parts: [rect(15, 40, 70, 52), rect(15, 24, 16, 16), rect(42, 24, 16, 16), rect(69, 24, 16, 16)],
  },
  {
    id: 'castle-two',
    family: 'castle',
    name: 'castle with two towers',
    parts: [rect(15, 40, 70, 52), rect(15, 14, 18, 26), rect(67, 14, 18, 26)],
  },
  {
    id: 'castle-tower',
    family: 'castle',
    name: 'castle with a pointed tower',
    parts: [rect(15, 50, 70, 42), rect(38, 26, 24, 24), tri(34, 6, 32, 20)],
  },

  // Fish.
  { id: 'fish', family: 'fish', name: 'fish', parts: [disc(40, 50, 24), tri(62, 30, 28, 40, 'left')] },
  {
    id: 'fish-fin',
    family: 'fish',
    name: 'fish with a fin',
    parts: [disc(40, 54, 24), tri(62, 34, 28, 40, 'left'), tri(30, 14, 22, 18)],
  },
  {
    id: 'fish-long',
    family: 'fish',
    name: 'long fish',
    parts: [disc(26, 50, 16), rect(26, 36, 38, 28), tri(64, 30, 28, 40, 'left')],
  },

  // Cups.
  {
    id: 'mug',
    family: 'cup',
    name: 'mug',
    parts: [rect(20, 30, 46, 56), rect(66, 42, 16, 8), rect(76, 42, 8, 32), rect(66, 66, 16, 8)],
  },
  { id: 'glass', family: 'cup', name: 'glass', parts: [rect(33, 12, 34, 78)] },
  { id: 'goblet', family: 'cup', name: 'goblet', parts: [rect(26, 14, 48, 36), rect(46, 50, 8, 30), rect(30, 80, 40, 8)] },
];

export const FAMILIES: readonly string[] = [...new Set(FIGURES.map((f) => f.family))];

export function figure(id: string): Figure {
  const found = FIGURES.find((f) => f.id === id);
  if (!found) throw new Error(`No figure "${id}"`);
  return found;
}
