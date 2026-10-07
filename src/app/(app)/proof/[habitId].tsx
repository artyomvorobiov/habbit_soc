import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Photo } from '@/components/photos';
import { Button, EmptyState, Input, Loading, Screen, Txt } from '@/components/ui';
import { haptic, HabitIcon } from '@/components/visuals';
import { saveCheckinProof } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { type ISODate } from '@/lib/dates';
import { formatLongDate, t } from '@/lib/i18n';
import {
  choosePhotoSource,
  pickPhoto,
  removePhotos,
  uploadPhoto,
  type PhotoSource,
  type PickedPhoto,
} from '@/lib/photos';
import {
  proofKey,
  useArchivedHabits,
  useChallengeByHabit,
  useMyCheckins,
  useMyHabits,
  useRefreshProofs,
  useToday,
} from '@/lib/queries';
import { radius, space, useTheme, withAlpha } from '@/lib/theme';
import type { Challenge, Checkin, Habit } from '@/lib/types';

/** Photo proof and note for one day of a habit. Saving also checks the day off. */
export default function ProofScreen() {
  const { habitId, date: dateParam } = useLocalSearchParams<{ habitId: string; date?: string }>();
  const today = useToday();
  const date = dateParam && dateParam <= today ? dateParam : today;
  const habits = useMyHabits();
  const archived = useArchivedHabits();
  const checkins = useMyCheckins();
  const challengeByHabit = useChallengeByHabit();

  const habit = habits.data?.find((h) => h.id === habitId) ?? archived.data?.find((h) => h.id === habitId);
  if (!habit) {
    if (habits.isPending || archived.isPending) return <Loading />;
    return (
      <Screen>
        <EmptyState emoji="🤷" title={t('habitNotFound')} />
      </Screen>
    );
  }
  if (checkins.isPending) return <Loading />;
  return (
    <ProofForm
      habit={habit}
      date={date}
      isToday={date === today}
      existing={checkins.proofs.get(proofKey(habit.id, date))}
      checked={checkins.index.get(habit.id)?.has(date) ?? false}
      challenge={challengeByHabit.get(habit.id)}
    />
  );
}

function ProofForm({
  habit,
  date,
  isToday,
  existing,
  checked,
  challenge,
}: {
  habit: Habit;
  date: ISODate;
  isToday: boolean;
  existing: Checkin | undefined;
  /** the day is already checked off */
  checked: boolean;
  challenge: Challenge | undefined;
}) {
  const me = useMe();
  const theme = useTheme();
  const refreshProofs = useRefreshProofs();
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [removed, setRemoved] = useState(false);
  const [note, setNote] = useState(existing?.note ?? '');
  const [busy, setBusy] = useState(false);

  const existingPath = removed ? null : (existing?.photo_path ?? null);
  const hasPhoto = !!photo || !!existingPath;
  const required = !!challenge?.proof_required;
  const canSave = required ? hasPhoto : hasPhoto || !!note.trim() || !!existing;

  const pick = async (source: PhotoSource) => {
    const picked = await pickPhoto(source);
    if (picked) {
      setPhoto(picked);
      setRemoved(false);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      const path = photo ? await uploadPhoto(me.id, photo) : existingPath;
      await saveCheckinProof(habit.id, date, path, note.trim() || null, checked);
      if (existing?.photo_path && existing.photo_path !== path) await removePhotos([existing.photo_path]);
      refreshProofs(habit.id);
      haptic('success');
      router.back();
    } catch {
      Alert.alert(t('uploadFailed'));
    } finally {
      setBusy(false);
    }
  };

  const audience = challenge
    ? t('proofVisibleChallenge', { title: challenge.title })
    : habit.visibility === 'private'
      ? t('proofVisiblePrivate')
      : t('proofVisibleFriends');

  return (
    <Screen>
      <Stack.Screen options={{ title: t('proofTitle') }} />

      <View style={styles.header}>
        <HabitIcon emoji={habit.emoji} color={habit.color} size={44} />
        <View style={{ flex: 1 }}>
          <Txt variant="headline" numberOfLines={1}>
            {habit.name}
          </Txt>
          <Txt variant="caption" tone="secondary">
            {isToday ? t('today') : formatLongDate(date)}
          </Txt>
        </View>
      </View>

      {required ? (
        <Txt variant="callout" style={{ color: theme.flame }}>
          {t('proofRequiredHint')}
        </Txt>
      ) : null}

      {hasPhoto ? (
        <View style={{ gap: space.sm }}>
          {photo ? (
            <Image source={{ uri: photo.uri }} style={styles.photo} contentFit="cover" />
          ) : (
            <Photo path={existingPath!} style={styles.photo} />
          )}
          <View style={styles.row}>
            <Button
              title={t('changePhoto')}
              icon="camera-outline"
              variant="secondary"
              compact
              onPress={async () => {
                const source = await choosePhotoSource();
                if (source) await pick(source);
              }}
              style={{ flex: 1 }}
            />
            {!required ? (
              <Button
                title={t('removePhoto')}
                icon="trash-outline"
                variant="danger"
                compact
                onPress={() => {
                  setPhoto(null);
                  setRemoved(true);
                }}
                style={{ flex: 1 }}
              />
            ) : null}
          </View>
        </View>
      ) : (
        <View style={[styles.photo, styles.empty, { borderColor: withAlpha(habit.color, 0.5) }]}>
          {Platform.OS !== 'web' ? (
            <SourceButton icon="📷" label={t('takePhoto')} onPress={() => pick('camera')} />
          ) : null}
          <SourceButton icon="🖼️" label={t('chooseFromLibrary')} onPress={() => pick('library')} />
        </View>
      )}

      <Input
        value={note}
        onChangeText={setNote}
        placeholder={t('proofNotePlaceholder')}
        multiline
        maxLength={280}
        style={{ minHeight: 80, textAlignVertical: 'top' }}
      />
      <Txt variant="footnote" tone="secondary" style={{ paddingHorizontal: space.xs }}>
        {audience}
      </Txt>

      <Button title={t('save')} onPress={save} loading={busy} disabled={!canSave} />
    </Screen>
  );
}

function SourceButton({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.source, { backgroundColor: pressed ? theme.cardPressed : theme.card }]}>
      <Txt style={{ fontSize: 32 }}>{icon}</Txt>
      <Txt variant="callout" style={{ textAlign: 'center' }}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  photo: { width: '100%', aspectRatio: 1, borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden' },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    padding: space.lg,
  },
  source: {
    flex: 1,
    maxWidth: 160,
    aspectRatio: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    padding: space.sm,
  },
  row: { flexDirection: 'row', gap: space.sm },
});
