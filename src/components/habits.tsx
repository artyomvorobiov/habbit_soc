import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Card, Chip, Field, Input, Segmented, Txt } from '@/components/ui';
import { CheckButton, HabitIcon } from '@/components/visuals';
import { formatDays, t, weekdayShort } from '@/lib/i18n';
import { ensureNotificationPermission } from '@/lib/notifications';
import { HABIT_COLORS, HABIT_EMOJIS, radius, space, useTheme } from '@/lib/theme';
import type { Habit, HabitInput, Visibility } from '@/lib/types';

export function Streak({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' }) {
  const theme = useTheme();
  if (value <= 0) return null;
  return (
    <Text
      style={{
        fontSize: size === 'sm' ? 13 : 15,
        fontWeight: '700',
        color: theme.flame,
        fontVariant: ['tabular-nums'],
      }}>
      🔥 {value}
    </Text>
  );
}

export function HabitRow({
  habit,
  done,
  streak,
  onToggle,
  onPress,
  challengeTitle,
}: {
  habit: Habit;
  done: boolean;
  streak: number;
  onToggle?: () => void;
  onPress?: () => void;
  challengeTitle?: string;
}) {
  const theme = useTheme();
  return (
    <Card onPress={onPress} style={styles.row}>
      <HabitIcon emoji={habit.emoji} color={habit.color} />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt
          variant="headline"
          numberOfLines={1}
          style={done ? { color: theme.textSecondary } : undefined}>
          {habit.name}
        </Txt>
        <View style={styles.meta}>
          <Streak value={streak} size="sm" />
          {challengeTitle ? (
            <Txt variant="caption" tone="secondary" numberOfLines={1}>
              🏆 {t('challengeBadge')}
            </Txt>
          ) : (
            <Txt variant="caption" tone="secondary" numberOfLines={1}>
              {formatDays(habit.days)}
            </Txt>
          )}
          {habit.visibility === 'private' ? (
            <Ionicons name="lock-closed" size={11} color={theme.textTertiary} />
          ) : null}
        </View>
      </View>
      {onToggle ? (
        <CheckButton done={done} color={habit.color} onPress={onToggle} accessibilityLabel={habit.name} />
      ) : null}
    </Card>
  );
}

// ---------------------------------------------------------------- form pieces

export function EmojiPicker({ value, onChange, color }: { value: string; onChange: (e: string) => void; color: string }) {
  const theme = useTheme();
  const [custom, setCustom] = useState('');
  return (
    <View style={{ gap: space.sm }}>
      <View style={styles.grid}>
        {HABIT_EMOJIS.map((e) => (
          <Pressable
            key={e}
            onPress={() => onChange(e)}
            style={[
              styles.emojiCell,
              { backgroundColor: e === value ? color : theme.card },
            ]}>
            <Text style={{ fontSize: 24 }}>{e}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        value={custom}
        onChangeText={(text) => {
          setCustom(text);
          if (text.trim()) onChange(text.trim());
        }}
        placeholder={t('pickEmoji')}
        placeholderTextColor={theme.textTertiary}
        style={[styles.emojiInput, { backgroundColor: theme.card, color: theme.text }]}
        maxLength={16}
      />
    </View>
  );
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.grid}>
      {HABIT_COLORS.map((c) => (
        <Pressable
          key={c}
          accessibilityLabel={c}
          onPress={() => onChange(c)}
          style={[
            styles.colorCell,
            { backgroundColor: c, borderColor: c === value ? theme.text : 'transparent' },
          ]}
        />
      ))}
    </View>
  );
}

type ScheduleMode = 'daily' | 'weekdays' | 'custom';

function modeOf(days: number[]): ScheduleMode {
  const key = [...days].sort().join();
  if (key === '1,2,3,4,5,6,7') return 'daily';
  if (key === '1,2,3,4,5') return 'weekdays';
  return 'custom';
}

export function DaysPicker({ value, onChange }: { value: number[]; onChange: (d: number[]) => void }) {
  const [mode, setMode] = useState<ScheduleMode>(modeOf(value));
  return (
    <View style={{ gap: space.md }}>
      <Segmented<ScheduleMode>
        value={mode}
        onChange={(m) => {
          setMode(m);
          if (m === 'daily') onChange([1, 2, 3, 4, 5, 6, 7]);
          if (m === 'weekdays') onChange([1, 2, 3, 4, 5]);
        }}
        options={[
          { value: 'daily', label: t('everyDay') },
          { value: 'weekdays', label: t('weekdays') },
          { value: 'custom', label: t('custom') },
        ]}
      />
      {mode === 'custom' ? (
        <View style={styles.daysRow}>
          {[1, 2, 3, 4, 5, 6, 7].map((d) => {
            const on = value.includes(d);
            return (
              <Chip
                key={d}
                label={weekdayShort(d)}
                selected={on}
                onPress={() => {
                  const next = on ? value.filter((x) => x !== d) : [...value, d].sort();
                  if (next.length > 0) onChange(next);
                }}
              />
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function timeToDate(time: string | null): Date {
  const d = new Date();
  const [h, m] = (time ?? '09:00').split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

function dateToTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

export function ReminderPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (time: string | null) => void;
}) {
  const theme = useTheme();
  const [showAndroid, setShowAndroid] = useState(false);
  const enabled = value !== null;
  return (
    <View style={[styles.reminder, { backgroundColor: theme.card }]}>
      <View style={styles.reminderRow}>
        <View style={{ flex: 1 }}>
          <Txt>{t('reminder')}</Txt>
          <Txt variant="caption" tone="secondary">
            {t('reminderHint')}
          </Txt>
        </View>
        <Switch
          value={enabled}
          onValueChange={async (on) => {
            if (on) {
              await ensureNotificationPermission();
              onChange('09:00:00');
            } else {
              onChange(null);
            }
          }}
        />
      </View>
      {enabled && Platform.OS === 'ios' ? (
        <DateTimePicker
          mode="time"
          display="spinner"
          value={timeToDate(value)}
          onChange={(_, d) => d && onChange(dateToTime(d))}
          style={{ height: 150 }}
        />
      ) : null}
      {enabled && Platform.OS === 'android' ? (
        <>
          <Pressable onPress={() => setShowAndroid(true)} style={styles.androidTime}>
            <Txt variant="title">{value?.slice(0, 5)}</Txt>
          </Pressable>
          {showAndroid ? (
            <DateTimePicker
              mode="time"
              value={timeToDate(value)}
              onChange={(_, d) => {
                setShowAndroid(false);
                if (d) onChange(dateToTime(d));
              }}
            />
          ) : null}
        </>
      ) : null}
    </View>
  );
}

export function HabitForm({
  value,
  onChange,
}: {
  value: HabitInput;
  onChange: (v: HabitInput) => void;
}) {
  const set = (patch: Partial<HabitInput>) => onChange({ ...value, ...patch });
  return (
    <View style={{ gap: space.xl }}>
      <View style={{ alignItems: 'center' }}>
        <HabitIcon emoji={value.emoji} color={value.color} size={88} />
      </View>
      <Field label={t('habitName')}>
        <Input
          value={value.name}
          onChangeText={(name) => set({ name })}
          placeholder={t('habitNamePlaceholder')}
          maxLength={60}
          autoFocus={!value.name}
          returnKeyType="done"
        />
      </Field>
      <Field label={t('icon')}>
        <EmojiPicker value={value.emoji} onChange={(emoji) => set({ emoji })} color={value.color} />
      </Field>
      <Field label={t('color')}>
        <ColorPicker value={value.color} onChange={(color) => set({ color })} />
      </Field>
      <Field label={t('schedule')}>
        <DaysPicker value={value.days} onChange={(days) => set({ days })} />
      </Field>
      <Field
        label={t('visibility')}
        hint={value.visibility === 'friends' ? t('visibilityFriendsHint') : t('visibilityPrivateHint')}>
        <Segmented<Visibility>
          value={value.visibility}
          onChange={(visibility) => set({ visibility })}
          options={[
            { value: 'friends', label: `👀 ${t('visibilityFriends')}` },
            { value: 'private', label: `🔒 ${t('visibilityPrivate')}` },
          ]}
        />
      </Field>
      <ReminderPicker value={value.reminder_time} onChange={(reminder_time) => set({ reminder_time })} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  emojiCell: {
    width: 46,
    height: 46,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiInput: {
    fontSize: 17,
    paddingHorizontal: space.lg,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  colorCell: { width: 40, height: 40, borderRadius: 20, borderWidth: 3 },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  reminder: { borderRadius: radius.md, padding: space.lg, gap: space.sm },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  androidTime: { alignSelf: 'flex-start', paddingVertical: space.xs },
});
