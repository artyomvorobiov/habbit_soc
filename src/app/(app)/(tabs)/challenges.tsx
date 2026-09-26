import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert, View } from 'react-native';

import { ChallengeCard, phaseOf } from '@/components/challenges';
import { Button, Card, EmptyState, IconButton, Section, TabScreen } from '@/components/ui';
import { joinChallenge, leaveChallenge } from '@/lib/api';
import { t } from '@/lib/i18n';
import { qk, useChallenges, useRefreshHabits, useToday } from '@/lib/queries';
import { space } from '@/lib/theme';
import type { Challenge } from '@/lib/types';

export default function ChallengesScreen() {
  const today = useToday();
  const query = useChallenges();
  const qc = useQueryClient();
  const refreshHabits = useRefreshHabits();

  const all = query.data ?? [];
  const invites = all.filter((c) => c.my_status === 'invited');
  const joined = all.filter((c) => c.my_status === 'joined');
  const active = joined.filter((c) => phaseOf(c, today) === 'active');
  const upcoming = joined.filter((c) => phaseOf(c, today) === 'upcoming');
  const finished = joined.filter((c) => phaseOf(c, today) === 'finished');

  const respond = async (c: Challenge, accept: boolean) => {
    try {
      if (accept) await joinChallenge(c.id);
      else await leaveChallenge(c.id);
      await qc.invalidateQueries({ queryKey: qk.challenges });
      refreshHabits();
      if (accept) router.push(`/challenge/${c.id}`);
    } catch {
      Alert.alert(t('error'));
    }
  };

  const list = (items: Challenge[]) => (
    <View style={{ gap: space.sm }}>
      {items.map((c) => (
        <ChallengeCard key={c.id} challenge={c} today={today} onPress={() => router.push(`/challenge/${c.id}`)} />
      ))}
    </View>
  );

  return (
    <TabScreen
      title={t('challenges')}
      right={
        <>
          <IconButton icon="ticket-outline" accessibilityLabel={t('joinByCode')} onPress={() => router.push('/join')} />
          <IconButton icon="add" accessibilityLabel={t('newChallenge')} onPress={() => router.push('/challenge/new')} />
        </>
      }
      refreshing={query.isRefetching}
      onRefresh={() => query.refetch()}>
      {invites.length > 0 ? (
        <Section title={t('invitations')}>
          {invites.map((c) => (
            <ChallengeCard key={c.id} challenge={c} today={today}>
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                <Button title={t('join')} onPress={() => respond(c, true)} style={{ flex: 1 }} />
                <Button title={t('decline')} variant="secondary" onPress={() => respond(c, false)} style={{ flex: 1 }} />
              </View>
            </ChallengeCard>
          ))}
        </Section>
      ) : null}

      {query.isSuccess && all.length === 0 ? (
        <Card>
          <EmptyState emoji="🏆" title={t('challengesEmptyTitle')} text={t('challengesEmptyText')}>
            <Button title={t('newChallenge')} icon="add" onPress={() => router.push('/challenge/new')} />
            <Button title={t('joinByCode')} variant="secondary" icon="ticket-outline" onPress={() => router.push('/join')} />
          </EmptyState>
        </Card>
      ) : null}

      {active.length > 0 ? <Section title={t('active')}>{list(active)}</Section> : null}
      {upcoming.length > 0 ? <Section title={t('upcoming')}>{list(upcoming)}</Section> : null}
      {finished.length > 0 ? <Section title={t('finished')}>{list(finished)}</Section> : null}
    </TabScreen>
  );
}
