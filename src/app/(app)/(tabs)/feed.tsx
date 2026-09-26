import { router } from 'expo-router';
import { View } from 'react-native';

import { FeedItem } from '@/components/social';
import { Button, Card, EmptyState, IconButton, ListItem, TabScreen } from '@/components/ui';
import { Avatar } from '@/components/visuals';
import { useMe } from '@/lib/auth';
import { countOf, t } from '@/lib/i18n';
import { useFeed, useFriends, useReact } from '@/lib/queries';
import { shareInvite } from '@/lib/share';
import { space } from '@/lib/theme';

export default function FeedScreen() {
  const me = useMe();
  const feed = useFeed();
  const friends = useFriends();
  const react = useReact();

  const items = feed.data?.pages.flat() ?? [];
  const incoming = friends.data?.filter((f) => f.status === 'incoming') ?? [];
  const friendCount = friends.data?.filter((f) => f.status === 'friend').length ?? 0;

  return (
    <TabScreen
      title={t('tabFeed')}
      subtitle={friends.data ? countOf('friend', friendCount) : undefined}
      right={
        <>
          <IconButton icon="share-outline" accessibilityLabel={t('inviteFriends')} onPress={() => shareInvite(me.username)} />
          <IconButton icon="person-add-outline" accessibilityLabel={t('addFriend')} onPress={() => router.push('/friends')} />
        </>
      }
      refreshing={feed.isRefetching}
      onRefresh={() => {
        feed.refetch();
        friends.refetch();
      }}>
      {incoming.length > 0 ? (
        <View style={{ borderRadius: 16, overflow: 'hidden' }}>
          <ListItem
            title={t('friendRequests')}
            subtitle={incoming.map((f) => f.display_name).join(', ')}
            left={<Avatar emoji={incoming[0].avatar} size={36} />}
            value={String(incoming.length)}
            onPress={() => router.push('/friends')}
          />
        </View>
      ) : null}

      {feed.isSuccess && items.length === 0 ? (
        <Card>
          <EmptyState emoji="👯" title={t('feedEmptyTitle')} text={t('feedEmptyText')}>
            <Button title={t('inviteFriends')} icon="share-outline" onPress={() => shareInvite(me.username)} />
            <Button title={t('findFriends')} variant="secondary" icon="search" onPress={() => router.push('/friends')} />
          </EmptyState>
        </Card>
      ) : null}

      <View style={{ gap: space.md }}>
        {items.map((item) => (
          <FeedItem
            key={item.checkin_id}
            item={item}
            isMine={item.user_id === me.id}
            onReact={(emoji) => react.mutate({ item, emoji })}
            onOpenUser={() =>
              item.user_id === me.id ? router.push('/profile') : router.push(`/user/${item.user_id}`)
            }
          />
        ))}
      </View>

      {feed.hasNextPage ? (
        <Button
          title={t('loadMore')}
          variant="secondary"
          loading={feed.isFetchingNextPage}
          onPress={() => feed.fetchNextPage()}
        />
      ) : null}
    </TabScreen>
  );
}
