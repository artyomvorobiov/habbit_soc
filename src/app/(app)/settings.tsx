import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';

import { AvatarPicker, USERNAME_RE } from '@/components/profile';
import { Button, Field, Input, List, ListItem, Screen, Section, Txt } from '@/components/ui';
import { ApiError, deleteAccount, isUsernameFree, saveProfile } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { APP_VERSION, PRIVACY_POLICY_URL, SUPPORT_EMAIL } from '@/lib/config';
import { t } from '@/lib/i18n';
import { ensureNotificationPermission } from '@/lib/notifications';
import { qk } from '@/lib/queries';
import { shareInvite } from '@/lib/share';
import { supabase } from '@/lib/supabase';
import { space } from '@/lib/theme';

export default function Settings() {
  const me = useMe();
  const qc = useQueryClient();
  const [avatar, setAvatar] = useState(me.avatar);
  const [name, setName] = useState(me.display_name);
  const [username, setUsername] = useState(me.username);
  const [busy, setBusy] = useState(false);

  const changed = avatar !== me.avatar || name.trim() !== me.display_name || username !== me.username;
  const valid = name.trim().length > 0 && USERNAME_RE.test(username);

  const save = async () => {
    setBusy(true);
    try {
      if (username !== me.username && !(await isUsernameFree(username, me.id))) {
        Alert.alert(t('usernameTaken'));
        return;
      }
      const profile = await saveProfile(me.id, { avatar, display_name: name.trim(), username });
      qc.setQueryData(['profile', me.id], profile);
      qc.invalidateQueries({ queryKey: qk.feed });
      Alert.alert(t('saved'));
    } catch (e) {
      Alert.alert(e instanceof ApiError && e.code === 'username_taken' ? t('usernameTaken') : t('error'));
    } finally {
      setBusy(false);
    }
  };

  const checkNotifications = async () => {
    if (Platform.OS === 'web') return;
    const granted = await ensureNotificationPermission();
    if (!granted) {
      Alert.alert(t('notifications'), t('notificationsDenied', { app: t('appName') }), [
        { text: t('cancel'), style: 'cancel' },
        { text: t('openSettings'), onPress: () => Linking.openSettings() },
      ]);
    } else {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      Alert.alert(t('notifications'), `✓ ${scheduled.length}`);
    }
  };

  const confirmDelete = () =>
    Alert.alert(t('deleteAccount'), t('deleteAccountConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('deleteAccount'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAccount();
          } catch {
            Alert.alert(t('error'));
          }
        },
      },
    ]);

  return (
    <Screen contentStyle={{ gap: space.xl }}>
      <Section title={t('editProfile')}>
        <AvatarPicker value={avatar} onChange={setAvatar} />
      </Section>
      <Field label={t('displayName')}>
        <Input value={name} onChangeText={setName} maxLength={40} />
      </Field>
      <Field label={t('username')} hint={USERNAME_RE.test(username) ? t('usernameHint') : t('usernameInvalid')}>
        <Input
          value={username}
          onChangeText={(v) => setUsername(v.toLowerCase().replace(/\s/g, ''))}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
        />
      </Field>
      {changed ? <Button title={t('save')} onPress={save} loading={busy} disabled={!valid} /> : null}

      <List>
        <ListItem icon="notifications-outline" title={t('notifications')} onPress={checkNotifications} />
        <ListItem icon="share-outline" title={t('inviteFriends')} onPress={() => shareInvite(me.username)} />
        <ListItem icon="shield-checkmark-outline" title={t('privacyPolicy')} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} />
        <ListItem icon="mail-outline" title={t('support')} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} />
      </List>

      <List>
        <ListItem icon="log-out-outline" title={t('signOut')} chevron={false} onPress={() => supabase.auth.signOut()} />
        <ListItem icon="trash-outline" title={t('deleteAccount')} destructive chevron={false} onPress={confirmDelete} />
      </List>

      <Txt variant="footnote" tone="tertiary" style={{ textAlign: 'center' }}>
        {t('appName')} · {t('version')} {APP_VERSION}
      </Txt>
    </Screen>
  );
}
