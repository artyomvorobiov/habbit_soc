import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import { Share, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { challengeLink, profileLink } from './config';
import { t } from './i18n';

/** Opens the system share sheet with a friend invite. */
export function shareInvite(username: string) {
  return Share.share({
    message: t('shareInviteText', { app: t('appName'), username, link: profileLink(username) }),
  });
}

export function shareChallenge(title: string, code: string) {
  return Share.share({
    message: t('inviteCodeText', { app: t('appName'), title, code, link: challengeLink(code) }),
  });
}

/** Takes a picture of a view (a share card) and opens the share sheet with it. */
export async function shareImageOf(ref: RefObject<View | null>) {
  const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
  await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' });
}
