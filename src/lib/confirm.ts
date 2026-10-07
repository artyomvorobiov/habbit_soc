import { Alert, Platform } from 'react-native';

import { t } from './i18n';

/** Yes/no question. Resolves true when the user confirms. */
export function confirm(title: string, message: string | undefined, confirmText: string, destructive = true) {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(message ? `${title}\n\n${message}` : title));
  }
  return new Promise<boolean>((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: t('cancel'), style: 'cancel', onPress: () => resolve(false) },
        { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
