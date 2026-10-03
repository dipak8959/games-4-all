# Submitting Games 4 All to the App Store and Google Play

Everything the stores check that lives in the code is done and held by
tests: `tests/store.test.ts`, `tests/adminLock.test.ts` and
`scripts/check-safety.mjs`, all run by `npm run verify`. This file covers
the rest. Each **Owner** step needs your accounts and can only be done by
you.

## What's ready

| Area | State |
| --- | --- |
| **App icon** | Real artwork in the app's colours, replacing Expo's placeholder. The App Store icon has no alpha channel. Android gets adaptive and themed icons. Regenerate with `node scripts/store/render-icons.mjs`. |
| **Launch screen** | The app's mark on its own background colour, on both platforms. |
| **Version** | 1.0.0. Build numbers go up by themselves on each EAS production build. |
| **Privacy manifest (iOS)** | No tracking and no collected data. It declares the reasons for the system APIs React Native uses (UserDefaults, file timestamps, boot time, disk space). |
| **Export compliance** | `usesNonExemptEncryption: false`, so App Store Connect won't ask on each upload. |
| **iPad** | Supported, portrait and full screen. Expo would otherwise have let it rotate to landscape, which the games aren't laid out for. |
| **Android permissions** | Only `VIBRATE` (no prompt). Internet, network state, draw-over-apps, location, camera, microphone, contacts, storage and the advertising ID are all blocked. |
| **Hidden features** | None. Admin mode is left out of store builds (`EXPO_PUBLIC_STORE_BUILD` in eas.json's production profile). |
| **Parental gate** | A typed answer to a multiplication such as 7 × 93, so a guess works one time in 900. It guards every grown-up setting. |
| **Privacy policy** | In the app (Parent Zone → Read the privacy policy) and as a web page, generated from the same text (`npm run store:pages`). |
| **Support page** | `docs/support.html`, with common questions and a way to get in touch. |
| **Listing text** | `store/listing.json`, within every store limit (held by a test). |
| **Screenshots** | `store/screenshots/` at the sizes required for iPhone 6.9", iPad 13" and Android phones. Play also needs `store/play-feature-graphic.png` and `store/play-icon-512.png`. Regenerate with `node scripts/store/screenshots.mjs`. |
| **Review notes** | `store/review-notes.txt`, ready to paste into App Store Connect's "Notes". |

## Owner steps, in order

### 1. Accounts

- Apple Developer Program: $99 a year.
- Google Play Console: $25 once.

**A new personal Play account can't publish straight to production.**
Google requires a closed test with at least 12 testers for 14 days first.
Start it as soon as the first Android build is up.

### 2. The app's ID

Both stores identify the app as `com.games4all.kids` (`app.json`:
`ios.bundleIdentifier` and `android.package`).

- If that ID is taken, or you'd rather use your own (for example
  `com.yourname.games4all`), change both values before the first upload.
- Google Play never lets an app's package name change afterwards.

### 3. Put the web pages online

The listings need a privacy policy URL and a support URL. Both pages are in
`docs/`. In GitHub, go to the repository's **Settings → Pages**, then:

- Source: **Deploy from a branch**.
- Branch: `main`, folder `/docs`. This works once this PR is merged. To go
  live sooner, choose the branch `claude/kids-game-superapp-g1l2w2` instead.

The pages then live at:

- https://dipak8959.github.io/games-4-all/privacy.html
- https://dipak8959.github.io/games-4-all/support.html

These are the addresses already in `store/listing.json`.

The support page sends questions to the repository's GitHub issues. To
offer an email address instead, add it to
`src/safety/privacyPolicy.ts` (`SUPPORT_URL`) and run `npm run store:pages`.

### 4. Try a store-like build on real devices first

```bash
eas build --platform android --profile preview   # an APK to install
eas build --platform ios --profile preview       # registered iPhones and iPads
```

Go through it the way a reviewer will:

- First launch, with both "Let's set this up" and "Skip for now".
- The grown-ups' question, including a wrong answer.
- Several games of each kind.
- A play-time limit: set 10 minutes per sitting and play past it.
- Put the app away and reopen it during a break.
- Parent Zone → Read the privacy policy.
- Delete all data.

Check both iPhone and iPad, and a small Android phone.

### 5. Build and upload

```bash
eas build --platform ios --profile production
eas submit --platform ios
eas build --platform android --profile production     # an .aab
```

**Google requires the very first Android upload to be made by hand.** In
Play Console, upload the `.aab` from the EAS build page to the closed test.
After that, `eas submit --platform android` sends new builds to the
internal track as drafts.

## App Store Connect answers

| Question | Answer |
| --- | --- |
| Name, subtitle, promotional text, description, keywords, URLs | From `store/listing.json` (`app_store`). |
| Category | Primary **Education**, secondary **Games → Family**. See "Kids category?" below. |
| Age rating questionnaire | **None** to every item: no violence, no mature themes, no gambling, no contests, no unrestricted web access, no user-generated content, no messaging. Result: **4+**. |
| App Privacy | **Data Not Collected.** |
| Sign-in required | No. |
| Content rights: "third-party content?" | **Yes**, then confirm. The app shows short, attributed quotations from athletes. |
| Encryption | Already answered by the build ("No"). |
| Review notes | Paste `store/review-notes.txt`. |
| Screenshots | iPhone 6.9" from `store/screenshots/iphone-6.9/`. iPad 13" from `store/screenshots/ipad-13/`. |

**Kids category?** The app follows every Kids-category rule:
- no third-party analytics or ads;
- no data collected;
- no links out or purchases;
- grown-up areas behind a gate.

But the Kids category asks for one age band (5 and under, 6–8, or 9–11),
and these games run from age 3 to adult. Education and Family describe it
without forcing a band. If you'd rather be in Kids for visibility, pick
**6–8**: most of the games fit it.

## Google Play Console answers

| Section | Answer |
| --- | --- |
| Store listing | From `store/listing.json` (`google_play`). Upload the screenshots from `store/screenshots/android/`, plus `store/play-feature-graphic.png` and `store/play-icon-512.png`. |
| App access | All functionality is available without special access. The grown-ups' question shows its own sum. |
| Ads | **No.** |
| Content rating (IARC) | Category: Game, educational. **No** to violence, fear, sexuality, language, controlled substances, gambling, user interaction, sharing location and digital purchases. Expected result: PEGI 3 / ESRB Everyone. |
| Target audience | Every age group from **5 and under** to **18+**. Including children puts the app under the Families policy, which it meets. |
| Data safety | **No data collected, no data shared.** No encryption-in-transit question, since nothing is transmitted. |
| Government, financial, health, news apps | No. |
| Privacy policy | The `privacy.html` address above. |

## Known risks, and what to do

- **Sports quotes.** These are real people's names and words, chosen from
  memory and not checked against sources (see the PR). Apple rarely
  objects to short, attributed quotations. If a reviewer does, the quote
  line can be turned off in one place (`QuoteContext` in
  `src/components/GameFrame.tsx`).
- **App name.** "Games 4 All" has to be unused on each store. If it's
  taken, `store/listing.json` has room for a longer name, such as
  "Games 4 All: Calm Kids Games" (28 characters).
