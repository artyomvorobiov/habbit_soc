import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { phaseOf } from '@/components/challenges';
import { ChatMessageView, DaySeparator, messageDay } from '@/components/chat';
import { Button, EmptyState, Loading, Txt } from '@/components/ui';
import { haptic } from '@/components/visuals';
import { deleteChatMessage, markChatRead, sendChatMessage } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { confirm } from '@/lib/confirm';
import { t } from '@/lib/i18n';
import { choosePhoto, removePhotos, uploadPhoto } from '@/lib/photos';
import { proofKey, qk, useChallenges, useChat, useMyCheckins, useToday, useToggleCheckin } from '@/lib/queries';
import { radius, space, useTheme, withAlpha } from '@/lib/theme';
import type { Challenge, ChatMessage } from '@/lib/types';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const challenges = useChallenges();
  const challenge = challenges.data?.find((c) => c.id === id);
  if (challenges.isPending) return <Loading />;
  if (!challenge) return <EmptyState emoji="🤷" title={t('challengeNotFound')} />;
  return <Chat challenge={challenge} />;
}

function Chat({ challenge }: { challenge: Challenge }) {
  const me = useMe();
  const theme = useTheme();
  const today = useToday();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const chat = useChat(challenge.id);
  const checkins = useMyCheckins();
  const toggle = useToggleCheckin();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const messages = chat.data?.pages.flat() ?? [];
  const newestId = messages[0]?.id;
  const joined = challenge.my_status === 'joined';
  const active = phaseOf(challenge, today) === 'active';
  const myHabit = challenge.my_habit_id;
  // in photo-proof challenges a check-in without a photo doesn't count yet
  const doneToday =
    !!myHabit &&
    (challenge.proof_required
      ? !!checkins.proofs.get(proofKey(myHabit, today))?.photo_path
      : (checkins.index.get(myHabit)?.has(today) ?? false));

  // everything on screen counts as read
  useEffect(() => {
    markChatRead(challenge.id)
      .then(() => qc.invalidateQueries({ queryKey: qk.challenges }))
      .catch(() => undefined);
  }, [challenge.id, newestId, qc]);

  const refreshChat = () => qc.invalidateQueries({ queryKey: qk.chat(challenge.id) });

  const sendText = async () => {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      await sendChatMessage(challenge.id, { body });
      setText('');
      refreshChat();
    } catch {
      Alert.alert(t('error'));
    } finally {
      setSending(false);
    }
  };

  const sendPhoto = async () => {
    const photo = await choosePhoto();
    if (!photo) return;
    setSending(true);
    try {
      const photoPath = await uploadPhoto(me.id, photo);
      await sendChatMessage(challenge.id, { photoPath, body: text.trim() });
      setText('');
      refreshChat();
    } catch {
      Alert.alert(t('uploadFailed'));
    } finally {
      setSending(false);
    }
  };

  const remove = async (message: ChatMessage) => {
    if (!(await confirm(t('deleteMessage'), undefined, t('delete')))) return;
    try {
      await deleteChatMessage(message.id);
      await removePhotos([message.photo_path]);
      refreshChat();
    } catch {
      Alert.alert(t('error'));
    }
  };

  const checkIn = () => {
    if (!myHabit) return;
    haptic('success');
    toggle.mutate({ habitId: myHabit, date: today, done: true });
  };

  const openProof = () => {
    if (!myHabit) return;
    router.push({ pathname: '/proof/[habitId]', params: { habitId: myHabit, date: today } });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}>
      <Stack.Screen options={{ title: `${challenge.emoji} ${challenge.title}` }} />

      {joined && active && !doneToday && myHabit ? (
        <View style={[styles.banner, { backgroundColor: withAlpha(challenge.color, 0.14) }]}>
          <Txt variant="callout" style={{ flex: 1, fontWeight: '600' }}>
            {t('notCheckedInYet')}
          </Txt>
          {!challenge.proof_required ? (
            <Button title={`✓ ${t('checkInNow')}`} compact onPress={checkIn} />
          ) : null}
          <Button title={`📸 ${t('checkInWithPhoto')}`} compact variant="secondary" onPress={openProof} />
        </View>
      ) : null}

      {chat.isSuccess && messages.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState emoji="💬" title={t('chat')} text={t('chatEmpty')} />
        </View>
      ) : (
        <FlatList
          inverted
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: space.md, gap: space.xs }}
          keyboardShouldPersistTaps="handled"
          onEndReached={() => chat.hasNextPage && !chat.isFetchingNextPage && chat.fetchNextPage()}
          onEndReachedThreshold={0.3}
          ListFooterComponent={chat.isFetchingNextPage || chat.isPending ? <ActivityIndicator /> : null}
          renderItem={({ item, index }) => {
            // the list is upside down: the next item is the older message
            const older = messages[index + 1];
            const newDay = !older || messageDay(older) !== messageDay(item);
            const showAuthor =
              newDay || older.user_id !== item.user_id || older.kind === 'checkin' || older.kind === 'joined';
            const isMine = item.user_id === me.id;
            return (
              <View>
                {newDay ? <DaySeparator day={messageDay(item)} today={today} /> : null}
                <ChatMessageView
                  message={item}
                  isMine={isMine}
                  showAuthor={showAuthor}
                  color={challenge.color}
                  challengeStart={challenge.start_date}
                  onLongPress={isMine && (item.kind === 'text' || item.kind === 'photo') ? () => remove(item) : undefined}
                />
              </View>
            );
          }}
        />
      )}

      {joined ? (
        <View
          style={[
            styles.composer,
            { borderTopColor: theme.border, backgroundColor: theme.background, paddingBottom: insets.bottom + space.sm },
          ]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('addPhoto')}
            onPress={sendPhoto}
            disabled={sending}
            hitSlop={8}
            style={[styles.round, { backgroundColor: theme.fill }]}>
            <Ionicons name="camera" size={20} color={theme.text} />
          </Pressable>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t('messagePlaceholder')}
            placeholderTextColor={theme.textTertiary}
            multiline
            maxLength={1000}
            style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('send')}
            onPress={sendText}
            disabled={sending || !text.trim()}
            hitSlop={8}
            style={[styles.round, { backgroundColor: text.trim() ? challenge.color : theme.fill }]}>
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name="arrow-up" size={20} color={text.trim() ? '#fff' : theme.textTertiary} />
            )}
          </Pressable>
        </View>
      ) : (
        <View style={[styles.composer, { paddingBottom: insets.bottom + space.sm, justifyContent: 'center' }]}>
          <Txt tone="secondary">{t('joinToChat')}</Txt>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.md,
    marginTop: space.sm,
    padding: space.md,
    borderRadius: radius.md,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    fontSize: 16,
    paddingHorizontal: space.md,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
