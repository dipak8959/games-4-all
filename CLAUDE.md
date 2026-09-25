# Games 4 All — standing rules

The owner has stated these once. Apply them without being asked again.

The full list lives in code, in `src/games/charter.ts` (the eleven
principles), and is explained in `SAFETY.md`. This file is the short version,
plus how work is expected to be done here.

## Non-negotiable

- **Copyright-safe, always.** Every game is invented here or is a format old
  enough to belong to everyone. Never a commercial game's name, characters,
  art, or rules-plus-presentation. (Charter: `ORIGINAL`.)
- **Nothing addictive below 18.** No endless modes, scores, bests, streaks,
  leaderboards, daily rewards or self-starting rounds. Every round ends no
  later than a point fixed before it started. "No nonsense games" either:
  each game practises something nameable. (`IT_ENDS`, `NOTHING_TO_CHASE`,
  `WORTH_THE_TIME`.)
- **Every game grows with the player.** Finishing cleanly makes the next
  round harder; a rough round steps down; one level at a time on the shared
  1-6 scale. Every level is genuinely harder than the one below — no flat
  steps. (`IT_GROWS`, enforced dial by dial in `tests/difficulty.test.ts`.)
- **Offline, nothing to sell.** No network code, ads, purchases, accounts,
  analytics, third-party SDKs or permissions. `scripts/check-safety.mjs`
  enforces it.
- **Reachable by a child.** Nothing tappable under 72dp (Sudoku's grid is the
  one documented exception), always escapable in one tap, colour never the
  only signal, playable without reading unless reading is the skill.
- **On design:** follow the Modernist Games Hub handoff as encoded in
  `src/theme/` and held by `tests/theme.test.ts` — Archivo 400/800 only, no
  `fontWeight`, no rounded corners, no shadows or gradients, accent used
  sparingly, games built from `components/GameStage`.

A game-over (a miss ending the round early) is allowed only where the owner
has decided it — today, Puddle Hop — and only with a fixed finish, no score
or best, and a fresh round next time (`endsOnAMiss`, see `SAFETY.md`).

The target is **10+ games per age band** (3-5, 6-9, 10-12, 13-15, 16-17,
adult). Age bands follow the ICO Children's Code.

## Adding a game

1. Write it as a proposal in `proposals/` and run `npm run propose`. A
   blocked idea is not built. Anything the gate asks about goes to the owner.
2. Build pure logic in `src/games/<id>/logic.ts` with tests, and the screen
   in `<Name>Screen.tsx`. Register it in `catalog.ts` and `registry.ts`.
3. Add its difficulty dials to `DIALS` in `tests/difficulty.test.ts`.
4. Add a player to `scripts/playtest/players.mjs` and play it in a browser.

## Before calling anything done

- `npm run verify` (safety gate, typecheck, tests) passes.
- `npx expo export` succeeds for web, iOS and Android.
- The playtest passes in `scripts/playtest/` run clean against the web
  build (see its README).
- The phone-testable build is repacked (`node scripts/pack-artifact.mjs`)
  and republished to the same artifact.
