# Testing Games 4 All on a real phone

Two ways, from quickest to most real. Neither needs anything from an app
store except Expo Go itself.

## 1. Expo Go: today, in ten minutes

The app runs inside Expo Go, Expo's free test app, served from your
computer. Every library the app uses is built into Expo Go (SDK 57), so
nothing else needs installing on the phone.

**On the phone:** install **Expo Go** from the App Store or Google Play.

**On your computer** (Node 20 or newer):

```bash
git clone https://github.com/dipak8959/games-4-all.git
cd games-4-all
git checkout claude/kids-game-superapp-g1l2w2
npm install
npx expo start
```

A QR code appears in the terminal.

- **iPhone:** point the Camera app at it and tap the banner.
- **Android:** open Expo Go and tap **Scan QR code**.

The phone and computer must be on the same Wi-Fi. If they can't be, or the
phone can't connect, use `npx expo start --tunnel` instead.

While the computer runs `npx expo start`, a code change reloads on the phone
by itself. Shake the phone for the developer menu.

Expo Go is for trying the app, not for judging it as finished: it runs a
development build, which is slower than the real thing in a few of the
arcade games, and it shows Expo Go's own loading screen.

## 2. An installable build: the real app

EAS (Expo's build service) builds the app in the cloud and gives you a link
to install it. It needs a free Expo account.

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

The first build asks to create the project on your Expo account (say yes)
and to make an Android signing key (let EAS make one). After about 15
minutes it prints a link and a QR code. Open it on an Android phone to
install the APK. Android asks once to allow installs from the browser.

**iPhone** builds that install on a device need an Apple Developer account
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
- A grown-up's limits with the app really put away and reopened (a break
  now needs ten minutes away).
