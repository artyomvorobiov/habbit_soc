import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvatarPicker, USERNAME_RE } from '@/components/profile';
import { Button, Field, Input, Txt } from '@/components/ui';
import { ApiError, isUsernameFree, saveProfile } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { t } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { space, useTheme } from '@/lib/theme';

function suggestUsername(email: string | undefined): string {
  const base = (email ?? '').split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
  return base.slice(0, 20);
}

export default function Onboarding() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { session, userId } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [username, setUsername] = useState(suggestUsername(session?.user.email));
  const [avatar, setAvatar] = useState('🙂');
  const [busy, setBusy] = useState(false);

  const valid = name.trim().length > 0 && USERNAME_RE.test(username);

  async function submit() {
    if (!userId) return;
    setBusy(true);
    try {
      if (!(await isUsernameFree(username, userId))) {
        Alert.alert(t('usernameTaken'));
        return;
      }
      const profile = await saveProfile(userId, {
        username,
        display_name: name.trim(),
        avatar,
      });
      qc.setQueryData(['profile', userId], profile);
    } catch (e) {
      Alert.alert(e instanceof ApiError && e.code === 'username_taken' ? t('usernameTaken') : t('error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xl },
        ]}>
        <View style={{ gap: space.xs }}>
          <Txt variant="largeTitle">{t('onboardingTitle')}</Txt>
          <Txt tone="secondary">{t('onboardingSubtitle')}</Txt>
        </View>

        <AvatarPicker value={avatar} onChange={setAvatar} />

        <Field label={t('displayName')}>
          <Input value={name} onChangeText={setName} placeholder={t('displayName')} maxLength={40} autoFocus />
        </Field>

        <Field
          label={t('username')}
          hint={username && !USERNAME_RE.test(username) ? t('usernameInvalid') : t('usernameHint')}>
          <Input
            value={username}
            onChangeText={(v) => setUsername(v.toLowerCase().replace(/\s/g, ''))}
            placeholder="username"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
          />
        </Field>

        <View style={{ gap: space.md }}>
          <Button title={t('letsGo')} onPress={submit} loading={busy} disabled={!valid} />
          <Button title={t('signOut')} variant="plain" onPress={() => supabase.auth.signOut()} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: space.xl, gap: space.xl, flexGrow: 1 },
});
