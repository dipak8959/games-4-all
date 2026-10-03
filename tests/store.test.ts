import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

/**
 * What the App Store and Google Play check on submission, held here so a
 * change can't quietly undo it. See SUBMISSION.md.
 */

test('store-facing config: no network or overlay permission, iPad full screen, privacy manifest, real version', () => {
  const app = JSON.parse(readFileSync('app.json', 'utf8')).expo;
  assert.match(app.version, /^[1-9]\d*\.\d+\.\d+$/, 'a release version, not 0.x');
  assert.equal(app.ios.requireFullScreen, true, 'portrait-only on iPad needs full screen');
  assert.equal(app.ios.privacyManifests.NSPrivacyTracking, false);
  assert.deepEqual(app.ios.privacyManifests.NSPrivacyCollectedDataTypes, []);
  const declared = app.ios.privacyManifests.NSPrivacyAccessedAPITypes.map((t: { NSPrivacyAccessedAPIType: string }) => t.NSPrivacyAccessedAPIType);
  for (const api of ['UserDefaults', 'FileTimestamp', 'SystemBootTime']) {
    assert.ok(declared.includes(`NSPrivacyAccessedAPICategory${api}`), `${api} declared`);
  }
  const config = readFileSync('app.config.ts', 'utf8');
  for (const permission of ['INTERNET', 'SYSTEM_ALERT_WINDOW']) assert.match(config, new RegExp(`android\\.permission\\.${permission}`));
  // Blocked by default: only an explicit development build keeps them.
  assert.match(config, /const isDev = process\.env\.APP_VARIANT === 'development';/);
});
