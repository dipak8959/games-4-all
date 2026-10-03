import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Production hardening layer.
 *
 * `app.json` holds the base config. This file layers on the permissions we strip
 * only from shipped builds — notably INTERNET, which Metro still needs while a
 * development build is attached to a bundler.
 *
 * The app makes no network calls at all (see `scripts/check-safety.mjs`), so a
 * release build is handed no way to make one even if a future dependency tried.
 */
const PRODUCTION_BLOCKED_PERMISSIONS = [
  'android.permission.INTERNET',
  'android.permission.ACCESS_NETWORK_STATE',
  // "Display over other apps": React Native's template adds it for its
  // developer overlay. Nothing a player sees needs it, and Google Play asks
  // apps for children to justify it.
  'android.permission.SYSTEM_ALERT_WINDOW',
];

export default ({ config }: ConfigContext): ExpoConfig => {
  // Blocked unless a build explicitly asks to be a development build. Expo's
  // tools set NODE_ENV=development for many commands — prebuild among them —
  // so it can't be the test: a store build must never depend on it.
  const isDev = process.env.APP_VARIANT === 'development';

  if (isDev) return config as ExpoConfig;

  return {
    ...config,
    android: {
      ...config.android,
      blockedPermissions: [
        ...(config.android?.blockedPermissions ?? []),
        ...PRODUCTION_BLOCKED_PERMISSIONS,
      ],
    },
  } as ExpoConfig;
};
