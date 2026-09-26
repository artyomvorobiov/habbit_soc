import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Switch, View } from 'react-native';

import { ColorPicker, EmojiPicker } from '@/components/habits';
import { Button, Chip, Field, Input, List, ListItem, Screen, Txt } from '@/components/ui';
import { Avatar, HabitIcon } from '@/components/visuals';
import { createChallenge } from '@/lib/api';
import { addDays, isoWeekday, type ISODate } from '@/lib/dates';
import { countOf, formatShortDate, t } from '@/lib/i18n';
import { qk, useFriends, useRefreshHabits, useToday } from '@/lib/queries';
import { space } from '@/lib/theme';

const DURATIONS = [7, 14, 21, 30];

export default function NewChallenge() {
  const params = useLocalSearchParams<{ invite?: string }>();
  const today = useToday();
  const friends = useFriends();
  const qc = useQueryClient();
  const refreshHabits = useRefreshHabits();

  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🏆');
  const [color, setColor] = useState('#FF9500');
  const [length, setLength] = useState(7);
  const [startKey, setStartKey] = useState<'today' | 'tomorrow' | 'monday'>('today');
  const [invited, setInvited] = useState<string[]>(params.invite ? [params.invite] : []);
  const [busy, setBusy] = useState(false);

  const starts: Record<typeof startKey, ISODate> = {
    today,
    tomorrow: addDays(today, 1),
    monday: addDays(today, 8 - isoWeekday(today)),
  };
  const start = starts[startKey];
  const end = addDays(start, length - 1);
  const accepted = friends.data?.filter((f) => f.status === 'friend') ?? [];

  const create = async () => {
    setBusy(true);
    try {
      const id = await createChallenge({ title: title.trim(), emoji, color, start, end, invitees: invited });
      await qc.invalidateQueries({ queryKey: qk.challenges });
      refreshHabits();
      router.replace(`/challenge/${id}`);
    } catch {
      Alert.alert(t('error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen contentStyle={{ gap: space.xl }}>
      <View style={{ alignItems: 'center' }}>
        <HabitIcon emoji={emoji} color={color} size={88} />
      </View>

      <Field label={t('challengeTitle')}>
        <Input
          value={title}
          onChangeText={setTitle}
          placeholder={t('challengeTitlePlaceholder')}
          maxLength={60}
          autoFocus
        />
      </Field>

      <Field label={t('icon')}>
        <EmojiPicker value={emoji} onChange={setEmoji} color={color} />
      </Field>

      <Field label={t('color')}>
        <ColorPicker value={color} onChange={setColor} />
      </Field>

      <Field label={t('duration')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {DURATIONS.map((d) => (
            <Chip key={d} label={countOf('day', d)} selected={d === length} onPress={() => setLength(d)} />
          ))}
        </View>
      </Field>

      <Field label={t('startDate')} hint={`${formatShortDate(start)} – ${formatShortDate(end)}`}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          <Chip label={t('startToday')} selected={startKey === 'today'} onPress={() => setStartKey('today')} />
          <Chip label={t('startTomorrow')} selected={startKey === 'tomorrow'} onPress={() => setStartKey('tomorrow')} />
          <Chip label={t('startMonday')} selected={startKey === 'monday'} onPress={() => setStartKey('monday')} />
        </View>
      </Field>

      <Field label={t('inviteFriendsToChallenge')}>
        {accepted.length > 0 ? (
          <List>
            {accepted.map((f) => {
              const on = invited.includes(f.user_id);
              return (
                <ListItem
                  key={f.user_id}
                  title={f.display_name}
                  subtitle={`@${f.username}`}
                  left={<Avatar emoji={f.avatar} size={32} />}
                  chevron={false}
                  onPress={() =>
                    setInvited(on ? invited.filter((x) => x !== f.user_id) : [...invited, f.user_id])
                  }
                  right={
                    <Switch
                      value={on}
                      onValueChange={(v) =>
                        setInvited(v ? [...invited, f.user_id] : invited.filter((x) => x !== f.user_id))
                      }
                    />
                  }
                />
              );
            })}
          </List>
        ) : (
          <Txt tone="secondary" style={{ paddingHorizontal: space.xs }}>
            {t('noFriendsToInvite')}
          </Txt>
        )}
      </Field>

      <Button title={t('createChallenge')} onPress={create} loading={busy} disabled={!title.trim()} />
    </Screen>
  );
}
