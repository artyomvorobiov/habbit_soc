import { useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { ShareCard } from '@/components/social';
import { Button, EmptyState, Screen } from '@/components/ui';
import { useMe } from '@/lib/auth';
import { t } from '@/lib/i18n';
import { useMyCheckins, useMyHabits, useToday } from '@/lib/queries';
import { currentStreak } from '@/lib/streaks';
import { space } from '@/lib/theme';

export default function ShareHabit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const today = useToday();
  const habits = useMyHabits();
  const checkins = useMyCheckins();
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);

  const habit = habits.data?.find((h) => h.id === id);
  if (!habit) {
    return (
      <Screen>
        <EmptyState emoji="🤷" title={t('habitNotFound')} />
      </Screen>
    );
  }
  const dates = checkins.index.get(habit.id) ?? new Set<string>();

  const share = async () => {
    setBusy(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' });
    } catch {
      Alert.alert(t('shareFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen contentStyle={{ alignItems: 'center', gap: space.xl }}>
      <ShareCard
        ref={cardRef}
        emoji={habit.emoji}
        name={habit.name}
        color={habit.color}
        streak={currentStreak(dates, habit.days, today)}
        today={today}
        dates={dates}
        username={me.username}
      />
      {Platform.OS !== 'web' ? (
        <Button title={t('share')} icon="share-outline" onPress={share} loading={busy} style={{ alignSelf: 'stretch' }} />
      ) : null}
    </Screen>
  );
}
