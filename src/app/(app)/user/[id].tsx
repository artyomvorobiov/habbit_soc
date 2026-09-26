import { useLocalSearchParams } from 'expo-router';

import { UserProfile } from '@/components/user-profile';

export default function UserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <UserProfile userId={id} />;
}
