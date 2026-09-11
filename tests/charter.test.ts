import assert from 'node:assert/strict';
import { test } from 'node:test';

import { GAMES_META, type GameProposal } from '../src/games/catalog.ts';
import {
  isAccepted,
  principle,
  PRINCIPLES,
  reviewProposal,
  type PrincipleId,
} from '../src/games/charter.ts';

/**
 * The charter, checked against itself.
 *
 * The important test is the first one: every game already shipped has to
 * pass the gate that future games will be judged by. A rule the existing
 * catalogue cannot satisfy is a wrong rule, and a gate that only ever runs
 * on hypothetical proposals is one that quietly stops matching reality.
 */

test('every shipped game passes the gate a new one would face', () => {
  for (const game of GAMES_META) {
    // Reviewed against the others, so a game does not collide with itself.
    const others = GAMES_META.filter((g) => g.id !== game.id);
    const findings = reviewProposal(game, others);
    const blocks = findings.filter((f) => f.severity === 'blocks');
    assert.deepEqual(
      blocks.map((f) => `${f.principle}: ${f.message}`),
      [],
      `${game.title} would be rejected by the charter`,
    );
  }
});

test('the principles are a list, not a pile', () => {
  const ids = PRINCIPLES.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate principle');
  for (const p of PRINCIPLES) {
    assert.ok(p.rule.trim().length > 0, `${p.id} has no rule`);
    assert.ok(p.why.trim().length > 0, `${p.id} does not say why it exists`);
    // A rule nobody can state in a sentence is a rule nobody applies.
    assert.ok(p.rule.length < 220, `${p.id}'s rule is too long to hold in your head`);
    assert.equal(principle(p.id).id, p.id);
  }
});

/** A minimum viable idea that clears everything, to vary one field at a time. */
const SOUND: GameProposal = {
  id: 'testgame',
  title: 'A Test Game',
  skill: 'Spatial reasoning and rotation',
  roundEnds: 'Six questions answered.',
  category: 'logic',
  minAge: 6,
  maxAge: 12,
  origin: 'original',
  toldApartBy: 'The shape of each piece.',
};

test('a sound idea is accepted', () => {
  assert.deepEqual(reviewProposal(SOUND, []), []);
  assert.ok(isAccepted(reviewProposal(SOUND, [])));
});

const rejects = (patch: Partial<GameProposal>, expected: PrincipleId) => {
  const findings = reviewProposal({ ...SOUND, ...patch }, []);
  const hit = findings.find((f) => f.principle === expected && f.severity === 'blocks');
  assert.ok(
    hit,
    `expected ${expected} to block, got: ${findings.map((f) => `${f.severity}/${f.principle}`).join(', ') || 'nothing'}`,
  );
  assert.ok(!isAccepted(findings));
};

test('it blocks a round that does not end', () => {
  rejects({ roundEnds: 'When you run out of lives.' }, 'IT_ENDS');
  rejects({ roundEnds: 'It never ends — play as long as you like.' }, 'IT_ENDS');
  rejects({ roundEnds: 'Survive as long as you can.' }, 'IT_ENDS');
  rejects({ roundEnds: '' }, 'IT_ENDS');
});

test('it blocks pressure and the mechanics that make stopping cost something', () => {
  rejects({ roundEnds: 'The timer runs out.' }, 'NOTHING_TO_LOSE');
  rejects({ skill: 'Reflexes under a countdown' }, 'NOTHING_TO_LOSE');
  rejects({ skill: 'Building a daily streak of correct answers' }, 'NOTHING_TO_CHASE');
  rejects({ title: 'Combo Master' }, 'NOTHING_TO_CHASE');
});

test('it blocks a game that practises nothing', () => {
  rejects({ skill: 'Fun' }, 'WORTH_THE_TIME');
  rejects({ skill: 'Passes the time' }, 'WORTH_THE_TIME');
  rejects({ skill: '   ' }, 'WORTH_THE_TIME');
});

test('it blocks a borrowed name, wherever it is hiding', () => {
  rejects({ title: 'Tetris Junior' }, 'ORIGINAL');
  // The prior-art field is the one most likely to name a commercial game
  // honestly, which is exactly why it is scanned.
  rejects({ origin: 'public-domain', priorArt: 'Basically Candy Crush' }, 'ORIGINAL');
  rejects({ origin: 'public-domain', priorArt: '' }, 'ORIGINAL');
});

test('it blocks an age range that is not a real claim', () => {
  rejects({ minAge: 1 }, 'HONEST_AGE');
  rejects({ minAge: 12, maxAge: 6 }, 'HONEST_AGE');
});

test('it blocks pieces told apart by colour alone', () => {
  rejects({ toldApartBy: 'Colour' }, 'REACHABLE_BY_A_CHILD');
  rejects({ toldApartBy: 'the colours' }, 'REACHABLE_BY_A_CHILD');
  rejects({ toldApartBy: '' }, 'REACHABLE_BY_A_CHILD');
  // Colour plus something else is exactly what the rule asks for.
  assert.deepEqual(reviewProposal({ ...SOUND, toldApartBy: 'Colour and shape.' }, []), []);
});

test('it blocks teaching reading to a child who cannot read', () => {
  rejects({ readingIsTheSkill: true, minAge: 3 }, 'PLAYS_WITHOUT_READING');
});

test('it asks rather than blocks where a person has to decide', () => {
  const findings = reviewProposal({ ...SOUND, minAge: 3, maxAge: 99 }, []);
  assert.ok(isAccepted(findings), 'a 3-99 range is a question, not a refusal');
  assert.ok(findings.some((f) => f.principle === 'HONEST_AGE' && f.severity === 'ask'));
});

test('it catches a name already taken', () => {
  const taken = GAMES_META[0];
  const findings = reviewProposal({ ...SOUND, id: taken.id }, GAMES_META);
  assert.ok(!isAccepted(findings));
});
