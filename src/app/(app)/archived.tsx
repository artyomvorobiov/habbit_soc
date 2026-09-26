import { router } from 'expo-router';
import { Alert } from 'react-native';

import { Button, EmptyState, List, ListItem, Screen } from '@/components/ui';
import { HabitIcon } from '@/components/visuals';
import { updateHabit } from '@/lib/api';
import { t } from '@/lib/i18n';
import { useArchivedHabits, useRefreshHabits } from '@/lib/queries';

export default function Archived() {
  const archived = useArchivedHabits();
  const refresh = useRefreshHabits();
  const list = archived.data ?? [];

  const restore = async (id: string) => {
    try {
      await updateHabit(id, { archived_at: null });
      refresh();
    } catch {
      Alert.alert(t('error'));
    }
  };

  return (
    <Screen refreshing={archived.isRefetching} onRefresh={() => archived.refetch()}>
      {archived.isSuccess && list.length === 0 ? <EmptyState emoji="📦" title={t('noArchived')} /> : null}
      {list.length > 0 ? (
        <List>
          {list.map((h) => (
            <ListItem
              key={h.id}
              title={h.name}
              left={<HabitIcon emoji={h.emoji} color={h.color} size={36} />}
              onPress={() => router.push(`/habit/${h.id}`)}
              chevron={false}
              right={<Button title={t('unarchive')} variant="plain" onPress={() => restore(h.id)} />}
            />
          ))}
        </List>
      ) : null}
    </Screen>
  );
}
