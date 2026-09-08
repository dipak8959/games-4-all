# Child safety model

This is a whole-family device app: a young child, an older sibling, and a
parent can each have their own profile and share it. The child-safety model
below is not one mode among several — it is the only mode, applied to the
whole app regardless of which profile is active. There is no "grown-up mode"
that relaxes any of it, because a device left open on a parent's profile is
still a device a child can pick up. The design principle is therefore not
"handle children's data carefully" but **collect nothing and connect
nowhere**, so that there is no data to mishandle and no channel to misuse —
for a 4-year-old's profile or a 40-year-old's.

Every claim below is enforced by `npm run safety`, which fails the build on
violation. The rules live in `scripts/check-safety.mjs`.

## What the app does not do

| Guarantee | How it is enforced |
| --- | --- |
| No network requests of any kind | `fetch`, `XMLHttpRequest`, `WebSocket`, and `sendBeacon` are rejected in source by the safety check. Release Android builds additionally have `INTERNET` stripped from the manifest (`app.config.ts`). |
| No adverts | Every known mobile ad SDK is on the banned-dependency list, checked against both `package.json` and the full resolved lockfile. |
| No analytics, telemetry, or crash reporting | Same banned-dependency list (Segment, Amplitude, Mixpanel, PostHog, Sentry, Firebase, AppsFlyer, …). |
| No in-app purchases | Purchase and subscription SDKs are banned. There is no store, no currency, and no paid content. |
| No accounts or sign-in | There is no auth code and no social-login SDK. Nothing identifies a child. |
| No third-party trackers or ad identifiers | `AD_ID` is blocked in the manifest; IDFA/device-info packages are banned. |
| No device permissions | `app.json` must declare an empty `android.permissions` array, and must explicitly block location, camera, microphone, contacts, and advertising ID. |
| No links out of the app | `Linking.openURL` and `WebView` are rejected in source, so a child cannot be sent to a browser, a store page, or any external content. |
| No user-generated or remote content | All game content ships in the bundle. There is nothing to moderate because nothing arrives from outside. |

## What the app does store

Five keys in the device's own sandboxed storage, listed in `src/storage.ts`:

- `g4a:profiles` — each profile's name, avatar, and age
- `g4a:settings` — each profile's chosen limits and toggles
- `g4a:progress` — each profile's rounds played, stars earned, and current
  adaptive level per game
- `g4a:usage` — each profile's play time today
- `g4a:freshness` — which pictures, numerals, or sorting rule each game most
  recently showed to each profile, so the next round avoids repeating it
  (see "Staying fresh round to round" in `README.md`)

Adding a profile never adds a storage key: `settings`/`progress`/`usage`/
`freshness` each hold one record keyed by profile id, so the enumerated key
list stays exactly five no matter how many people share the device
(`AppProvider`).

No identifiers, no timestamps beyond the current day, nothing about the
child beyond what a grown-up chose to enter for them — and even that is
never free text. A profile's name is picked from a fixed list of ten (see
`NAME_CHOICES` in `src/state/profiles.ts`), not typed, so there is no
keyboard anywhere in profile creation and nothing arbitrary to ever store.
`g4a:freshness` in particular holds nothing but content already visible on
screen a moment earlier. Parent Zone offers **Delete all data**, which
removes all five keys entirely — every profile, not just the active one.
Because the key list is closed and enumerated, that deletion is complete by
construction.

## Screen time

Two independent limits, both off by default and both parent-set:

- **Per sitting** — how long one continuous session may run
- **Per day** — total play across the calendar day, reset at local midnight

Time accrues only while a game is actually on screen and the app is
foregrounded; menus and Parent Zone are free. Logic lives in
`src/safety/screenTime.ts` and is unit-tested for the cases that matter:
midnight rollover, backgrounding, and device clock changes (a clock jump
backwards or forwards cannot silently consume or refund the day's allowance).

When a limit is reached the child sees a friendly stop screen. There is no way
to dismiss it and no "watch an advert for more time" — only a grown-up can
change the limit.

## Parent gate

Settings, limits, deletion, and **switching or managing profiles** all sit
behind a gate (`src/safety/parentGate.ts`) that asks a two-digit
multiplication question, well beyond the target age band. A wrong answer
re-rolls the question rather than allowing repeated guesses at the same one,
so trial-and-error is impractical.

Profiles are gated on the same terms as everything else in Parent Zone: a
child should never be able to hand themselves an adult's profile, an older
sibling's, or create a new one, without a grown-up passing this gate first —
see "Switching who's playing" below.

This is a **speed bump, not authentication.** It stops a child wandering into
settings. It is not a secret and deliberately guards nothing whose disclosure
would matter — worst case, a determined older child changes their own screen
time limit.

## Design rules for the games themselves

Safety for this age range is as much about tone as about data. Every rule
below holds for every game in the catalogue, including "Spell It!" — the one
game where reading is the point rather than something to avoid:

- **No losing.** No timers, no lives, no game-over. A round ends when it is
  finished; a wrong answer produces a soft nudge and the child tries again.
- **No zero score.** Completing a round always earns at least one star
  (`starsForMistakes`). Stars reward effort, not perfection.
- **No engagement mechanics.** No streaks, no daily-login rewards, no
  notifications, no "come back tomorrow" pressure. Nothing here is designed to
  maximise time-in-app — the screen-time limits point the other way.
- **Reading is never required to navigate or play, except where it's the
  explicit skill.** Home, Parent Zone, and six of the seven games are
  navigated entirely by icon, colour, shape, and number — no child needs to
  read anything to use this app. "Spell It!" is the deliberate exception: it
  teaches reading and spelling, so reading its own picture clue is the task,
  not a barrier to it — see its `minAge`/`maxAge` in `src/games/catalog.ts`.
  "Sudoku" needs no reading either, just numbers a young child already
  knows — what it needs is holding a row/column/box rule in mind at once, a
  later-developing reasoning skill rather than a literacy one, which is why
  it's capped at the young end but not the old one.
- **Colour is never the only signal.** The palette is Okabe-Ito derived, and
  anything identified by colour also differs in shape, so the games work for
  colour-blind players. Pattern Play in particular pairs every tile with a
  distinct glyph rather than relying on colour to distinguish a sequence.
- **Big targets.** Nothing tappable is under 72dp, above both platform
  minimums — Sudoku's grid cells are the one deliberate exception (a 9x9
  board cannot fit 72dp cells on a phone screen), and only after selecting a
  cell does the actual answer get entered on full-sized number buttons.
- **Always escapable.** Every game has a large back control that exits
  immediately, with no confirmation dialog to read.
- **Motion is optional.** The OS "reduce motion" setting is honoured
  automatically, and can also be set per-profile in Parent Zone.

## Switching who's playing

A parent and each child sharing this device get their own profile
(`src/state/profiles.ts`), and switching between them — or creating, editing,
or removing one — always requires the parent gate, every time, with no
"remember this device" bypass. This holds regardless of which profile is
currently active: a child's own profile being open does not relax the gate
for switching to someone else's.

Profile identification never involves typed text: a name is chosen from a
fixed list, an avatar from a fixed set of emoji, and age from a stepper —
see "What the app does store" above for why. Removing a profile deletes that
profile's stars, levels, and settings immediately; it does not touch anyone
else's.

## Reviewing a change

`npm run verify` runs the safety gate, the type checker, and the unit tests. CI
runs the same command. If you add a dependency, the lockfile check will catch a
banned package pulled in transitively — do not silence it without understanding
what it does on a child's device.
