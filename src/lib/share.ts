import { Share } from 'react-native';

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
