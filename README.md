# Games 4 All

A kids' game superapp for iOS and Android — offline by design, with no ads, no
tracking, and no accounts.

Built with Expo and React Native from a single TypeScript codebase. The safety
model is not a policy document; it is a build gate (see
**[SAFETY.md](SAFETY.md)**).

## What's in it

Three learning-basics games for roughly ages 3-7, none of which require reading:

| Game | Practises |
| --- | --- |
| 🧠 **Find the Pairs** | Visual memory and concentration |
| 🔢 **How Many?** | Counting and recognising numerals 1-12 |
| 🔺 **Sort It Out** | Sorting by shape and colour |

Plus a **Parent Zone** behind a parent gate, holding screen-time limits, sound
and motion toggles, starting difficulty, a plain-language privacy statement, and
a delete-all-data control.

## Getting started

```bash
npm install
npm start          # Expo dev server — scan the QR code with Expo Go
```

Platform targets:

```bash
npm run ios        # iOS simulator (macOS) or Expo Go on device
npm run android    # Android emulator or device
npm run web        # browser preview, handy for quick UI checks
```

## Verifying a change

```bash
npm run verify     # safety gate + typecheck + unit tests
```

Individually:

```bash
npm run safety     # child-safety rules (see SAFETY.md)
npm run typecheck  # tsc --noEmit
npm test           # pure-logic unit tests
```

Tests run on Node's built-in test runner with native TypeScript support, so
there is no test framework, no transpiler, and no extra dependency to audit.

## Layout

```
App.tsx                     Root: navigation and screen-time enforcement
src/
  safety/
    parentGate.ts           Gate challenge generation and verification
    screenTime.ts           Session and daily limit rules
    ParentGateModal.tsx     The gate a grown-up passes
  state/
    AppProvider.tsx         Settings, progress, and usage accounting
    settings.ts, progress.ts
  games/
    registry.ts             The catalogue every other screen reads from
    memory/ counting/ shapes/
      logic.ts              Pure, seeded, unit-tested game rules
      *Screen.tsx           Presentation only
  screens/                  Home, Parent Zone, time's-up
  components/               Shared UI (all targets >= 72dp)
  theme/tokens.ts           Colour-blind-safe palette, spacing, type scale
scripts/check-safety.mjs    The build gate
tests/                      Unit tests for all pure logic
```

Game rules are kept in `logic.ts` files with no React and no I/O — every rule
takes a seeded RNG, so round generation can be asserted exhaustively (every
memory deal contains exactly two of each symbol; every sortable item matches
exactly one basket; every round is completable).

## Adding a game

1. Create `src/games/<id>/logic.ts` — pure rules, taking an `Rng`.
2. Add `tests/` coverage asserting the round is always completable and fair.
3. Create `<id>Screen.tsx` implementing `GameScreenProps`.
4. Register it in `src/games/registry.ts`.

The home screen, progress tracking, and the parent-facing skills list all read
from the registry, so a game cannot ship half-wired.

Then run `npm run verify`.

## Building for the stores

```bash
npx eas build --platform ios
npx eas build --platform android
```

Release Android builds drop the `INTERNET` permission entirely
(`app.config.ts`); it is retained in development builds only so Metro can
attach.

Both stores require a children's-category declaration. The honest answers here
are: no data collected, no third-party SDKs, no ads, no purchases, no accounts.
