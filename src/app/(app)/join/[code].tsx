import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { Loading } from '@/components/ui';
import { useJoinByCode } from '@/lib/actions';

/** Invite links: streakmates://join/<CODE> */
export default function JoinLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const join = useJoinByCode();
  useEffect(() => {
    join.run(code, false);
    // run once per code
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);
  return <Loading />;
}
