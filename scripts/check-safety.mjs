#!/usr/bin/env node
/**
 * Safety gate.
 *
 * The child-safety promises this app makes are only worth something if they
 * cannot be quietly broken by a later change. This script fails the build when
 * any of them is violated, so the guarantees are enforced by CI rather than by
 * remembering.
 *
 * Run with `npm run safety` (included in `npm run verify`).
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import process from 'node:process';

const ROOT = new URL('..', import.meta.url).pathname;
const SOURCE_DIRS = ['src'];
const SOURCE_FILES = ['App.tsx', 'index.ts', 'app.config.ts'];
const SOURCE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);

/** APIs that would let the app reach the network or send a child off-device. */
const FORBIDDEN_APIS = [
  { pattern: /\bfetch\s*\(/, why: 'network request (fetch)' },
  { pattern: /\bXMLHttpRequest\b/, why: 'network request (XMLHttpRequest)' },
  { pattern: /\bnew\s+WebSocket\b/, why: 'network connection (WebSocket)' },
  { pattern: /\bnavigator\.sendBeacon\b/, why: 'network beacon' },
  { pattern: /\bLinking\.openURL\b/, why: 'sends the child to an external app or browser' },
  { pattern: /\bWebView\b/, why: 'embeds arbitrary web content' },
  { pattern: /\brequire\s*\(\s*['"]https?:/, why: 'remote code load' },
];

/**
 * Packages that must never appear in the dependency tree: ads, analytics,
 * attribution, crash/behaviour tracking, purchases, and social logins.
 */
const FORBIDDEN_DEPS = [
  'react-native-google-mobile-ads',
  'expo-ads-admob',
  'react-native-admob',
  'react-native-fbsdk-next',
  'appsflyer',
  'react-native-appsflyer',
  '@amplitude/analytics-react-native',
  '@segment/analytics-react-native',
  'mixpanel-react-native',
  'posthog-react-native',
  '@sentry/react-native',
  'react-native-firebase',
  '@react-native-firebase/analytics',
  'expo-analytics',
  'expo-tracking-transparency',
  'react-native-idfa',
  'react-native-device-info',
  'react-native-iap',
  'expo-in-app-purchases',
  'react-native-purchases',
  '@react-native-google-signin/google-signin',
  'expo-ads-facebook',
];

/** Permissions the app must never declare. */
const FORBIDDEN_PERMISSIONS = [
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.CAMERA',
  'android.permission.RECORD_AUDIO',
  'android.permission.READ_CONTACTS',
  'com.google.android.gms.permission.AD_ID',
];

const failures = [];

function fail(message) {
  failures.push(message);
}

function collectSourceFiles() {
  const files = [];

  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (SOURCE_EXTS.has(extname(full))) files.push(full);
    }
  };

  for (const dir of SOURCE_DIRS) walk(join(ROOT, dir));
  for (const file of SOURCE_FILES) files.push(join(ROOT, file));
  return files;
}

/** Strips comments so a rule named in prose does not trip its own check. */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function checkSourceForbiddenApis() {
  for (const file of collectSourceFiles()) {
    const code = stripComments(readFileSync(file, 'utf8'));
    const lines = code.split('\n');

    for (const { pattern, why } of FORBIDDEN_APIS) {
      lines.forEach((line, i) => {
        if (pattern.test(line)) {
          fail(`${relative(ROOT, file)}:${i + 1} uses ${why}`);
        }
      });
    }
  }
}

function checkDependencies() {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const declared = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });

  for (const banned of FORBIDDEN_DEPS) {
    if (declared.some((name) => name === banned || name.startsWith(`${banned}/`))) {
      fail(`package.json declares banned dependency "${banned}"`);
    }
  }

  // Catch a banned package pulled in transitively, too.
  let lock;
  try {
    lock = JSON.parse(readFileSync(join(ROOT, 'package-lock.json'), 'utf8'));
  } catch {
    return;
  }

  for (const path of Object.keys(lock.packages ?? {})) {
    const name = path.replace(/^node_modules\//, '').split('/node_modules/').pop();
    if (FORBIDDEN_DEPS.includes(name)) {
      fail(`package-lock.json resolves banned dependency "${name}" (transitive)`);
    }
  }
}

function checkAppConfig() {
  const config = JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8')).expo;
  const permissions = config?.android?.permissions;

  if (!Array.isArray(permissions) || permissions.length > 0) {
    fail('app.json must declare an empty android.permissions array');
  }

  const blocked = config?.android?.blockedPermissions ?? [];
  for (const permission of FORBIDDEN_PERMISSIONS) {
    if (!blocked.includes(permission)) {
      fail(`app.json does not block ${permission}`);
    }
  }

  if (config?.ios?.infoPlist?.ITSAppUsesNonExemptEncryption !== false) {
    fail('app.json must declare ITSAppUsesNonExemptEncryption: false');
  }
}

checkSourceForbiddenApis();
checkDependencies();
checkAppConfig();

if (failures.length > 0) {
  console.error('\n✖ Child-safety checks failed:\n');
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error('\nSee SAFETY.md for why each rule exists.\n');
  process.exit(1);
}

console.log('✔ Child-safety checks passed (no network, no trackers, no permissions).');
