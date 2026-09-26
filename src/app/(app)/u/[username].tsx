import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';

import { EmptyState, Loading, Screen } from '@/components/ui';
import { UserProfile } from '@/components/user-profile';
import { getProfileByUsername } from '@/lib/api';
import { t } from '@/lib/i18n';

/** Invite links: streakmates://u/<username> */
export default function UsernameLink() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const profile = useQuery({
    queryKey: ['username', username],
    queryFn: () => getProfileByUsername(username),
  });

  if (profile.isPending) return <Loading />;
  if (!profile.data) {
    return (
      <Screen>
        <EmptyState emoji="🤷" title={t('userNotFound')} />
      </Screen>
    );
  }
  return <UserProfile userId={profile.data.id} />;
}
