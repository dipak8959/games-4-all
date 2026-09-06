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
];

export default ({ config }: ConfigContext): ExpoConfig => {
  const isDev = process.env.APP_VARIANT === 'development' || process.env.NODE_ENV === 'development';

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
