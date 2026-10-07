import { StyleSheet, View } from 'react-native';

import { Card, Txt } from '@/components/ui';
import { HabitIcon } from '@/components/visuals';
import { diffDays, type ISODate } from '@/lib/dates';
import { countOf, formatShortDate, t } from '@/lib/i18n';
import { radius, space } from '@/lib/theme';
import type { Challenge } from '@/lib/types';

export type ChallengePhase = 'upcoming' | 'active' | 'finished';

export function phaseOf(c: Pick<Challenge, 'start_date' | 'end_date'>, today: ISODate): ChallengePhase {
  if (today < c.start_date) return 'upcoming';
  if (today > c.end_date) return 'finished';
  return 'active';
}

export function challengeLength(c: Pick<Challenge, 'start_date' | 'end_date'>): number {
  return diffDays(c.start_date, c.end_date) + 1;
}

/** "Day 3 of 7", "Starts in 2 days" or "Ended Sep 26". */
export function challengeStatus(c: Challenge, today: ISODate): string {
  const phase = phaseOf(c, today);
  if (phase === 'upcoming') return t('startsIn', { n: countOf('day', diffDays(today, c.start_date)) });
  if (phase === 'finished') return t('endedOn', { date: formatShortDate(c.end_date) });
  return t('dayXofY', { x: diffDays(c.start_date, today) + 1, y: challengeLength(c) });
}

export function ChallengeCard({
  challenge,
  today,
  onPress,
  children,
}: {
  challenge: Challenge;
  today: ISODate;
  onPress?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Card onPress={onPress} style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <HabitIcon emoji={challenge.emoji} color={challenge.color} />
        <View style={{ flex: 1, gap: 2 }}>
          {challenge.my_status === 'invited' && challenge.invited_by ? (
            <Txt variant="caption" tone="secondary">
              {t('invitedBy', { name: challenge.invited_by })}
            </Txt>
          ) : null}
          <Txt variant="headline" numberOfLines={2}>
            {challenge.title}
          </Txt>
          <Txt variant="caption" tone="secondary">
            {challengeStatus(challenge, today)} · {countOf('participant', challenge.member_count)}
            {challenge.proof_required ? ' · 📸' : ''}
          </Txt>
        </View>
        {challenge.unread_count > 0 ? (
          <View style={[styles.unread, { backgroundColor: challenge.color }]}>
            <Txt variant="caption" style={{ color: '#fff', fontWeight: '700' }}>
              💬 {challenge.unread_count}
            </Txt>
          </View>
        ) : null}
      </View>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  unread: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
});
