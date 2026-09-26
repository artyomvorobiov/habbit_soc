import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type Ref } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Txt } from '@/components/ui';
import { ActivityGrid, Avatar, HabitIcon } from '@/components/visuals';
import type { ISODate } from '@/lib/dates';
import { plural, t, timeAgo } from '@/lib/i18n';
import { isMilestone } from '@/lib/streaks';
import { radius, space, useTheme, withAlpha } from '@/lib/theme';
import { REACTIONS, type FeedItem as FeedItemData, type ReactionEmoji } from '@/lib/types';

export function FeedItem({
  item,
  isMine,
  onReact,
  onOpenUser,
}: {
  item: FeedItemData;
  isMine: boolean;
  onReact: (emoji: ReactionEmoji | null) => void;
  onOpenUser: () => void;
}) {
  const theme = useTheme();
  const [picking, setPicking] = useState(false);
  const milestone = isMilestone(item.streak);
  const counts = REACTIONS.filter((r) => (item.reactions[r] ?? 0) > 0);

  return (
    <Card style={{ gap: space.md }}>
      <Pressable onPress={onOpenUser} style={styles.header}>
        <Avatar emoji={item.avatar} size={36} />
        <View style={{ flex: 1 }}>
          <Txt variant="headline" numberOfLines={1}>
            {isMine ? t('you') : item.display_name}
          </Txt>
          <Txt variant="caption" tone="secondary">
            @{item.username} · {timeAgo(item.created_at)}
          </Txt>
        </View>
      </Pressable>

      <View style={[styles.habit, { backgroundColor: withAlpha(item.habit_color, 0.1) }]}>
        <HabitIcon emoji={item.habit_emoji} color={item.habit_color} size={40} />
        <View style={{ flex: 1 }}>
          <Txt variant="headline" numberOfLines={2}>
            {item.habit_name}
          </Txt>
          {item.challenge_title ? (
            <Txt variant="caption" tone="secondary" numberOfLines={1}>
              🏆 {t('inChallenge', { title: item.challenge_title })}
            </Txt>
          ) : null}
        </View>
        {item.streak > 1 ? (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.streak, { color: theme.flame }]}>🔥 {item.streak}</Text>
            {milestone ? (
              <Txt variant="footnote" style={{ color: theme.flame, fontWeight: '700' }}>
                {t('milestone')}
              </Txt>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.reactions}>
        {counts.map((r) => {
          const mine = item.my_reaction === r;
          return (
            <Pressable
              key={r}
              disabled={isMine}
              onPress={() => onReact(mine ? null : r)}
              style={[
                styles.reaction,
                {
                  backgroundColor: mine ? withAlpha(theme.flame, 0.18) : theme.background,
                  borderColor: mine ? theme.flame : 'transparent',
                },
              ]}>
              <Text style={{ fontSize: 15 }}>{r}</Text>
              <Txt variant="caption" style={{ fontWeight: '600' }}>
                {item.reactions[r]}
              </Txt>
            </Pressable>
          );
        })}
        {!isMine ? (
          picking ? (
            <View style={[styles.picker, { backgroundColor: theme.background }]}>
              {REACTIONS.map((r) => (
                <Pressable
                  key={r}
                  hitSlop={4}
                  onPress={() => {
                    setPicking(false);
                    onReact(item.my_reaction === r ? null : r);
                  }}>
                  <Text style={{ fontSize: 24 }}>{r}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Pressable
              accessibilityLabel="React"
              onPress={() => setPicking(true)}
              style={[styles.reaction, { backgroundColor: theme.background, borderColor: 'transparent' }]}>
              <Ionicons name="happy-outline" size={17} color={theme.textSecondary} />
              <Ionicons name="add" size={13} color={theme.textSecondary} />
            </Pressable>
          )
        ) : null}
      </View>
    </Card>
  );
}

/** The picture people post to their stories (captured with react-native-view-shot). */
export function ShareCard({
  ref,
  emoji,
  name,
  color,
  streak,
  today,
  dates,
  username,
}: {
  ref?: Ref<View>;
  emoji: string;
  name: string;
  color: string;
  streak: number;
  today: ISODate;
  dates: Set<ISODate>;
  username: string;
}) {
  return (
    <View ref={ref} collapsable={false} style={[styles.card, { backgroundColor: color }]}>
      <Text style={styles.cardEmoji}>{emoji}</Text>
      <Text style={styles.cardName} numberOfLines={2}>
        {name}
      </Text>
      <View style={{ alignItems: 'center' }}>
        <Text style={styles.cardNumber}>{streak}</Text>
        <Text style={styles.cardLabel}>{plural('dayInRow', streak)} 🔥</Text>
      </View>
      <ActivityGrid
        today={today}
        weeks={15}
        cell={13}
        gap={4}
        color="#FFFFFF"
        emptyColor="rgba(255,255,255,0.22)"
        value={(d) => (dates.has(d) ? 1 : 0)}
      />
      <Text style={styles.cardFooter}>
        {t('shareCardFooter', { app: t('appName'), username })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  habit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderCurve: 'continuous',
  },
  streak: { fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
  reactions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center' },
  reaction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  picker: {
    flexDirection: 'row',
    gap: space.md,
    paddingHorizontal: space.md,
    height: 40,
    alignItems: 'center',
    borderRadius: 20,
  },
  card: {
    width: 330,
    borderRadius: 32,
    borderCurve: 'continuous',
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 18,
  },
  cardEmoji: { fontSize: 64 },
  cardName: { color: '#fff', fontSize: 26, fontWeight: '800', textAlign: 'center' },
  cardNumber: {
    color: '#fff',
    fontSize: 104,
    fontWeight: '900',
    lineHeight: 110,
    fontVariant: ['tabular-nums'],
  },
  cardLabel: { color: '#fff', fontSize: 20, fontWeight: '700', opacity: 0.95 },
  cardFooter: { color: '#fff', fontSize: 14, fontWeight: '600', opacity: 0.85, textAlign: 'center' },
});
