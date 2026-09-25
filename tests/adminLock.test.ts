import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

import { pbkdf2, sha256, toHex, utf8 } from '../src/util/sha256.ts';
import { ITERATIONS, STORED, digestOf, isAdminPassword } from '../src/safety/adminLock.ts';

test('SHA-256 matches the published test vectors', () => {
  assert.equal(toHex(sha256(utf8(''))), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  assert.equal(toHex(sha256(utf8('abc'))), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(
    toHex(sha256(utf8('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'))),
    '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
  );
});

test('PBKDF2-HMAC-SHA256 matches RFC 7914\'s test vector', () => {
  assert.equal(
    toHex(pbkdf2(utf8('passwd'), utf8('salt'), 1, 64)),
    '55ac046e56e3089fec1691c22544b605f94185216dde0465e68b9d57c20dacbc49ca9cccf179b645991664b39d77ef317c71b845b1e30bd509112041d3a19783',
  );
});

test('only a salted, stretched digest of the admin password is stored', () => {
  assert.match(STORED.salt, /^[0-9a-f]{32}$/);
  assert.match(STORED.digest, /^[0-9a-f]{64}$/);
  assert.ok(ITERATIONS >= 10000, 'too few rounds to slow guessing');
  // The digest really is of something else under this salt, not a placeholder.
  assert.notEqual(digestOf('', STORED.salt), STORED.digest);
});

test('wrong passwords are turned away', () => {
  for (const guess of ['', 'password', 'admin', '1234', 'Admin', ' ']) {
    assert.equal(isAdminPassword(guess), false, `"${guess}" unlocked admin mode`);
  }
});

test('admin mode is never saved: it lasts until the app closes', () => {
  // Nothing about admin mode is among the things written to storage, so it
  // can't be left on for a child by accident.
  const storage = readFileSync('src/storage.ts', 'utf8');
  assert.doesNotMatch(storage, /admin/i);
  const provider = readFileSync('src/state/AppProvider.tsx', 'utf8');
  assert.doesNotMatch(provider, /writeJson\([^)]*admin/i);
});

test('admin play is never charged to the active profile', () => {
  const provider = readFileSync('src/state/AppProvider.tsx', 'utf8');
  // No rounds or levels recorded, no play time counted, no limits applied.
  assert.match(provider, /if \(!id \|\| adminRef\.current\.on\) return;/);
  assert.match(provider, /playingRef\.current = !adminRef\.current\.on;/);
  assert.match(provider, /admin\.on \? \{ kind: 'ok', remainingMs: null \}/);
});
