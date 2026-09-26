import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Txt } from '@/components/ui';
import { ActivityGrid, Avatar } from '@/components/visuals';
import type { ISODate } from '@/lib/dates';
import { t } from '@/lib/i18n';
import type { Stats } from '@/lib/stats';
import { AVATARS, radius, space, useTheme } from '@/lib/theme';

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export function AvatarPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const theme = useTheme();
  return (
    <View style={{ gap: space.md, alignItems: 'center' }}>
      <Avatar emoji={value} size={96} />
      <View style={styles.grid}>
        {AVATARS.map((a) => (
          <Pressable
            key={a}
            accessibilityLabel={a}
            onPress={() => onChange(a)}
            style={[
              styles.cell,
              { backgroundColor: a === value ? theme.primary : theme.card },
            ]}>
            <Text style={{ fontSize: 24 }}>{a}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function ProfileHeader({
  avatar,
  name,
  username,
}: {
  avatar: string;
  name: string;
  username: string;
}) {
  return (
    <View style={{ alignItems: 'center', gap: space.xs }}>
      <Avatar emoji={avatar} size={88} />
      <Txt variant="title" style={{ marginTop: space.sm }}>
        {name}
      </Txt>
      <Txt tone="secondary">@{username}</Txt>
    </View>
  );
}

export function StatsCard({ stats, today }: { stats: Stats; today: ISODate }) {
  const theme = useTheme();
  return (
    <Card style={{ gap: space.lg }}>
      <View style={styles.stats}>
        <Stat value={`🔥 ${stats.bestCurrentStreak}`} label={t('bestNow')} color={theme.flame} />
        <Stat value={String(stats.totalCheckins)} label={t('checkins')} />
        <Stat value={`${Math.round(stats.successRate * 100)}%`} label={t('successRate')} />
      </View>
      <View style={{ alignItems: 'center' }}>
        <ActivityGrid today={today} weeks={16} cell={13} gap={3} color={theme.success} value={stats.activity} />
      </View>
    </Card>
  );
}

function Stat({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Txt variant="title" style={[{ fontVariant: ['tabular-nums'] }, color ? { color } : null]}>
        {value}
      </Txt>
      <Txt variant="caption" tone="secondary" style={{ textAlign: 'center' }}>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center' },
  cell: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: { flexDirection: 'row' },
});
