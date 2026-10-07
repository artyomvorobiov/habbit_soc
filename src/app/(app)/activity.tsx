import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, EmptyState, Screen, Txt } from '@/components/ui';
import { Avatar } from '@/components/visuals';
import { markNotificationsRead } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { t, timeAgo } from '@/lib/i18n';
import { ensureNotificationPermission, notificationsAllowed } from '@/lib/notifications';
import { qk, useNotifications } from '@/lib/queries';
import { radius, space, useTheme, withAlpha } from '@/lib/theme';
import type { AppNotification } from '@/lib/types';

function describe(n: AppNotification): string {
  const name = n.display_name ?? t('someone');
  switch (n.kind) {
    case 'reaction':
      return t('nReaction', { name, emoji: n.emoji ?? '🔥', habit: n.subject ?? '' });
    case 'friend_request':
      return t('nFriendRequest', { name });
    case 'friend_accepted':
      return t('nFriendAccepted', { name });
    case 'challenge_invite':
      return t('nChallengeInvite', { name, title: n.subject ?? '' });
    case 'nudge':
      return n.subject ? t('nNudgeChallenge', { name, title: n.subject }) : t('nNudge', { name });
  }
}

function open(n: AppNotification) {
  switch (n.kind) {
    case 'reaction':
      router.push('/feed');
      break;
    case 'friend_request':
      router.push('/friends');
      break;
    case 'friend_accepted':
      if (n.actor_id) router.push(`/user/${n.actor_id}`);
      break;
    case 'challenge_invite':
      if (n.challenge_id) router.push(`/challenge/${n.challenge_id}`);
      break;
    case 'nudge':
      router.push(n.challenge_id ? `/challenge/${n.challenge_id}` : '/');
      break;
  }
}

export default function ActivityScreen() {
  const me = useMe();
  const theme = useTheme();
  const qc = useQueryClient();
  const notifications = useNotifications();
  const [openedAt] = useState(() => Date.now());
  const [allowed, setAllowed] = useState(true);

  useEffect(() => {
    notificationsAllowed().then(setAllowed);
  }, []);

  // seen = read; rows read during this visit stay highlighted until you leave
  const hasUnread = notifications.unread > 0;
  useEffect(() => {
    if (!hasUnread) return;
    markNotificationsRead()
      .then(() => qc.invalidateQueries({ queryKey: qk.notifications }))
      .catch(() => undefined);
  }, [hasUnread, qc]);

  const list = notifications.data ?? [];
  const isNew = (n: AppNotification) => !n.read_at || new Date(n.read_at).getTime() >= openedAt - 2000;

  return (
    <Screen refreshing={notifications.isRefetching} onRefresh={() => notifications.refetch()}>
      {!allowed && Platform.OS !== 'web' ? (
        <Card style={{ gap: space.sm }}>
          <Txt variant="headline">🔔 {t('enableNotifications')}</Txt>
          <Txt tone="secondary">{t('enableNotificationsText')}</Txt>
          <Button
            title={t('turnOn')}
            compact
            onPress={async () => setAllowed(await ensureNotificationPermission(me.id))}
          />
        </Card>
      ) : null}

      {notifications.isSuccess && list.length === 0 ? (
        <EmptyState emoji="🔔" title={t('inbox')} text={t('activityEmpty')} />
      ) : null}

      <View style={{ gap: space.sm }}>
        {list.map((n) => (
          <Pressable
            key={n.id}
            onPress={() => open(n)}
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: pressed
                  ? theme.cardPressed
                  : isNew(n)
                    ? withAlpha(theme.flame, 0.1)
                    : theme.card,
              },
            ]}>
            <Avatar emoji={n.avatar ?? '🙂'} size={40} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="callout">{describe(n)}</Txt>
              <Txt variant="caption" tone="secondary">
                {timeAgo(n.created_at)}
              </Txt>
            </View>
            {isNew(n) ? <View style={[styles.dot, { backgroundColor: theme.flame }]} /> : null}
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderCurve: 'continuous',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
