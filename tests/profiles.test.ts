import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  addProfile,
  clampAge,
  EMPTY_PROFILES,
  getActiveProfile,
  MAX_AGE,
  MIN_AGE,
  removeProfile,
  switchProfile,
  updateProfile,
} from '../src/state/profiles.ts';

test('clampAge keeps ages within MIN_AGE and MAX_AGE, and rounds', () => {
  assert.equal(clampAge(0), MIN_AGE);
  assert.equal(clampAge(-5), MIN_AGE);
  assert.equal(clampAge(200), MAX_AGE);
  assert.equal(clampAge(6.4), 6);
  assert.equal(clampAge(6.6), 7);
});

test('an empty profiles state has no active profile', () => {
  assert.equal(getActiveProfile(EMPTY_PROFILES), null);
});

test('the first profile added becomes active automatically', () => {
  const state = addProfile(EMPTY_PROFILES, { name: 'Star', avatar: '🧒', age: 6 }, 'a');
  assert.equal(state.activeProfileId, 'a');
  assert.deepEqual(getActiveProfile(state), { id: 'a', name: 'Star', avatar: '🧒', age: 6 });
});

test('a second profile added does not steal activeness from the first', () => {
  let state = addProfile(EMPTY_PROFILES, { name: 'Star', avatar: '🧒', age: 6 }, 'a');
  state = addProfile(state, { name: 'Champ', avatar: '🧑', age: 35 }, 'b');
  assert.equal(state.activeProfileId, 'a');
  assert.equal(state.profiles.length, 2);
});

test('addProfile clamps an out-of-range age', () => {
  const state = addProfile(EMPTY_PROFILES, { name: 'Star', avatar: '🧒', age: 500 }, 'a');
  assert.equal(state.profiles[0].age, MAX_AGE);
});

test('updateProfile patches only the given fields, on the matching profile only', () => {
  let state = addProfile(EMPTY_PROFILES, { name: 'Star', avatar: '🧒', age: 6 }, 'a');
  state = addProfile(state, { name: 'Champ', avatar: '🧑', age: 35 }, 'b');

  state = updateProfile(state, 'a', { age: 7 });
  const a = state.profiles.find((p) => p.id === 'a');
  const b = state.profiles.find((p) => p.id === 'b');
  assert.equal(a?.age, 7);
  assert.equal(a?.name, 'Star', 'unpatched fields must be unchanged');
  assert.equal(b?.age, 35, 'the other profile must be untouched');
});

test('updateProfile clamps a patched age', () => {
  let state = addProfile(EMPTY_PROFILES, { name: 'Star', avatar: '🧒', age: 6 }, 'a');
  state = updateProfile(state, 'a', { age: -3 });
  assert.equal(state.profiles[0].age, MIN_AGE);
});

test('switchProfile changes the active id when the target exists', () => {
  let state = addProfile(EMPTY_PROFILES, { name: 'Star', avatar: '🧒', age: 6 }, 'a');
  state = addProfile(state, { name: 'Champ', avatar: '🧑', age: 35 }, 'b');
  state = switchProfile(state, 'b');
  assert.equal(state.activeProfileId, 'b');
});

test('switchProfile to an unknown id is a no-op', () => {
  const state = addProfile(EMPTY_PROFILES, { name: 'Star', avatar: '🧒', age: 6 }, 'a');
  const next = switchProfile(state, 'does-not-exist');
  assert.deepEqual(next, state);
});

test('removeProfile drops the profile and hands activeness to whoever remains', () => {
  let state = addProfile(EMPTY_PROFILES, { name: 'Star', avatar: '🧒', age: 6 }, 'a');
  state = addProfile(state, { name: 'Champ', avatar: '🧑', age: 35 }, 'b');
  // 'a' is active; removing it must not leave a dangling activeProfileId.
  state = removeProfile(state, 'a');
  assert.equal(state.profiles.length, 1);
  assert.equal(state.activeProfileId, 'b');
});

test('removeProfile of a non-active profile leaves activeness untouched', () => {
  let state = addProfile(EMPTY_PROFILES, { name: 'Star', avatar: '🧒', age: 6 }, 'a');
  state = addProfile(state, { name: 'Champ', avatar: '🧑', age: 35 }, 'b');
  state = removeProfile(state, 'b');
  assert.equal(state.activeProfileId, 'a');
  assert.equal(state.profiles.length, 1);
});

test('removing every profile leaves an empty, valid state', () => {
  let state = addProfile(EMPTY_PROFILES, { name: 'Star', avatar: '🧒', age: 6 }, 'a');
  state = removeProfile(state, 'a');
  assert.deepEqual(state, { profiles: [], activeProfileId: null });
  assert.equal(getActiveProfile(state), null);
});
