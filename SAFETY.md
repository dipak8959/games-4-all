# Child safety model

This app is built for children roughly aged 3-7, who cannot read terms, cannot
recognise an advert, and cannot consent to anything. The design principle is
therefore not "handle children's data carefully" but **collect nothing and
connect nowhere**, so that there is no data to mishandle and no channel to
misuse.

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

Four keys in the device's own sandboxed storage, listed in `src/storage.ts`:

- `g4a:settings` — parent-chosen limits and toggles
- `g4a:progress` — rounds played, stars earned, and the current adaptive
  level per game
- `g4a:usage` — today's play time
- `g4a:freshness` — which pictures, numerals, or sorting rule each game most
  recently showed, so the next round avoids repeating it (see "Staying fresh
  round to round" in `README.md`)

No identifiers, no timestamps beyond the current day, no free text, nothing
about the child — `g4a:freshness` in particular holds nothing but content
already visible on screen a moment earlier. Parent Zone offers **Delete all
data**, which removes all four. Because the key list is closed and
enumerated, that deletion is complete by construction.

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

Settings, limits, and deletion sit behind a gate (`src/safety/parentGate.ts`)
that asks a two-digit multiplication question, well beyond the target age band.
A wrong answer re-rolls the question rather than allowing repeated guesses at
the same one, so trial-and-error is impractical.

This is a **speed bump, not authentication.** It stops a child wandering into
settings. It is not a secret and deliberately guards nothing whose disclosure
would matter — worst case, a determined older child changes their own screen
time limit.

## Design rules for the games themselves

Safety for this age group is as much about tone as about data:

- **No losing.** No timers, no lives, no game-over. A round ends when it is
  finished; a wrong answer produces a soft nudge and the child tries again.
- **No zero score.** Completing a round always earns at least one star
  (`starsForMistakes`). Stars reward effort, not perfection.
- **No engagement mechanics.** No streaks, no daily-login rewards, no
  notifications, no "come back tomorrow" pressure. Nothing here is designed to
  maximise time-in-app — the screen-time limits point the other way.
- **No reading required.** Games are navigated by icon, colour, and shape.
- **Colour is never the only signal.** The palette is Okabe-Ito derived, and
  anything identified by colour also differs in shape, so the games work for
  colour-blind players.
- **Big targets.** Nothing tappable is under 72dp, above both platform minimums.
- **Always escapable.** Every game has a large back control that exits
  immediately, with no confirmation dialog to read.
- **Motion is optional.** The OS "reduce motion" setting is honoured
  automatically, and can also be set in Parent Zone.

## Reviewing a change

`npm run verify` runs the safety gate, the type checker, and the unit tests. CI
runs the same command. If you add a dependency, the lockfile check will catch a
banned package pulled in transitively — do not silence it without understanding
what it does on a child's device.
