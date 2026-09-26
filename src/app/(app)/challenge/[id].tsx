import { useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { challengeLength, challengeStatus, phaseOf } from '@/components/challenges';
import { Button, Card, EmptyState, List, ListItem, Loading, Screen, Section, Txt } from '@/components/ui';
import { Avatar, HabitIcon } from '@/components/visuals';
import { inviteToChallenge, joinChallenge, leaveChallenge } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { diffDays, toISODate, type ISODate } from '@/lib/dates';
import { formatShortDate, t } from '@/lib/i18n';
import { qk, useChallengeDetails, useChallenges, useFriends, useRefreshHabits, useToday } from '@/lib/queries';
import { shareChallenge } from '@/lib/share';
import { currentStreak } from '@/lib/streaks';
import { radius, space, useTheme, withAlpha } from '@/lib/theme';
import type { Challenge, ChallengeMember } from '@/lib/types';

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];
const MEDALS = ['🥇', '🥈', '🥉'];

type Standing = {
  member: ChallengeMember;
  score: number;
  streak: number;
  doneToday: boolean;
  rank: number;
};

function standings(
  challenge: Challenge,
  members: ChallengeMember[],
  index: Map<string, Set<ISODate>>,
  today: ISODate,
): Standing[] {
  const last = today < challenge.end_date ? today : challenge.end_date;
  const rows = members
    .filter((m) => m.status === 'joined')
    .map((member) => {
      const dates = (member.habit_id && index.get(member.habit_id)) || new Set<ISODate>();
      // days before joining don't count, so late joiners can't fill them in
      const joined = member.joined_at ? toISODate(new Date(member.joined_at)) : challenge.start_date;
      const from = joined > challenge.start_date ? joined : challenge.start_date;
      const inRange = [...dates].filter((d) => d >= from && d <= last);
      return {
        member,
        score: inRange.length,
        streak: currentStreak(new Set(inRange), ALL_DAYS, last),
        doneToday: dates.has(today),
        rank: 0,
      };
    })
    .sort((a, b) => b.score - a.score || b.streak - a.streak);
  rows.forEach((row, i) => {
    row.rank = i > 0 && rows[i - 1].score === row.score ? rows[i - 1].rank : i + 1;
  });
  return rows;
}

export default function ChallengeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const challenges = useChallenges();
  const challenge = challenges.data?.find((c) => c.id === id);

  if (challenges.isPending) return <Loading />;
  if (!challenge) {
    return (
      <Screen>
        <EmptyState emoji="🤷" title={t('challengeNotFound')} />
      </Screen>
    );
  }
  return <ChallengeDetails challenge={challenge} />;
}

function ChallengeDetails({ challenge }: { challenge: Challenge }) {
  const me = useMe();
  const theme = useTheme();
  const today = useToday();
  const qc = useQueryClient();
  const refreshHabits = useRefreshHabits();
  const details = useChallengeDetails(challenge);
  const friends = useFriends();
  const [showInvite, setShowInvite] = useState(false);

  const phase = phaseOf(challenge, today);
  const length = challengeLength(challenge);
  const elapsed = Math.max(0, Math.min(length, diffDays(challenge.start_date, today) + 1));
  const members = details.data?.members ?? [];
  const rows = details.data ? standings(challenge, members, details.data.index, today) : [];
  const pending = members.filter((m) => m.status === 'invited');
  const memberIds = new Set(members.map((m) => m.user_id));
  const invitable = (friends.data ?? []).filter((f) => f.status === 'friend' && !memberIds.has(f.user_id));
  const joined = challenge.my_status === 'joined';

  const refresh = () => {
    qc.invalidateQueries({ queryKey: qk.challenges });
    qc.invalidateQueries({ queryKey: qk.challenge(challenge.id) });
    refreshHabits();
  };

  const join = async () => {
    try {
      await joinChallenge(challenge.id);
      refresh();
    } catch {
      Alert.alert(t('error'));
    }
  };

  const leave = () =>
    Alert.alert(t('leaveChallenge'), t('leaveChallengeConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('leaveChallenge'),
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveChallenge(challenge.id);
            refresh();
            router.back();
          } catch {
            Alert.alert(t('error'));
          }
        },
      },
    ]);

  const invite = async (userId: string) => {
    try {
      await inviteToChallenge(challenge.id, [userId]);
      qc.invalidateQueries({ queryKey: qk.challenge(challenge.id) });
    } catch {
      Alert.alert(t('error'));
    }
  };

  return (
    <Screen refreshing={details.isRefetching} onRefresh={() => details.refetch()}>
      <View style={styles.hero}>
        <HabitIcon emoji={challenge.emoji} color={challenge.color} size={80} />
        <Txt variant="title" style={{ textAlign: 'center' }}>
          {challenge.title}
        </Txt>
        <Txt tone="secondary">
          {formatShortDate(challenge.start_date)} – {formatShortDate(challenge.end_date)} ·{' '}
          {challengeStatus(challenge, today)}
        </Txt>
      </View>

      {phase === 'active' ? (
        <View style={[styles.track, { backgroundColor: theme.empty }]}>
          <View style={{ width: `${(elapsed / length) * 100}%`, height: '100%', backgroundColor: challenge.color }} />
        </View>
      ) : null}

      {!joined ? (
        <Button title={t('join')} onPress={join} />
      ) : phase !== 'finished' ? (
        <Txt variant="footnote" tone="secondary" style={{ textAlign: 'center' }}>
          {t('checkInHint')}
        </Txt>
      ) : null}

      {phase === 'finished' && rows.length > 0 ? (
        <Card style={{ alignItems: 'center', gap: space.xs, backgroundColor: withAlpha(challenge.color, 0.15) }}>
          <Text style={{ fontSize: 44 }}>🏆</Text>
          <Txt variant="caption" tone="secondary">
            {t('winner')}
          </Txt>
          <Txt variant="title">
            {rows
              .filter((r) => r.rank === 1)
              .map((r) => (r.member.user_id === me.id ? t('you') : r.member.display_name))
              .join(', ')}
          </Txt>
          {joined ? (
            <Txt variant="footnote" tone="secondary" style={{ textAlign: 'center', marginTop: space.sm }}>
              {t('challengeOverHabitStays')}
            </Txt>
          ) : null}
        </Card>
      ) : null}

      <Section title={t('leaderboard')}>
        <Card style={{ gap: space.lg }}>
          {details.isPending ? <Txt tone="secondary">{t('loading')}</Txt> : null}
          {rows.map((row) => {
            const isMe = row.member.user_id === me.id;
            const total = phase === 'upcoming' ? length : Math.max(1, elapsed);
            return (
              <Pressable
                key={row.member.user_id}
                onPress={() => router.push(isMe ? '/profile' : `/user/${row.member.user_id}`)}
                style={styles.standing}>
                <Text style={styles.rank}>{MEDALS[row.rank - 1] ?? row.rank}</Text>
                <Avatar emoji={row.member.avatar} size={36} />
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={styles.standingTop}>
                    <Txt variant="headline" numberOfLines={1} style={{ flex: 1 }}>
                      {isMe ? t('you') : row.member.display_name}
                    </Txt>
                    {row.doneToday && phase === 'active' ? (
                      <Txt variant="caption" style={{ color: theme.success, fontWeight: '600' }}>
                        ✓ {t('today')}
                      </Txt>
                    ) : null}
                    <Txt variant="headline" style={{ fontVariant: ['tabular-nums'] }}>
                      {row.score}/{total}
                    </Txt>
                  </View>
                  <View style={[styles.bar, { backgroundColor: theme.empty }]}>
                    <View
                      style={{
                        width: `${Math.min(1, row.score / total) * 100}%`,
                        height: '100%',
                        borderRadius: 3,
                        backgroundColor: challenge.color,
                      }}
                    />
                  </View>
                </View>
              </Pressable>
            );
          })}
          {pending.map((m) => (
            <View key={m.user_id} style={[styles.standing, { opacity: 0.5 }]}>
              <Text style={styles.rank}>·</Text>
              <Avatar emoji={m.avatar} size={36} />
              <Txt style={{ flex: 1 }} numberOfLines={1}>
                {m.display_name}
              </Txt>
              <Txt variant="caption" tone="secondary">
                {t('invitePending')}
              </Txt>
            </View>
          ))}
        </Card>
      </Section>

      {joined && phase !== 'finished' ? (
        <View style={{ gap: space.sm }}>
          <Button
            title={t('shareCode')}
            icon="share-outline"
            onPress={() => shareChallenge(challenge.title, challenge.invite_code)}
          />
          <Pressable
            onPress={async () => {
              await Clipboard.setStringAsync(challenge.invite_code);
              Alert.alert(t('inviteLinkCopied'));
            }}
            style={[styles.code, { borderColor: theme.border }]}>
            <Txt variant="caption" tone="secondary">
              {t('enterCode')}
            </Txt>
            <Txt variant="title" style={{ letterSpacing: 4 }}>
              {challenge.invite_code}
            </Txt>
          </Pressable>
          {invitable.length > 0 ? (
            <Button
              title={t('inviteMore')}
              variant="secondary"
              icon="person-add-outline"
              onPress={() => setShowInvite(!showInvite)}
            />
          ) : null}
          {showInvite ? (
            <List>
              {invitable.map((f) => (
                <ListItem
                  key={f.user_id}
                  title={f.display_name}
                  left={<Avatar emoji={f.avatar} size={32} />}
                  chevron={false}
                  right={<Button title={t('invite')} variant="plain" onPress={() => invite(f.user_id)} />}
                />
              ))}
            </List>
          ) : null}
        </View>
      ) : null}

      <Button title={t('leaveChallenge')} variant="danger" onPress={leave} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.sm, paddingVertical: space.sm },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  standing: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  standingTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rank: { width: 28, fontSize: 20, textAlign: 'center', fontWeight: '700' },
  bar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  code: {
    alignItems: 'center',
    paddingVertical: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
});
