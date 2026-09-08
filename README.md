# Games 4 All

A kids' game superapp for iOS and Android — offline by design, with no ads, no
tracking, and no accounts.

Built with Expo and React Native from a single TypeScript codebase. The safety
model is not a policy document; it is a build gate (see
**[SAFETY.md](SAFETY.md)**).

## What's in it

Seven games spanning early childhood through adulthood — this is a "whole
family shares one device" app, not just a kids' app, so the oldest content
here is built to actually hold up for a grown-up, not just tolerate one:

| Game | Practises | Ages |
| --- | --- | --- |
| 🧠 **Find the Pairs** | Visual memory and concentration | 3-6 |
| 🔢 **How Many?** | Counting and recognising numerals 1-12 | 3-6 |
| 🔺 **Sort It Out** | Sorting by shape, colour, and size | 3-6 |
| 🔤 **Spell It!** | Reading and spelling simple words | 6-10 |
| 🧩 **Sudoku** | Logical reasoning and number placement | 7+ |
| ✨ **Pattern Play** | Sequence memory and concentration | 4+ |
| ➕ **Number Crunch** | Mental arithmetic: +, −, ×, ÷ | 6+ |

Each also carries a category (Memory, Numbers, Words, Logic, Sorting) shown
as filter chips on Home, alongside a search box — with seven games and
growing, finding the right one shouldn't require scrolling past all the
others.

Every game card also carries a ⭐ pin toggle — no parent gate needed, since
it changes nothing about what's available, only how quickly a profile
reaches what they already chose. Pinned games surface in a **Favourites**
row at the top of Home (`settings.pinnedGameIds`, per profile), so a
catalogue that grows toward dozens of games never forces a search just to
reach the handful someone actually plays. The row only shows while browsing
unfiltered — an active search or category already narrowed things down, so
there's nothing left for a shortcut to shortcut.

Plus **Profiles**, so a parent and each child sharing this device get their
own separate stars, adaptive levels, favourites, and settings, and **Parent
Zone** behind a parent gate, holding screen-time limits, sound and motion
toggles, profile management, a plain-language privacy statement, and a
delete-all-data control.

### Profiles: sharing one device honestly

A one-time, first-launch setup step (`OnboardingScreen`, gated behind the
parent gate — a child shouldn't be the one setting this) asks a grown-up to
create the first profile: a name, an avatar, and a real age
(`src/state/profiles.ts`). "Skip for now" is available without the gate and
creates a sensible default profile, so setup never blocks play. The current
profile's avatar is always visible on Home, next to Parent Zone's gear icon —
tapping it opens **Profiles** (behind the parent gate again, every time) to
switch to someone else, add a new profile, edit one, or remove one.

This is deliberate, not incidental: **switching who's playing always requires
a grown-up**, the same way opening Parent Zone does. A child should never be
able to hand themselves an adult's profile, an older sibling's, or spin up a
new one, without a grown-up saying so.

Everything that varies per-person is kept fully separate — stars, each
game's adaptive level, sound/haptics/reduce-motion preferences, and even
screen-time usage — so a parent playing Sudoku on their own profile never
inflates a child's star count, and vice versa (`AppProvider`, which keys all
of this by profile id under the same four storage keys `SAFETY.md` lists —
adding profiles never grows what's stored, only reshapes it).

### Age: a real number, not a named group

There is no "3-4 / 5-6 / 7+" bucket any more. Every profile has a real age in
years, and every game declares a real `minAge`/`maxAge` range
(`src/games/catalog.ts`) — Home just checks whether the profile's age falls
inside it (`gamesForAge`). A simple picture-matching game caps out in the
single digits, honestly, rather than defaulting to "all ages" and quietly
boring anyone older; a game built to keep scaling (Sudoku's grid size,
Pattern Play's sequence length, Number Crunch's arithmetic) carries no upper
cap at all, because it doesn't need one.

Age still does the same two things it always did, just without the group
label in between:

1. **Filters the catalogue.** A profile only sees games whose range includes
   their age. Parent Zone's game list is intentionally unfiltered, so a
   parent can always see the full catalogue and why something isn't showing
   on Home for a given profile.
2. **Seeds where a shown game's difficulty starts.** Every profile starts a
   new game at the same middling level (`DEFAULT_LEVEL` in
   `src/games/types.ts`), then that level drifts up or down round by round
   based on how the last round went (`nextLevel`) — a perfect round nudges it
   up one step, a rough one nudges it down one step, never more than one step
   at a time. Parent Zone shows the level each game is currently sitting at
   for the active profile.

Adding a game to the catalogue means picking its age range deliberately
(what age is this actually appropriate or interesting for, and where does it
stop being one?), not defaulting to "all ages" — that default is exactly
what made an 18-year-old's game list identical to a 4-year-old's before this
model existed.

### Staying fresh round to round

Every game actively avoids repeating what the previous round just used —
not just "the pool is big enough that it probably won't repeat," but an
explicit exclusion each time a new round is built (`sampleFresh`/`pickFresh`
in `src/util/random.ts`):

- **Find the Pairs** never deals the same set of pictures two rounds running.
- **How Many?** never shows the same picture on two consecutive questions,
  including the seam between one round and the next.
- **Sort It Out** never repeats the same sorting rule (shape/colour/size) two
  rounds running, and a shape- or colour-sort round avoids the previous
  round's basket shapes or colours too.

This only ever *excludes* recent content, never fails a round: if avoiding
would leave too few items to fill it (an exhausted pool at a high basket
count, say), it tops back up from the avoided set rather than breaking. It's
bounded variety within a fixed, kid-safe content pool, not literally
unlimited content.

**Sudoku** and **Pattern Play** are the exceptions, deliberately: every
puzzle and every sequence is procedurally generated (a full-grid solve plus
hole-digging for Sudoku; a randomised tile sequence for Pattern Play), so
there's no fixed pool to exhaust and nothing to avoid repeating — both
already give effectively unlimited variety on their own.

What each game last showed is persisted (`g4a:freshness`, via
`getFreshness`/`setFreshness` on `AppProvider`), so the "just used" memory
survives backing out to Home and reopening the game, and survives the app
being closed and reopened entirely — not just "Play again" within one
sitting. A game's very first-ever round, before anything has been persisted
for it, is unaffected.

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
    AppProvider.tsx         Profiles, per-profile settings/progress/usage accounting
    profiles.ts             Profile list operations (add/update/remove/switch)
    settings.ts, progress.ts, freshness.ts
  games/
    catalog.ts              Pure game metadata + age/category/search filtering (no React)
    registry.ts             Attaches each game's Screen component to the catalogue
    memory/ counting/ shapes/ wordbuilder/ sudoku/ patternplay/ numbercrunch/
      logic.ts              Pure, seeded, unit-tested game rules
      *Screen.tsx           Presentation only
  screens/                  Home, Parent Zone, Profiles, time's-up
  components/               Shared UI (all targets >= 72dp), incl. ProfileEditor
  theme/tokens.ts           Colour-blind-safe palette, spacing, type scale
scripts/check-safety.mjs    The build gate
tests/                      Unit tests for all pure logic
```

Game rules are kept in `logic.ts` files with no React and no I/O — every rule
takes a seeded RNG, so round generation can be asserted exhaustively (every
memory deal contains exactly two of each symbol; every sortable item matches
exactly one basket; every round is completable).

## Adding a game

0. Pick something **original or genuinely public-domain** — never a clone of
   a specific commercial game's mechanics-plus-presentation, and never a
   borrowed name, character, or asset. See "Original content, always" in
   **[SAFETY.md](SAFETY.md)** before settling on a concept.
1. Create `src/games/<id>/logic.ts` — pure rules, taking an `Rng` and a `level`.
2. Add `tests/` coverage asserting the round is always completable and fair.
3. Create `<id>Screen.tsx` implementing `GameScreenProps`. Seed local level
   state from the `level` prop, then advance it with `nextLevel` (from
   `src/games/types.ts`) on "Play again" — see any existing game screen for
   the pattern. This is what makes the game's difficulty adaptive rather than
   fixed at whatever the parent chose as a starting point.
4. Add an entry to `GAMES_META` in `src/games/catalog.ts`, including a
   deliberate `minAge`/`maxAge` and a `category` — don't default to "all
   ages" without thinking about it; that's what made an adult's game list
   identical to a young child's before this field existed. Register the
   screen component in `src/games/registry.ts`'s `SCREEN_BY_ID`.

Home, progress tracking, and the parent-facing skills list all read from the
catalogue, so a game cannot ship half-wired.

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
