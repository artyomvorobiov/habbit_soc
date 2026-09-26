import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Input, Txt } from '@/components/ui';
import { t } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { space, useTheme } from '@/lib/theme';

type Mode = 'signIn' | 'signUp' | 'forgot' | 'reset';

export default function SignIn() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      Alert.alert(t('error'), e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const submit = () =>
    run(async () => {
      if (!validEmail) throw new Error(t('invalidEmail'));
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
        if (error) throw error;
        setMode('reset');
        return;
      }
      if (password.length < 6) throw new Error(t('passwordTooShort'));
      if (mode === 'reset') {
        const { error } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: code.trim(),
          type: 'recovery',
        });
        if (error) throw error;
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        return; // signed in now, the navigator moves on
      }
      if (mode === 'signUp') {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        if (!data.session) {
          Alert.alert(t('checkEmail'));
          setMode('signIn');
        }
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    });

  const title = {
    signIn: t('signIn'),
    signUp: t('signUp'),
    forgot: t('forgotPassword'),
    reset: t('setPassword'),
  }[mode];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 60, paddingBottom: insets.bottom + space.xl },
        ]}>
        <View style={styles.hero}>
          <Text style={{ fontSize: 72 }}>🔥</Text>
          <Txt variant="largeTitle">{t('appName')}</Txt>
          <Txt tone="secondary" style={{ textAlign: 'center' }}>
            {t('tagline')}
          </Txt>
        </View>

        <View style={{ gap: space.md }}>
          <Txt variant="title">{title}</Txt>
          {mode === 'reset' ? (
            <Txt tone="secondary">{t('resetCodeSent', { email: email.trim() })}</Txt>
          ) : null}
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder={t('email')}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            editable={mode !== 'reset'}
          />
          {mode === 'reset' ? (
            <Input
              value={code}
              onChangeText={setCode}
              placeholder={t('code')}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={8}
            />
          ) : null}
          {mode !== 'forgot' ? (
            <Input
              value={password}
              onChangeText={setPassword}
              placeholder={mode === 'reset' ? t('newPassword') : t('password')}
              secureTextEntry
              autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
              textContentType={mode === 'signIn' ? 'password' : 'newPassword'}
              onSubmitEditing={submit}
            />
          ) : null}
          <Button
            title={mode === 'forgot' ? t('sendCode') : title}
            onPress={submit}
            loading={busy}
            disabled={!email || (mode !== 'forgot' && !password)}
          />
        </View>

        <View style={styles.links}>
          {mode === 'signIn' ? (
            <>
              <Link label={`${t('noAccount')} ${t('signUp')}`} onPress={() => setMode('signUp')} />
              <Link label={t('forgotPassword')} onPress={() => setMode('forgot')} />
            </>
          ) : mode === 'signUp' ? (
            <Link label={`${t('haveAccount')} ${t('signIn')}`} onPress={() => setMode('signIn')} />
          ) : (
            <Link label={t('backToSignIn')} onPress={() => setMode('signIn')} />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Link({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Txt variant="callout" tone="secondary" style={{ textAlign: 'center' }}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: space.xl, gap: space.xxl, flexGrow: 1 },
  hero: { alignItems: 'center', gap: space.sm },
  links: { gap: space.lg, alignItems: 'center' },
});
