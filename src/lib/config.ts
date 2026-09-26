import Constants from 'expo-constants';

// App-wide settings. Change them here when you rename the app or get a domain.

/** Deep-link scheme, must match "scheme" in app.json. */
export const APP_SCHEME = 'streakmates';

/**
 * Public web address used in invite messages. Until you have a website,
 * links use the app scheme and open the app directly if it is installed.
 */
export const INVITE_BASE_URL = `${APP_SCHEME}://`;

export const PRIVACY_POLICY_URL = 'https://example.com/privacy';
export const SUPPORT_EMAIL = 'support@example.com';

export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export function profileLink(username: string): string {
  return `${INVITE_BASE_URL}u/${username}`;
}

export function challengeLink(code: string): string {
  return `${INVITE_BASE_URL}join/${code}`;
}
