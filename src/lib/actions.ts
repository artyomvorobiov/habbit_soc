import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { ApiError, joinChallengeByCode, sendFriendRequest, type FriendRequestResult } from './api';
import { t, type TKey } from './i18n';
import { qk, useRefreshHabits } from './queries';

// User actions that show their own feedback, shared by several screens.

const RESULT_TEXT: Record<FriendRequestResult, TKey> = {
  requested: 'requestSent',
  accepted: 'nowFriends',
  already_friends: 'alreadyFriends',
  already_requested: 'alreadyRequested',
};

/** Sends a friend request and tells the user what happened. */
export async function addFriend(username: string): Promise<boolean> {
  try {
    const result = await sendFriendRequest(username);
    Alert.alert(t(RESULT_TEXT[result]));
    return true;
  } catch (e) {
    const code = e instanceof ApiError ? e.code : 'unknown';
    Alert.alert(
      code === 'user_not_found' ? t('userNotFound') : code === 'cannot_add_self' ? t('cannotAddSelf') : t('error'),
    );
    return false;
  }
}

/** Joins a challenge by invite code and opens it. */
export function useJoinByCode() {
  const qc = useQueryClient();
  const refreshHabits = useRefreshHabits();
  const [busy, setBusy] = useState(false);

  const run = async (code: string, fromModal: boolean) => {
    setBusy(true);
    try {
      const id = await joinChallengeByCode(code);
      await qc.invalidateQueries({ queryKey: qk.challenges });
      refreshHabits();
      router.replace(`/challenge/${id}`);
    } catch (e) {
      const errorCode = e instanceof ApiError ? e.code : 'unknown';
      Alert.alert(
        errorCode === 'challenge_not_found'
          ? t('challengeNotFound')
          : errorCode === 'challenge_finished'
            ? t('challengeFinished')
            : t('error'),
      );
      if (!fromModal) router.back();
    } finally {
      setBusy(false);
    }
  };

  return { run, busy };
}
