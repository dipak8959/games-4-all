# Testing Games 4 All on a real phone

## The phone server: always the latest code, from anywhere

Set up once on a computer that stays on, usually your desktop. After that:

- The phone opens the app in **Expo Go** whenever you like, on any network.
- A change pushed to GitHub from anywhere reaches the phone by itself within
  about 30 seconds. That includes a Claude session in the cloud, your laptop,
  or this desktop.

How it works: `npm run phone` keeps a copy of the branch on the desktop up to
date and runs Expo with a tunnel. It checks GitHub every 30 seconds. When
there are new commits, it moves the copy forward to them, and Metro sends the
change to the phone. When packages or the app's config change, it reinstalls
and restarts Expo. If Expo stops or its tunnel drops, it starts it again. It
never touches uncommitted work: with local changes it waits, and says so.

### One-time setup on the desktop

You need [Node 20 or newer](https://nodejs.org) and
[git](https://git-scm.com).

```bash
git clone https://github.com/dipak8959/games-4-all.git
cd games-4-all
git checkout claude/kids-game-superapp-g1l2w2
npm install
npx expo login           # a free Expo account; optional, see below
npm run phone            # starts it; the first run also installs @expo/ngrok
```

It prints a QR code and the address to open, such as
`exp://abc12-yourname-8081.exp.direct`.

On the phone:

1. Install **Expo Go** from the App Store or Google Play.
2. Sign in to Expo Go with the same Expo account.
3. Scan the QR code: with the Camera app on an iPhone, or with "Scan QR code"
   in Expo Go on Android.

The address doesn't change, so after the first time, open the app straight
from Expo Go. Signed in, the server is listed under **Development servers**
wherever the phone is. Not signed in, it's under **Recently opened**.

### Keep it running

So the phone server is there whenever the desktop is on:

```bash
npm run phone:always     # starts at every login, and now
npm run phone:status     # the address for Expo Go, and the latest log
npm run phone:never      # stop starting it at login
```

On macOS this is a LaunchAgent. On Windows it's a minimised window started
from the Startup folder. On Linux it's a systemd user service.

### Day to day

- **Make a change anywhere and push it.** The phone shows it in about 30
  seconds. If it doesn't reload by itself, shake the phone and tap Reload.
- **To follow a different branch:** `npm run phone -- --branch <name>`. With
  autostart, check that branch out in the desktop copy first.
- **Phone and desktop on the same Wi-Fi?** `npm run phone -- --lan` skips the
  tunnel and is a little faster.
- **The desktop copy has uncommitted work?** The server stops following
  until you commit or stash it, and the log says so.
- **The GitHub repository is private?** The desktop copy needs to fetch
  without asking for a password. Sign in once with
  [GitHub CLI](https://cli.github.com) (`gh auth login`) or Git Credential
  Manager.

Expo Go is for trying the app, not for judging it as finished. It runs a
development build, which is slower than the real thing in a few of the
arcade games, and it shows Expo Go's own loading screen.

## An installable build: the real app

EAS, Expo's build service, builds the app in the cloud and gives you a link
to install it. It needs a free Expo account.

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

The first build asks two things:

- whether to create the project on your Expo account: say yes;
- whether to make an Android signing key: let EAS make one.

After about 15 minutes it prints a link and a QR code. Open it on an Android
phone to install the APK. Android asks once to allow installs from the
browser.

**iPhone builds** that install on a device need an Apple Developer account
($99 a year), and each test iPhone registered first:

```bash
eas device:create                        # register each test iPhone
eas build --platform ios --profile preview
```

Without an Apple account, `--profile preview-simulator` builds for the iOS
Simulator on a Mac.

**Store builds**, later: `eas build --profile production`, then
`eas submit`. See "Building for the stores" in the README for the store
declarations.

## What to look at

The web preview can't show these. A phone is the only place to judge them:

- Haptics: a light tap on presses, a pulse on a right answer.
- How quickly the arcade games (Puddle Hop, Lane Dash, Space Rocks, Soft
  Landing, Orbit Hop) answer a finger, and whether they stay smooth.
- Android's back button and back gesture: one step back, never out of the
  app mid-game.
- The notch, rounded corners and home indicator: nothing tappable under
  them.
- A grown-up's limits with the app really put away and reopened. A break
  now needs ten minutes away.
