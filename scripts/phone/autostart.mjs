#!/usr/bin/env node
/**
 * Starts the phone server (serve.mjs) by itself whenever you log in to this
 * computer, so the phone can always load the latest code.
 *
 *   npm run phone:always     start it at every login, and now
 *   npm run phone:never      stop doing that
 *   npm run phone:status     the address for Expo Go, and the latest log
 *
 * macOS: a LaunchAgent. Windows: a minimised window from the Startup folder.
 * Linux: a systemd user service. `--dry-run` shows what would be written.
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SERVE = join(ROOT, 'scripts', 'phone', 'serve.mjs');
const NODE = process.execPath;
const NAME = 'games-4-all-phone';
const [command = 'status', ...rest] = process.argv.slice(2);
const DRY = rest.includes('--dry-run');
const PATH = [dirname(NODE), '/usr/local/bin', '/opt/homebrew/bin', '/usr/bin', '/bin', '/usr/sbin', '/sbin'].join(':');

function write(file, text) {
  if (DRY) {
    console.log(`--- would write ${file}\n${text}`);
    return;
  }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
}

function sh(cmd, args, { ignoreFailure = false } = {}) {
  if (DRY) return console.log(`--- would run ${cmd} ${args.join(' ')}`);
  try {
    execFileSync(cmd, args, { stdio: 'inherit' });
  } catch (e) {
    if (!ignoreFailure) throw e;
  }
}

const xml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const platforms = {
  darwin: {
    file: join(homedir(), 'Library', 'LaunchAgents', `com.${NAME.replace(/-/g, '')}.plist`),
    install() {
      const label = `com.${NAME.replace(/-/g, '')}`;
      write(
        this.file,
        `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${label}</string>
  <key>ProgramArguments</key>
  <array><string>${xml(NODE)}</string><string>${xml(SERVE)}</string></array>
  <key>WorkingDirectory</key><string>${xml(ROOT)}</string>
  <key>EnvironmentVariables</key><dict><key>PATH</key><string>${xml(PATH)}</string></dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>${xml(join(ROOT, '.expo', 'phone-service.log'))}</string>
  <key>StandardErrorPath</key><string>${xml(join(ROOT, '.expo', 'phone-service.log'))}</string>
</dict>
</plist>
`,
      );
      const uid = process.getuid();
      sh('launchctl', ['bootout', `gui/${uid}`, this.file], { ignoreFailure: true });
      sh('launchctl', ['bootstrap', `gui/${uid}`, this.file]);
    },
    uninstall() {
      sh('launchctl', ['bootout', `gui/${process.getuid()}`, this.file], { ignoreFailure: true });
      if (!DRY) rmSync(this.file, { force: true });
    },
  },
  win32: {
    file: join(process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', `${NAME}.cmd`),
    install() {
      write(
        this.file,
        `@echo off\r\nrem Starts the Games 4 All phone server at login. Remove with: npm run phone:never\r\ncd /d "${ROOT}"\r\nstart "Games 4 All phone server" /min "${NODE}" "${SERVE}"\r\n`,
      );
      if (!DRY) spawn('cmd.exe', ['/c', this.file], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    },
    uninstall() {
      if (!DRY) rmSync(this.file, { force: true });
      console.log('Close the "Games 4 All phone server" window to stop the one running now.');
    },
  },
  linux: {
    file: join(homedir(), '.config', 'systemd', 'user', `${NAME}.service`),
    install() {
      write(
        this.file,
        `[Unit]
Description=Games 4 All phone server
After=network-online.target

[Service]
WorkingDirectory=${ROOT}
ExecStart=${NODE} ${SERVE}
Environment=PATH=${PATH}
Restart=always
RestartSec=10

[Install]
WantedBy=default.target
`,
      );
      sh('systemctl', ['--user', 'daemon-reload']);
      sh('systemctl', ['--user', 'enable', '--now', `${NAME}.service`]);
      console.log(`To keep it running when you're logged out too: loginctl enable-linger ${process.env.USER ?? '$USER'}`);
    },
    uninstall() {
      sh('systemctl', ['--user', 'disable', '--now', `${NAME}.service`], { ignoreFailure: true });
      if (!DRY) rmSync(this.file, { force: true });
      sh('systemctl', ['--user', 'daemon-reload'], { ignoreFailure: true });
    },
  },
};

const here = platforms[process.platform];

if (command === 'install') {
  if (!here) throw new Error(`No autostart for ${process.platform}: run \`npm run phone\` in a terminal instead.`);
  here.install();
  console.log(`The phone server starts at every login now (${here.file}).`);
  console.log('In a minute, `npm run phone:status` shows the address for Expo Go.');
} else if (command === 'uninstall') {
  if (here) here.uninstall();
  console.log('The phone server no longer starts at login.');
} else if (command === 'status') {
  const urlFile = join(ROOT, '.expo', 'phone-url.txt');
  console.log(here && existsSync(here.file) ? `Starts at login: yes (${here.file})` : 'Starts at login: no (npm run phone:always)');
  console.log(existsSync(urlFile) ? `Open in Expo Go: ${readFileSync(urlFile, 'utf8').trim()}` : 'No address yet: the server has not started, or is still starting.');
  const log = join(ROOT, '.expo', 'phone.log');
  if (existsSync(log)) {
    console.log('\nLatest from the log:');
    console.log(readFileSync(log, 'utf8').trimEnd().split('\n').slice(-12).join('\n'));
  }
} else {
  console.log('Usage: node scripts/phone/autostart.mjs install | uninstall | status [--dry-run]');
  process.exit(2);
}
