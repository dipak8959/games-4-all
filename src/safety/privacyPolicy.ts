/**
 * The privacy policy, in one place.
 *
 * Parent Zone shows it in the app, and scripts/store/write-pages.mjs writes
 * the same words to docs/privacy.html for the store listings' privacy URL,
 * so the two can't drift apart (tests/store.test.ts checks).
 *
 * Every sentence here has to be true of the code: no network code (enforced
 * by scripts/check-safety.mjs), no permissions beyond vibration, nothing
 * stored outside the device. Change the app, change this, and its date.
 *
 * The app shows the version for the system it runs on, which names no other
 * system: Apple's review guideline 2.3.10 rejects an app that mentions other
 * mobile platforms. The web page, written for both stores, names both.
 */

export const APP_NAME = 'Games 4 All';
/** The release this text describes; tests/store.test.ts holds it to app.json. */
export const APP_VERSION = '1.0.0';
export const POLICY_DATE = '30 October 2026';
export const SUPPORT_URL = 'https://github.com/dipak8959/games-4-all/issues';
/**
 * An address for questions, shown in the policy and on the support page when
 * set. Apple asks for "an easy way to contact you" (guideline 1.5); issues
 * need a GitHub account, an email address doesn't. Only the owner can choose
 * it — see SUBMISSION.md.
 */
export const SUPPORT_EMAIL = '';

export type PolicySection = { readonly heading: string; readonly paragraphs: readonly string[] };

export type PolicyPlatform = 'ios' | 'android' | 'web';

/** How to reach us, in one line: the email address first, when there is one. */
export const CONTACT = SUPPORT_EMAIL ? `${SUPPORT_EMAIL}, or ${SUPPORT_URL}` : SUPPORT_URL;

export function privacyPolicy(platform: PolicyPlatform): readonly PolicySection[] {
  const network = {
    ios: 'It has no network code: nothing in it can send or receive anything.',
    android: 'It has no network code, and it does not even have permission to use the internet.',
    web: 'It has no network code, and on Android it does not even have permission to use the internet.',
  }[platform];
  const permissions = {
    ios: 'It does not ask for location, camera, microphone, contacts or photos, or for any other permission.',
    android:
      'It does not ask for location, camera, microphone, contacts or photos. Its only permission is vibration, for the gentle buzz on a tap.',
    web: 'It does not ask for location, camera, microphone, contacts or photos. On iPhone and iPad it asks for no permission at all; on Android its only permission is vibration, for the gentle buzz on a tap.',
  }[platform];
  const store = {
    ios: 'Apple, which distributes the app through the App Store, handles downloads under its own privacy policy. If you have chosen in your device’s settings to share analytics with app developers, Apple may pass on anonymous crash reports; these contain nothing that identifies a player.',
    android:
      'Google, which distributes the app through Google Play, handles downloads under its own privacy policy. If you have chosen in your device’s settings to share diagnostics, Google may pass on anonymous crash reports; these contain nothing that identifies a player.',
    web: 'Apple and Google, who distribute the app, handle downloads under their own privacy policies. If you have chosen in your device’s settings to share diagnostics with app developers, they may pass on anonymous crash reports; these contain nothing that identifies a player.',
  }[platform];

  return [
    {
      heading: 'In short',
      paragraphs: [
        `${APP_NAME} collects no personal data. It works entirely offline: it never connects to the internet, and nothing that happens in it leaves the device. There are no ads, no accounts, no in-app purchases, no analytics and no tracking.`,
      ],
    },
    {
      heading: 'What the app keeps, and where',
      paragraphs: [
        'A grown-up can make a profile for each player: a nickname picked from a list (Explorer, Tiger, Star and so on — the app never asks for a real name), an age, and a colour. The app also keeps each profile’s settings (vibration, reduced motion, play-time limits, favourite games) and its play history (stars, levels, rounds played and time played).',
        'All of this is stored only on this device, in the app’s own private storage. It is used only to run the app: to choose games that suit each player’s age, to set each game’s level, and to apply the limits a grown-up sets. It is never sent anywhere. We, the developers, never see it and hold no copy.',
      ],
    },
    {
      heading: 'What the app does not do',
      paragraphs: [
        `${network} It contains no third-party code that collects data: no advertising, analytics, crash-reporting or social SDKs.`,
        permissions,
        'There is no chat, no messaging, and no way to contact or be contacted by anyone. Group games are played on one device by people in the same room.',
      ],
    },
    {
      heading: 'Children',
      paragraphs: [
        `${APP_NAME} is made for children and families. Because it collects no personal information, and shares none, it meets the requirements of the US Children’s Online Privacy Protection Act (COPPA), the GDPR and the UK Age Appropriate Design Code without needing a parent’s consent to collect anything.`,
        'Settings, profiles and limits sit behind a grown-ups-only question in Parent Zone.',
      ],
    },
    {
      heading: 'Deleting data',
      paragraphs: [
        'Parent Zone → Delete all data removes every profile, setting and play history from the device. Deleting the app does the same. Nothing is kept anywhere else, so there is nothing more to delete.',
      ],
    },
    { heading: 'The app stores', paragraphs: [store] },
    {
      heading: 'Changes, and questions',
      paragraphs: [
        `If this policy changes, the new version will be in the app and on its web page with a new date. This version is dated ${POLICY_DATE}.`,
        `Questions or concerns: ${CONTACT}`,
      ],
    },
  ];
}

/** The web page's version, which covers both stores. */
export const PRIVACY_POLICY = privacyPolicy('web');
