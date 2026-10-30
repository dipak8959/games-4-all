/**
 * Rhyme Time's words, grouped by how they *sound*.
 *
 * Every word here is in exactly one group, and two words rhyme exactly when
 * they're in the same group — so a wrong choice can never secretly rhyme.
 * That's why a group holds every spelling of its sound (bed, head, said),
 * and why the words were chosen to rhyme the same way in British and
 * American speech (nothing like "aunt", "tomato" or "bath").
 *
 * `tier` is when a group first appears:
 *   1 — three-letter words that rhyme and end the same (cat, hat)
 *   2 — longer words that still end the same (ring, king)
 *   4 — rhymes spelt differently (blue, shoe, two)
 *   5 — groups with a look-alike that doesn't rhyme (food … good)
 *   6 — two-syllable rhymes (rocket, pocket)
 *
 * `traps` are look-alikes that don't rhyme: the eye says yes, the ear no.
 * They're never in a group of their own sound, so they're only ever a
 * wrong answer.
 */

export type RhymeGroup = {
  readonly id: string;
  readonly tier: 1 | 2 | 4 | 5 | 6;
  readonly words: readonly string[];
  readonly traps?: readonly string[];
};

export const GROUPS: readonly RhymeGroup[] = [
  { id: 'at', tier: 1, words: ['cat', 'hat', 'bat', 'mat', 'rat', 'sat'] },
  { id: 'an', tier: 1, words: ['can', 'fan', 'man', 'pan', 'van'] },
  { id: 'ig', tier: 1, words: ['big', 'dig', 'pig', 'wig'] },
  { id: 'op', tier: 1, words: ['hop', 'mop', 'top', 'pop', 'shop'] },
  { id: 'ug', tier: 1, words: ['bug', 'hug', 'jug', 'mug', 'rug'] },
  { id: 'en', tier: 1, words: ['hen', 'pen', 'ten', 'men'] },
  { id: 'ot', tier: 1, words: ['cot', 'dot', 'hot', 'pot'] },
  { id: 'un', tier: 1, words: ['bun', 'fun', 'run', 'sun'] },
  { id: 'et', tier: 1, words: ['net', 'pet', 'wet', 'jet', 'vet'] },
  { id: 'og', tier: 1, words: ['dog', 'fog', 'log', 'frog'] },
  { id: 'ap', tier: 1, words: ['cap', 'map', 'nap', 'tap', 'clap'] },
  { id: 'in', tier: 1, words: ['bin', 'fin', 'pin', 'tin', 'win', 'chin'] },

  { id: 'ing', tier: 2, words: ['ring', 'king', 'sing', 'wing', 'swing'] },
  { id: 'ake', tier: 2, words: ['cake', 'lake', 'make', 'rake', 'snake'] },
  { id: 'ail', tier: 2, words: ['mail', 'nail', 'tail', 'sail', 'snail', 'whale'] },
  { id: 'ell', tier: 2, words: ['bell', 'well', 'shell', 'smell', 'spell'] },
  { id: 'ock', tier: 2, words: ['sock', 'rock', 'lock', 'clock', 'block'] },
  { id: 'ish', tier: 2, words: ['fish', 'dish', 'wish'] },
  { id: 'ook', tier: 2, words: ['book', 'cook', 'hook', 'look'] },
  { id: 'eep', tier: 2, words: ['sheep', 'jeep', 'sleep', 'deep', 'keep', 'leap'] },
  { id: 'all', tier: 2, words: ['ball', 'tall', 'wall', 'call', 'fall', 'crawl'] },
  { id: 'ump', tier: 2, words: ['jump', 'bump', 'lump', 'pump'] },
  { id: 'oat', tier: 2, words: ['boat', 'coat', 'goat', 'note'] },
  { id: 'ain', tier: 2, words: ['rain', 'train', 'chain', 'brain', 'plane', 'lane'] },
  { id: 'ed', tier: 2, words: ['bed', 'red', 'fed', 'shed', 'head', 'bread', 'said'], traps: ['paid'] },

  { id: 'oo', tier: 4, words: ['blue', 'shoe', 'two', 'zoo', 'glue', 'new', 'flew'], traps: ['toe'] },
  { id: 'air', tier: 4, words: ['bear', 'chair', 'hair', 'pear', 'stair', 'square'], traps: ['hear', 'near'] },
  { id: 'ite', tier: 4, words: ['kite', 'night', 'bite', 'white', 'light', 'write'] },
  { id: 'ay', tier: 4, words: ['day', 'play', 'grey', 'they', 'say', 'tray'] },
  { id: 'oh', tier: 4, words: ['snow', 'go', 'toe', 'crow', 'slow', 'glow', 'low'], traps: ['shoe', 'cow'] },
  { id: 'ee', tier: 4, words: ['tree', 'sea', 'key', 'bee', 'three', 'ski'] },
  { id: 'or', tier: 4, words: ['door', 'four', 'more', 'floor', 'roar', 'pour'], traps: ['hour', 'flour'] },
  { id: 'eye', tier: 4, words: ['pie', 'fly', 'sky', 'eye', 'tie', 'cry'] },
  { id: 'oon', tier: 4, words: ['moon', 'spoon', 'tune', 'soon'] },
  { id: 'ird', tier: 4, words: ['bird', 'word', 'heard', 'third'] },
  { id: 'ate', tier: 4, words: ['eight', 'gate', 'late', 'plate', 'skate'] },

  { id: 'ave', tier: 5, words: ['cave', 'wave', 'save', 'gave'], traps: ['have'] },
  { id: 'ive', tier: 5, words: ['five', 'hive', 'dive', 'drive'], traps: ['give'] },
  { id: 'ome', tier: 5, words: ['home', 'dome', 'foam'], traps: ['come'] },
  { id: 'ood', tier: 5, words: ['food', 'mood'], traps: ['good', 'wood'] },
  { id: 'ear', tier: 5, words: ['hear', 'near', 'fear', 'deer', 'clear', 'year'], traps: ['bear', 'pear'] },
  { id: 'ost', tier: 5, words: ['most', 'post', 'ghost', 'toast'], traps: ['cost', 'lost'] },
  { id: 'ove', tier: 5, words: ['move', 'prove', 'groove'], traps: ['love', 'glove'] },
  { id: 'our', tier: 5, words: ['hour', 'flour', 'tower', 'flower', 'shower'], traps: ['four', 'pour'] },
  { id: 'ow', tier: 5, words: ['cow', 'how', 'now', 'wow'], traps: ['low', 'snow'] },

  { id: 'ocket', tier: 6, words: ['rocket', 'pocket', 'socket'] },
  { id: 'itten', tier: 6, words: ['kitten', 'mitten'] },
  { id: 'able', tier: 6, words: ['table', 'cable', 'label'] },
  { id: 'unny', tier: 6, words: ['honey', 'money', 'bunny', 'funny', 'sunny'] },
  { id: 'arrot', tier: 6, words: ['carrot', 'parrot'] },
  { id: 'elly', tier: 6, words: ['jelly', 'belly', 'welly'] },
  { id: 'eddy', tier: 6, words: ['teddy', 'ready'] },
  { id: 'andle', tier: 6, words: ['candle', 'handle'] },
  { id: 'ickle', tier: 6, words: ['pickle', 'tickle'] },
  { id: 'etter', tier: 6, words: ['letter', 'better', 'sweater'] },
  { id: 'ider', tier: 6, words: ['spider', 'cider', 'wider'] },
];

/** Look-alikes that are in no group — they only ever appear as a trap. */
export const TRAP_ONLY: readonly string[] = ['paid', 'have', 'give', 'come', 'good', 'wood', 'cost', 'lost', 'love', 'glove'];
