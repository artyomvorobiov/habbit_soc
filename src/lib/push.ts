import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { registerPushToken, unregisterPushToken } from './api';
import { lang } from './i18n';

// Push notifications come from the database (see _send_push() in
// supabase/schema.sql) through the Expo push service. A device needs a token,
// which requires an EAS project id: run `eas init` once (see README).

let currentToken: string | null = null;
/** user the token is registered for in this session */
let registeredFor: string | null = null;

function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
}

/** Registers this device for pushes to the user, if notifications are allowed. */
export async function registerForPush(userId: string): Promise<void> {
  if (Platform.OS === 'web' || !userId || registeredFor === userId) return;
  const id = projectId();
  if (!id) return;
  try {
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) return;
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    await registerPushToken(data, lang);
    currentToken = data;
    registeredFor = userId;
  } catch {
    // pushes are optional (e.g. not available in a simulator)
  }
}

/** Stops pushes to this device for the signed-in user (call before signing out). */
export async function unregisterPush(): Promise<void> {
  const token = currentToken;
  currentToken = null;
  registeredFor = null;
  if (token) await unregisterPushToken(token).catch(() => undefined);
}
