#!/usr/bin/env node
/**
 * The phone server: keeps Expo Go on your phone running the latest code,
 * wherever the change was made.
 *
 * Runs on a computer that stays on (your desktop). It:
 *
 *   - follows the branch on GitHub: every 30 seconds it fetches, and when
 *     there are new commits — from a cloud session, a laptop, anywhere —
 *     fast-forwards to them. Metro sees the files change and the phone
 *     reloads by itself;
 *   - reinstalls packages, and restarts Expo, when the dependencies or the
 *     app's config change, which a reload can't pick up;
 *   - runs `expo start --tunnel`, so the phone can be on any network, and
 *     starts it again if it stops or its tunnel drops;
 *   - writes the address Expo Go opens to `.expo/phone-url.txt`, and prints
 *     it with a QR code.
 *
 * It never overwrites work in progress: with uncommitted changes, or
 * commits of its own, it stops following and says so.
 *
 *   npm run phone                       follow the branch checked out now
 *   npm run phone -- --branch main      follow another branch
 *   npm run phone -- --lan              same Wi-Fi only, no tunnel
 *   npm run phone -- --no-follow        just serve, never pull
 *
 * See TESTING-ON-PHONES.md. Nothing here ships in the app.
 */
import { spawn, spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { networkInterfaces } from 'node:os';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WIN = process.platform === 'win32';
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const EVERY_MS = Number(option('interval', '30')) * 1000;
const TUNNEL = !flag('lan');
const FOLLOW = !flag('no-follow');
/** Changes a reload can't pick up: Expo has to start again. */
const NEEDS_RESTART = [/^package(-lock)?\.json$/, /^app\.(json|config\.ts)$/, /^babel\.config\.js$/, /^metro\.config\.js$/, /^tsconfig\.json$/];
const NEEDS_INSTALL = [/^package(-lock)?\.json$/];

mkdirSync(join(ROOT, '.expo'), { recursive: true });
const LOG = join(ROOT, '.expo', 'phone.log');
const URL_FILE = join(ROOT, '.expo', 'phone-url.txt');

function say(message) {
  const line = `[phone ${new Date().toLocaleTimeString()}] ${message}`;
  console.log(line);
  try {
    appendFileSync(LOG, `${line}\n`);
  } catch {
    // A log that can't be written is no reason to stop serving.
  }
}

function run(command, commandArgs, { quiet = false, timeout = 0 } = {}) {
  const result = spawnSync(command, commandArgs, { cwd: ROOT, encoding: 'utf8', shell: WIN, timeout });
  if (!quiet && result.status !== 0) say(`${command} ${commandArgs.join(' ')} failed: ${(result.stderr || result.stdout || '').trim().split('\n').slice(-3).join(' / ')}`);
  return { ok: result.status === 0, out: (result.stdout ?? '').trim() };
}

const git = (...a) => run('git', a, { quiet: true });

// --- Following the branch -----------------------------------------------------

const branch = option('branch', git('rev-parse', '--abbrev-ref', 'HEAD').out);
if (!branch || branch === 'HEAD') {
  say('Not on a branch: check one out (or pass --branch <name>) so there is something to follow.');
  process.exit(1);
}
if (git('rev-parse', '--abbrev-ref', 'HEAD').out !== branch) {
  say(`Switching to ${branch}.`);
  git('fetch', 'origin', branch);
  if (!run('git', ['checkout', branch]).ok) process.exit(1);
}

let warned = '';
function warnOnce(key, message) {
  if (warned === key) return;
  warned = key;
  say(message);
}

/** Fast-forwards to the branch on GitHub. Returns the files that changed. */
function follow() {
  if (!git('fetch', '--quiet', 'origin', branch).ok) {
    warnOnce('offline', `Couldn't reach GitHub to check ${branch}; trying again in ${EVERY_MS / 1000}s.`);
    return [];
  }
  const here = git('rev-parse', 'HEAD').out;
  const there = git('rev-parse', `origin/${branch}`).out;
  if (here === there) {
    warned = '';
    return [];
  }
  if (git('status', '--porcelain', '--untracked-files=no').out) {
    warnOnce('dirty', `New commits on ${branch}, but this copy has uncommitted changes: not pulling. Commit or stash them and it carries on.`);
    return [];
  }
  if (!git('merge-base', '--is-ancestor', here, there).ok) {
    warnOnce('diverged', `This copy has commits ${branch} on GitHub doesn't: not pulling. Push them, or reset to origin/${branch}.`);
    return [];
  }
  if (!git('merge', '--ff-only', '--quiet', there).ok) {
    warnOnce('merge', `Couldn't fast-forward to origin/${branch}.`);
    return [];
  }
  warned = '';
  const files = git('diff', '--name-only', here, there).out.split('\n').filter(Boolean);
  const subject = git('log', '-1', '--format=%s', there).out;
  say(`Updated to ${there.slice(0, 7)} "${subject}" (${files.length} file${files.length === 1 ? '' : 's'}). The phone reloads by itself.`);
  return files;
}

// --- Expo ---------------------------------------------------------------------

/** Expo's tunnel needs @expo/ngrok installed globally; Expo would ask, but
 *  running unattended there's no one to answer. */
function ensureTunnelTool() {
  if (!TUNNEL) return;
  if (run('npm', ['ls', '-g', '--depth=0', '@expo/ngrok'], { quiet: true, timeout: 30000 }).ok) return;
  say('Installing @expo/ngrok globally, once, for the tunnel...');
  if (!run('npm', ['install', '-g', '@expo/ngrok@^4.1.0']).ok) {
    say('Could not install it. Run `npm install -g @expo/ngrok@^4.1.0` yourself (with sudo if your Node needs it), or use --lan.');
    process.exit(1);
  }
}

function printQr(url) {
  try {
    const require = createRequire(join(ROOT, 'node_modules', 'expo', 'package.json'));
    require('@expo/cli/build/src/utils/qr').printQRCode(url).print();
  } catch {
    // No QR code is fine: the address is printed and in Expo Go's list.
  }
}

const EXPO_CLI = join(ROOT, 'node_modules', 'expo', 'bin', 'cli');
let expo = null;
let shownUrl = '';
let stopping = false;
let restarts = 0;
let account = 'anonymous';
/** In a terminal, Expo's own screen comes through: its QR code, and keys
 *  like r to reload. Started at login, there's no one to read it, so its
 *  output goes to the log and this works out the address itself. */
const ATTENDED = Boolean(process.stdout.isTTY && process.stdin.isTTY);

/** The address Expo Go opens. A tunnel's is made of a random tag Expo keeps
 *  in .expo/settings.json, the Expo username and the port, so it stays the
 *  same from one start to the next; on Wi-Fi it's this computer's address. */
function expoGoUrl() {
  if (!TUNNEL) {
    const ip = Object.values(networkInterfaces())
      .flat()
      .find((a) => a && a.family === 'IPv4' && !a.internal)?.address;
    return ip ? `exp://${ip}:8081` : null;
  }
  try {
    const { urlRandomness } = JSON.parse(readFileSync(join(ROOT, '.expo', 'settings.json'), 'utf8'));
    if (!urlRandomness) return null;
    const user = account.replace(/\./g, '').replace(/\s+/g, '-');
    return `exp://${urlRandomness}-${user}-8081.exp.direct`;
  } catch {
    return null;
  }
}

function showUrl() {
  const url = expoGoUrl();
  if (!url || url === shownUrl) return Boolean(url);
  shownUrl = url;
  writeFileSync(URL_FILE, `${url}\n`);
  say(`Open in Expo Go: ${url}`);
  if (!ATTENDED) printQr(url);
  say(account === 'anonymous' ? 'Tip: `npx expo login` here and sign in to Expo Go with the same account, and this server is listed in Expo Go under "Development servers".' : 'It is also listed in Expo Go under "Development servers", signed in as the same account.');
  return true;
}

function startExpo() {
  const expoArgs = ['expo', 'start', TUNNEL ? '--tunnel' : '--lan'];
  say(`Starting Expo (${TUNNEL ? 'tunnel: the phone can be on any network' : 'LAN: the phone must be on this Wi-Fi'})...`);
  const env = { ...process.env, EXPO_NO_TELEMETRY: '1' };
  delete env.CI; // CI mode turns off reloading, which is the point of all this.
  const started = Date.now();
  // Expo's own CLI, run by this Node rather than through npx: one process,
  // so stopping it stops Metro too and frees its port for the next start.
  expo = spawn(process.execPath, [EXPO_CLI, ...expoArgs.slice(1)], { cwd: ROOT, env, stdio: ATTENDED ? 'inherit' : ['ignore', 'pipe', 'pipe'] });
  if (!ATTENDED) {
    const onOutput = (chunk) => {
      const text = chunk.toString();
      process.stdout.write(text);
      try {
        appendFileSync(LOG, text);
      } catch {
        // As above.
      }
      if (/Tunnel ready|Waiting on/.test(text)) {
        showUrl();
        restarts = 0;
      }
      if (/Tunnel connection has been closed/.test(text)) {
        say('The tunnel dropped: restarting Expo.');
        expo?.kill();
      }
    };
    expo.stdout.on('data', onOutput);
    expo.stderr.on('data', onOutput);
  } else {
    // Expo's screen shows the QR code; the address still goes in the file.
    const poll = setInterval(() => {
      if (showUrl() || Date.now() - started > 120000) clearInterval(poll);
    }, 3000);
  }
  expo.on('exit', (code) => {
    expo = null;
    if (stopping) return;
    restarts += 1;
    const wait = Math.min(60, 5 * restarts);
    say(`Expo stopped (code ${code}); starting it again in ${wait}s.`);
    setTimeout(() => {
      if (!stopping && !expo) startExpo();
    }, wait * 1000);
  });
}

function restartExpo() {
  if (!expo) return startExpo();
  const old = expo;
  old.removeAllListeners('exit');
  old.on('exit', () => {
    expo = null;
    if (!stopping) startExpo();
  });
  old.kill();
}

// --- Go -----------------------------------------------------------------------

process.on('SIGINT', () => {
  stopping = true;
  say('Stopping.');
  expo?.kill();
  setTimeout(() => process.exit(0), 1500);
});
process.on('SIGTERM', () => process.emit('SIGINT'));

say(`Phone server for ${branch}${FOLLOW ? `, following it on GitHub every ${EVERY_MS / 1000}s` : ''}.`);
if (FOLLOW) follow();
if (!run('npm', ['ls', '--depth=0'], { quiet: true }).ok) {
  say('Installing packages...');
  run('npm', ['install']);
}
ensureTunnelTool();
const who = run('npx', ['expo', 'whoami'], { quiet: true, timeout: 30000 });
if (who.ok && who.out) account = who.out.split('\n').pop().trim();
say(who.ok ? `Expo account: ${account}` : 'Not signed in to Expo: run `npx expo login` once to see this server in Expo Go\'s list from anywhere.');
startExpo();

if (FOLLOW) {
  setInterval(() => {
    const files = follow();
    if (!files.length) return;
    if (files.some((f) => NEEDS_INSTALL.some((re) => re.test(f)))) {
      say('Packages changed: installing.');
      run('npm', ['install']);
    }
    if (files.some((f) => NEEDS_RESTART.some((re) => re.test(f)))) {
      say('Config or packages changed: restarting Expo. Reopen the app on the phone if it doesn\'t reconnect.');
      restartExpo();
    }
  }, EVERY_MS);
}
