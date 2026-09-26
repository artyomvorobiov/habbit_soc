import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import { Streak } from '@/components/habits';
import { Button, Input, List, ListItem, Screen, Section, Txt } from '@/components/ui';
import { Avatar } from '@/components/visuals';
import { addFriend } from '@/lib/actions';
import { removeFriend, respondFriendRequest, searchProfiles } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { profileLink } from '@/lib/config';
import { t } from '@/lib/i18n';
import { qk, useFriends } from '@/lib/queries';
import { shareInvite } from '@/lib/share';
import { space } from '@/lib/theme';
import type { Friend } from '@/lib/types';

export default function Friends() {
  const me = useMe();
  const qc = useQueryClient();
  const friends = useFriends();
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setQuery(text), 300);
    return () => clearTimeout(timer);
  }, [text]);

  const search = useQuery({
    queryKey: ['search', query],
    queryFn: () => searchProfiles(query, me.id),
    enabled: query.trim().length >= 2,
  });

  const all = friends.data ?? [];
  const byId = new Map(all.map((f) => [f.user_id, f]));
  const incoming = all.filter((f) => f.status === 'incoming');
  const outgoing = all.filter((f) => f.status === 'outgoing');
  const accepted = all.filter((f) => f.status === 'friend').sort((a, b) => b.best_streak - a.best_streak);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: qk.friends });
    qc.invalidateQueries({ queryKey: qk.feed });
  };

  const respond = async (f: Friend, accept: boolean) => {
    try {
      await respondFriendRequest(f.user_id, accept);
      refresh();
    } catch {
      Alert.alert(t('error'));
    }
  };

  const cancel = async (f: Friend) => {
    try {
      await removeFriend(f.user_id);
      refresh();
    } catch {
      Alert.alert(t('error'));
    }
  };

  const statusLabel = (f: Friend | undefined) =>
    f?.status === 'friend' ? '✓' : f?.status === 'outgoing' ? t('outgoing') : f?.status === 'incoming' ? t('incoming') : null;

  return (
    <Screen refreshing={friends.isRefetching} onRefresh={() => friends.refetch()}>
      <Input
        value={text}
        onChangeText={setText}
        placeholder={`🔍 ${t('searchByUsername')}`}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />

      {query.trim().length >= 2 ? (
        search.data && search.data.length > 0 ? (
          <List>
            {search.data.map((p) => {
              const status = statusLabel(byId.get(p.id));
              return (
                <ListItem
                  key={p.id}
                  title={p.display_name}
                  subtitle={`@${p.username}`}
                  left={<Avatar emoji={p.avatar} size={36} />}
                  onPress={() => router.push(`/user/${p.id}`)}
                  chevron={false}
                  right={
                    status ? (
                      <Txt variant="caption" tone="secondary">
                        {status}
                      </Txt>
                    ) : (
                      <Button
                        title={t('addFriend')}
                        variant="plain"
                        onPress={async () => {
                          if (await addFriend(p.username)) refresh();
                        }}
                      />
                    )
                  }
                />
              );
            })}
          </List>
        ) : search.isSuccess ? (
          <Txt tone="secondary" style={{ textAlign: 'center' }}>
            {t('noResults')}
          </Txt>
        ) : null
      ) : null}

      {incoming.length > 0 ? (
        <Section title={t('friendRequests')}>
          <List>
            {incoming.map((f) => (
              <ListItem
                key={f.user_id}
                title={f.display_name}
                subtitle={`@${f.username}`}
                left={<Avatar emoji={f.avatar} size={36} />}
                onPress={() => router.push(`/user/${f.user_id}`)}
                chevron={false}
                right={
                  <View style={{ flexDirection: 'row' }}>
                    <Button title={t('accept')} variant="plain" onPress={() => respond(f, true)} />
                    <Button title="✕" variant="plain" onPress={() => respond(f, false)} />
                  </View>
                }
              />
            ))}
          </List>
        </Section>
      ) : null}

      <Section title={t('friends')}>
        {accepted.length > 0 ? (
          <List>
            {accepted.map((f) => (
              <ListItem
                key={f.user_id}
                title={f.display_name}
                subtitle={`@${f.username}`}
                left={<Avatar emoji={f.avatar} size={36} />}
                right={<Streak value={f.best_streak} />}
                onPress={() => router.push(`/user/${f.user_id}`)}
              />
            ))}
          </List>
        ) : friends.isSuccess ? (
          <Txt tone="secondary" style={{ paddingHorizontal: space.xs }}>
            {t('noFriendsYet')}
          </Txt>
        ) : null}
      </Section>

      {outgoing.length > 0 ? (
        <Section title={t('outgoing')}>
          <List>
            {outgoing.map((f) => (
              <ListItem
                key={f.user_id}
                title={f.display_name}
                subtitle={`@${f.username}`}
                left={<Avatar emoji={f.avatar} size={36} />}
                chevron={false}
                right={<Button title={t('cancelRequest')} variant="plain" onPress={() => cancel(f)} />}
              />
            ))}
          </List>
        </Section>
      ) : null}

      <Section title={t('myUsername')}>
        <List>
          <ListItem
            title={`@${me.username}`}
            icon="copy-outline"
            chevron={false}
            onPress={async () => {
              await Clipboard.setStringAsync(profileLink(me.username));
              Alert.alert(t('inviteLinkCopied'));
            }}
          />
          <ListItem icon="share-outline" title={t('inviteFriends')} onPress={() => shareInvite(me.username)} />
        </List>
      </Section>
    </Screen>
  );
}
