import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { t } from '@/lib/i18n';
import { useChallenges, useFriends } from '@/lib/queries';
import { useTheme } from '@/lib/theme';

export default function TabsLayout() {
  const theme = useTheme();
  const friends = useFriends();
  const challenges = useChallenges();
  const requests = friends.data?.filter((f) => f.status === 'incoming').length ?? 0;
  const invites = challenges.data?.filter((c) => c.my_status === 'invited').length ?? 0;

  return (
    <NativeTabs tintColor={theme.text} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{t('tabToday')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'checkmark.circle', selected: 'checkmark.circle.fill' }} md="check_circle" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="feed">
        <NativeTabs.Trigger.Label>{t('tabFeed')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} md="group" />
        {requests > 0 ? <NativeTabs.Trigger.Badge>{String(requests)}</NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="challenges">
        <NativeTabs.Trigger.Label>{t('tabChallenges')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'trophy', selected: 'trophy.fill' }} md="emoji_events" />
        {invites > 0 ? <NativeTabs.Trigger.Badge>{String(invites)}</NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>{t('tabProfile')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
