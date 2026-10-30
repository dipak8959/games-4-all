# Submitting Games 4 All

Everything the stores check that lives in the code is done and held by
tests: `tests/store.test.ts`, `tests/adminLock.test.ts`,
`tests/quotes.test.ts` and `scripts/check-safety.mjs`, all run by
`npm run verify`. This file covers the rest. Each **Owner** step needs your
accounts or your decision, and can only be done by you.

The App Store comes first below; Google Play follows.

## What's ready

| Area | State |
| --- | --- |
| **App ID** | `io.github.dipak8959.games4all` on both stores: your GitHub Pages address, reversed, so it's a name you control. |
| **Build** | Version 1.0.0. Build numbers go up by themselves on each EAS production build. Every iOS build uses Expo's SDK 57 image (Xcode 26), as Apple requires; see "iPad and Xcode 27" below. |
| **App icon** | Real artwork in the app's colours. The App Store icon has no alpha channel. Regenerate with `node scripts/store/render-icons.mjs`. |
| **Launch screen** | The app's mark on its own background colour. |
| **Made for Kids** | Everything the Kids category asks: no links out, no purchases, no ads, no third-party code that collects data, and grown-up areas behind a gate. |
| **Parental gate** | A typed answer to a multiplication such as 7 × 93, so a guess works one time in 900. It guards every grown-up setting. |
| **Hidden features** | None. Admin mode is left out of store builds (`EXPO_PUBLIC_STORE_BUILD` in eas.json's production profile). |
| **Other platforms** | Nothing the iPhone app shows names Android or Google (guideline 2.3.10). The in-app privacy policy is the version for the system it runs on. A test holds this. |
| **Controls that work** | The "Sound effects" switch is gone: the app plays no sound, so it did nothing. |
| **Privacy manifest** | No tracking, no collected data. It declares the reasons for the system APIs React Native uses. |
| **Export compliance** | `usesNonExemptEncryption: false`, so App Store Connect doesn't ask on each upload. |
| **iPad** | Supported, portrait and full screen. |
| **Privacy policy** | In the app (Parent Zone → Read the privacy policy) and as a web page, generated from the same text (`npm run store:pages`). |
| **Support page** | `docs/support.html`, with common questions and a way to get in touch. |
| **Listing text** | `store/listing.json`, within every store limit (held by a test). |
| **Screenshots** | `store/screenshots/` at the sizes required for iPhone 6.9", iPad 13" and Android phones, taken from a store build. Regenerate with `node scripts/store/screenshots.mjs`. |
| **Review notes** | `store/review-notes.txt`, ready to paste into App Store Connect's "Notes". |
| **Sports quotes** | Checked against quote researchers in October 2026. Twenty that weren't the person's words, or that read as a mistake, are out. See "Known risks". |

## App Store: owner steps, in order

### 1. Apple Developer Program

Enrol at developer.apple.com ($99 a year). As an individual, the store shows
your legal name as the developer. As an organisation it shows the company's
name, and Apple asks for a D-U-N-S number.

### 2. A support email address (strongly recommended)

Apple asks that the app and its support page give "an easy way to contact
you" (guideline 1.5). Today both point to the repository's GitHub issues,
which need a GitHub account.

1. Put an address you're happy to publish in `SUPPORT_EMAIL` in
   `src/safety/privacyPolicy.ts`.
2. Run `npm run store:pages`, then `npm run verify`.
3. Commit and push.

The policy in the app and the support page then show it.

### 3. Put the web pages online

The listing needs a privacy policy URL and a support URL. Both pages are in
`docs/`. In GitHub, go to the repository's **Settings → Pages**, then:

- Source: **Deploy from a branch**.
- Branch: `main`, folder `/docs`. This works once this PR is merged. To go
  live sooner, choose the branch `claude/kids-game-superapp-g1l2w2` instead.

The pages then live at:

- https://dipak8959.github.io/games-4-all/privacy.html
- https://dipak8959.github.io/games-4-all/support.html

These are the addresses already in `store/listing.json`.

### 4. Connect EAS

```bash
npm install -g eas-cli
eas login
eas init        # creates the project on expo.dev and prints its ID
```

`eas init` adds the project's ID to the app's config. If it says it can't
edit a dynamic config, add the ID it prints to `app.json` as
`"extra": { "eas": { "projectId": "…" } }`. Commit the change either way.

### 5. Create the app in App Store Connect

**Apps → + → New App**:

- **Platform:** iOS.
- **Name:** Games 4 All.
- **Primary language:** English (U.K.). The text uses British spelling.
- **Bundle ID:** `io.github.dipak8959.games4all`. If it isn't in the list
  yet, the first `eas build` registers it.
- **SKU:** `games4all`.

Creating the record reserves the name, so do it early.

### 6. Try it on real devices

```bash
eas build --platform ios --profile production
eas submit --platform ios      # uploads it to TestFlight
```

Add yourself in TestFlight's internal testing and install it on an iPhone
and an iPad. Go through it the way a reviewer will:

- First launch, with both "Let's set this up" and "Skip for now".
- The grown-ups' question, including a wrong answer.
- Several games of each kind.
- A play-time limit: set 10 minutes per sitting and play past it.
- Put the app away and reopen it during a break.
- Parent Zone → Read the privacy policy.
- Delete all data.
- Once more with the phone in dark mode and with a large text size.

### 7. Submit

On the version page, select the build TestFlight has, fill in the answers
below, and choose **Add for Review**. For the first release, pick
**Manually release this version**, so you choose the day it goes live.

## App Store Connect answers

### App Information

| Question | Answer |
| --- | --- |
| Name, subtitle | From `store/listing.json` (`app_store`). |
| Category | Primary **Education**. Secondary **Games**, with the subcategories **Family** and **Educational**. |
| Content rights: "contains, shows or accesses third-party content?" | **Yes.** The app shows short, attributed quotations from athletes. Confirm you have the rights only if you're comfortable that short quotations are fine. If not, switch the quote line off first (`QuoteContext` in `src/components/GameFrame.tsx`). |
| Age rating | The questionnaire below, then **Made for Kids**. |

### Age rating questionnaire

| Section | Answer |
| --- | --- |
| In-app controls | **Parental Controls: yes** (play-time limits and profiles, behind the gate). **Age Assurance: no.** |
| Capabilities | **No** to all: unrestricted web access, user-generated content, social media, messaging and chat, advertising. |
| Mature themes | **None** to all: profanity or crude humour, horror or fear, alcohol, tobacco or drugs. |
| Medical or wellness | **None** to both. |
| Sexuality or nudity | **None** to all. |
| Violence | **None** to all. The one game to think about is Space Rocks, where a spaceship breaks up drifting rocks: no creature or person is ever hurt. |
| Chance-based activities | **No** gambling, **none** simulated, **no** contests, **no** loot boxes. Which Cup? is a watch-the-cups memory game with nothing to bet. |
| Result | **4+**. |
| Age Categories and Override | **Made for Kids**, age range **6–8**. |

**Made for Kids is permanent once App Review approves it**, and every later
update must keep to the Kids rules. This app keeps to them by design, so
nothing is lost.

Why 6–8: 52 of the 60 games can be played at those ages, against 40 for
"5 and under" and 50 for 9–11. The range only decides where the app sits in
the Kids section. Anyone can download it, and the teen and adult games stay.

### Pricing and Availability

| Question | Answer |
| --- | --- |
| Price | **Free.** |
| Availability | All countries and regions. |
| Apple Vision Pro | **Off.** Kids apps can't be offered there. |
| Mac (Apple silicon) | **Off** until someone has tried it on a Mac. |

### App Privacy

| Question | Answer |
| --- | --- |
| Data collection | **Data Not Collected.** |
| Privacy policy URL | The `privacy.html` address above. |

### The version page

| Question | Answer |
| --- | --- |
| Screenshots | iPhone 6.9" from `store/screenshots/iphone-6.9/`. iPad 13" from `store/screenshots/ipad-13/`. |
| Promotional text, description, keywords | From `store/listing.json`. |
| Support URL, marketing URL | From `store/listing.json`. |
| Version | 1.0.0. |
| Copyright | "2026", then your legal name, or your company's. |
| App Review information | Your name, phone and email. **Sign-in required: no.** Notes: paste `store/review-notes.txt`. |
| Encryption | Already answered by the build ("No"). |

### Accessibility labels (optional)

App Store Connect lets you declare which accessibility features the app
supports. Claim only what holds for the common tasks:

| Feature | Claim? | Why |
| --- | --- | --- |
| Differentiate Without Color Alone | **Yes** | A house rule: colour is never the only signal. |
| VoiceOver | Not yet | Every control is labelled, but the real-time games can't be played without sight. |
| Voice Control | Not yet | Not tested. |
| Larger Text | Not yet | Not tested at 200% text size. |
| Sufficient Contrast | Not yet | White words on the red accent are 3.9:1, under the 4.5:1 asked of small text. |
| Reduced Motion | Not yet | The setting follows the system's and calms the animations, but motion is how the arcade games are played. |
| Dark Interface | No | The app is light only. |
| Captions, Audio Descriptions | No | The app has no video and no audio. |

## iPad and Xcode 27

Apple deprecated `UIRequiresFullScreen`, which keeps the app full screen
and upright on iPad. Builds made with Xcode 26 still honour it. Builds made
with Xcode 27 don't, and an Expo SDK 57 app built there doesn't launch on
iOS 27 at all. That's why `eas.json` pins every iOS build to the `sdk-57`
image, and a test keeps it pinned.

Apple usually makes the new Xcode compulsory each spring, so expect Xcode 27
to be required around April 2027. Before then:

- move to the Expo SDK that supports it;
- let the iPad layouts resize and turn sideways, and test them that way;
- move the image pin in `eas.json` and its test.

## Google Play

### Owner steps

1. **Account:** Google Play Console, $25 once. **A new personal account
   can't publish straight to production.** Google requires a closed test
   with at least 12 testers for 14 days first. Start it as soon as the
   first build is up.
2. **Build:** `eas build --platform android --profile production` makes an
   `.aab`.
3. **First upload by hand.** Google requires the very first upload to be
   made in Play Console: upload the `.aab` from the EAS build page to the
   closed test. After that, `eas submit --platform android` sends new builds
   to the internal track as drafts.
4. Try it on a small Android phone with the checklist above.

### Play Console answers

| Section | Answer |
| --- | --- |
| Store listing | From `store/listing.json` (`google_play`). Upload the screenshots from `store/screenshots/android/`, plus `store/play-feature-graphic.png` and `store/play-icon-512.png`. |
| App access | All functionality is available without special access. The grown-ups' question shows its own sum. |
| Ads | **No.** |
| Content rating (IARC) | Category: Game, educational. **No** to violence, fear, sexuality, language, controlled substances, gambling, user interaction, sharing location and digital purchases. Expected result: PEGI 3 / ESRB Everyone. |
| Target audience | Every age group from **5 and under** to **18+**. Including children puts the app under the Families policy, which it meets. |
| Data safety | **No data collected, no data shared.** |
| Government, financial, health, news apps | No. |
| Privacy policy | The `privacy.html` address above. |

## Known risks, and what to do

- **Kids review is closer.** Reviewers try the grown-ups' question and look
  for links out, purchases and ads. There are none to find, and the review
  notes say where everything is.
- **Sports quotes.** They name real people. In October 2026 they were checked
  against Quote Investigator, Barry Popik's research and Snopes:
  - Twenty came out, mostly words that turned out to be someone else's or
    that no one has traced to the person.
  - Two were put back into the words actually printed.
  - Nothing is known against the remaining 156, but most haven't been traced
    to a first printing. Wikiquote, which records where each quote comes
    from, couldn't be reached from the session that did the check.
  - If a reviewer objects to the quotes, switch the line off in one place
    (`QuoteContext` in `src/components/GameFrame.tsx`).
- **App name.** "Games 4 All" has to be unused on the App Store; creating
  the app record (step 5) tells you. If it's taken, `store/listing.json`
  has room for a longer name, such as "Games 4 All: Calm Kids Games" (28
  characters). That name says the app is for children, which only a Made
  for Kids app may do.
