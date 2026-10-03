import * as Haptics from 'expo-haptics';

/**
 * Feedback effects.
 *
 * Centralised so that every buzz respects the parent's settings, and so the
 * "no sound/haptics without consent" rule has exactly one place to hold.
 *
 * Note there is deliberately no failure buzz. Getting something wrong in this
 * app produces a soft nudge, never a punishing signal.
 */

export type FeedbackPrefs = {
  readonly hapticsOn: boolean;
  readonly soundOn: boolean;
};

async function safely(run: () => Promise<void>): Promise<void> {
  try {
    await run();
  } catch {
    // Haptics are unavailable on some devices and in simulators. Never fatal.
  }
}

export function tap(prefs: FeedbackPrefs): void {
  if (!prefs.hapticsOn) return;
  void safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export function correct(prefs: FeedbackPrefs): void {
  if (!prefs.hapticsOn) return;
  void safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** Softer than a warning: a "try again" nudge, not an error. */
export function nudge(prefs: FeedbackPrefs): void {
  if (!prefs.hapticsOn) return;
  void safely(() => Haptics.selectionAsync());
}

export function celebrate(prefs: FeedbackPrefs): void {
  if (!prefs.hapticsOn) return;
  void safely(async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  });
}
