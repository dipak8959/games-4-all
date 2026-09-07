import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AGE_GROUPS, ageGroupIcon, ageGroupLabel, DEFAULT_AGE_GROUP } from '../src/state/ageGroups.ts';

test('there is exactly one age group per level, 1 through 3', () => {
  assert.deepEqual(
    AGE_GROUPS.map((g) => g.level).sort(),
    [1, 2, 3],
  );
});

test('every age group has a non-empty label and icon', () => {
  for (const group of AGE_GROUPS) {
    assert.ok(group.label.length > 0, `level ${group.level} has no label`);
    assert.ok(group.icon.length > 0, `level ${group.level} has no icon`);
  }
});

test('ageGroupLabel and ageGroupIcon return the matching group for every level', () => {
  for (const group of AGE_GROUPS) {
    assert.equal(ageGroupLabel(group.level), group.label);
    assert.equal(ageGroupIcon(group.level), group.icon);
  }
});

test('the default age group is one of the real groups', () => {
  assert.ok(AGE_GROUPS.some((g) => g.level === DEFAULT_AGE_GROUP));
});
