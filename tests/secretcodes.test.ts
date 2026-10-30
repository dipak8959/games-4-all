import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import { starsForMistakes } from '../src/games/types.ts';
import {
  MESSAGES,
  MESSAGES_PER_ROUND,
  claim,
  coded,
  createGame,
  nextMessage,
  preview,
  shift,
  specForLevel,
  turnWheel,
} from '../src/games/secretcodes/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];

test('a careful reader turns the wheel the short way round and reads every message first time', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 10; seed += 1) {
      let s = createGame(seededRng(seed * 17 + level), level);
      while (!s.complete) {
        const key = s.keys[s.index];
        const by = key <= 13 ? 1 : -1;
        for (let i = 0; i < (key <= 13 ? key : 26 - key); i += 1) s = turnWheel(s, by);
        if (!s.firstWordOnly) assert.equal(preview(s), s.messages[s.index]);
        else assert.equal(preview(s).split(' ')[0], s.messages[s.index].split(' ')[0]);
        s = claim(s);
        assert.equal(s.read, true);
        s = nextMessage(s);
      }
      assert.equal(s.mistakes, 0);
      assert.equal(starsForMistakes(s.mistakes), 3);
    }
  }
});

test('every code moves every letter within the level, and never leaves the message as it was', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    const s = createGame(seededRng(level), level);
    assert.equal(s.messages.length, MESSAGES_PER_ROUND);
    for (const key of s.keys) assert.ok(key >= 1 && key <= spec.most);
    assert.notEqual(coded(s), s.messages[0]);
    assert.equal(shift(coded(s), -s.keys[0]), s.messages[0]);
  }
});

test('the messages are capitals and spaces, friendly, and each length has a round\'s worth', () => {
  for (const group of MESSAGES) {
    assert.ok(group.length >= MESSAGES_PER_ROUND);
    for (const m of group) {
      assert.match(m, /^[A-Z]+( [A-Z]+)*$/);
      assert.doesNotMatch(m, /\b(KILL|DEAD|DIE|HATE|GUN|BLOOD|STUPID|HELL)\b/);
    }
  }
});

test('a wrong "it says this" is one mistake, and the message stays', () => {
  let s = createGame(seededRng(3), 2);
  s = claim(s);
  assert.equal(s.mistakes, 1);
  assert.equal(s.read, false);
  assert.equal(s.index, 0);
});

test('shift wraps round the alphabet both ways', () => {
  assert.equal(shift('XYZ ABC', 3), 'ABC DEF');
  assert.equal(shift('ABC', -1), 'ZAB');
  assert.equal(shift(shift('HELLO', 25), -25), 'HELLO');
});
