import { useRef, useState } from 'react';
import { Alert, Platform, View } from 'react-native';

import { RecapCard } from '@/components/recap';
import { Button, Screen, Segmented } from '@/components/ui';
import { useMe } from '@/lib/auth';
import { addDays, startOfWeek } from '@/lib/dates';
import { t } from '@/lib/i18n';
import { useMyCheckins, useMyHabits, useToday } from '@/lib/queries';
import { computeRecap } from '@/lib/recap';
import { shareImageOf } from '@/lib/share';
import { space } from '@/lib/theme';

type Week = 'this' | 'last';

export default function RecapScreen() {
  const me = useMe();
  const today = useToday();
  const habits = useMyHabits();
  const checkins = useMyCheckins();
  const cardRef = useRef<View>(null);
  const [week, setWeek] = useState<Week>('this');
  const [busy, setBusy] = useState(false);

  const monday = startOfWeek(today);
  const weekStart = week === 'this' ? monday : addDays(monday, -7);
  const recap = computeRecap(habits.data ?? [], checkins.index, weekStart, today);

  const share = async () => {
    setBusy(true);
    try {
      await shareImageOf(cardRef);
    } catch {
      Alert.alert(t('shareFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen contentStyle={{ alignItems: 'center', gap: space.xl }}>
      <View style={{ alignSelf: 'stretch' }}>
        <Segmented<Week>
          value={week}
          onChange={setWeek}
          options={[
            { value: 'this', label: t('thisWeek') },
            { value: 'last', label: t('lastWeek') },
          ]}
        />
      </View>
      <RecapCard ref={cardRef} recap={recap} username={me.username} />
      {Platform.OS !== 'web' ? (
        <Button title={t('share')} icon="share-outline" onPress={share} loading={busy} style={{ alignSelf: 'stretch' }} />
      ) : null}
    </Screen>
  );
}
