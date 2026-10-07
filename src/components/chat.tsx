import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PhotoButton } from '@/components/photos';
import { Txt } from '@/components/ui';
import { Avatar } from '@/components/visuals';
import { diffDays, toISODate, type ISODate } from '@/lib/dates';
import { formatShortDate, t } from '@/lib/i18n';
import { radius, space, useTheme, withAlpha } from '@/lib/theme';
import type { ChatMessage } from '@/lib/types';

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Local calendar day of a message. */
export function messageDay(message: ChatMessage): ISODate {
  return toISODate(new Date(message.created_at));
}

export function DaySeparator({ day, today }: { day: ISODate; today: ISODate }) {
  const theme = useTheme();
  const label = day === today ? t('today') : diffDays(day, today) === 1 ? t('yesterday') : formatShortDate(day);
  return (
    <View style={styles.separator}>
      <Text style={[styles.separatorText, { color: theme.textSecondary, backgroundColor: theme.fill }]}>{label}</Text>
    </View>
  );
}

export function ChatMessageView({
  message,
  isMine,
  showAuthor,
  color,
  challengeStart,
  onLongPress,
}: {
  message: ChatMessage;
  isMine: boolean;
  /** first message of a run from the same person */
  showAuthor: boolean;
  color: string;
  challengeStart: ISODate;
  onLongPress?: () => void;
}) {
  const theme = useTheme();
  const name = isMine ? t('you') : message.display_name;

  if (message.kind === 'joined') {
    return (
      <Txt variant="footnote" tone="secondary" style={styles.system}>
        {t('chatJoined', { name })}
      </Txt>
    );
  }

  if (message.kind === 'checkin') {
    const day = message.checkin_date ? diffDays(challengeStart, message.checkin_date) + 1 : null;
    const late = message.checkin_date && message.checkin_date !== messageDay(message);
    return (
      <View style={[styles.checkin, { backgroundColor: withAlpha(color, 0.12), borderColor: withAlpha(color, 0.35) }]}>
        <View style={styles.checkinHeader}>
          <Avatar emoji={message.avatar} size={28} />
          <View style={{ flex: 1 }}>
            <Txt variant="callout" style={{ fontWeight: '600' }} numberOfLines={1}>
              {name}
            </Txt>
            <Txt variant="caption" tone="secondary">
              {day ? t('chatCheckin', { day }) : '✅'}
              {late ? ` · ${t('chatCheckinFor', { date: formatShortDate(message.checkin_date!) })}` : ''}
            </Txt>
          </View>
          {message.streak && message.streak > 1 ? (
            <Text style={[styles.streak, { color: theme.flame }]}>🔥 {message.streak}</Text>
          ) : null}
        </View>
        {message.photo_path ? (
          <PhotoButton path={message.photo_path} url={message.photo_url} caption={message.note} style={styles.checkinPhoto} />
        ) : null}
        {message.note ? <Txt variant="callout">{message.note}</Txt> : null}
        <Txt variant="footnote" tone="tertiary" style={{ alignSelf: 'flex-end' }}>
          {formatTime(message.created_at)}
        </Txt>
      </View>
    );
  }

  // a photo without a caption is shown without a bubble around it
  const plainPhoto = message.kind === 'photo' && !message.body;
  const bubbleColor = plainPhoto ? 'transparent' : isMine ? theme.primary : theme.card;
  const textColor = isMine ? theme.primaryText : theme.text;
  return (
    <View style={[styles.row, isMine ? styles.rowMine : null]}>
      {!isMine ? (
        <View style={styles.avatarSlot}>{showAuthor ? <Avatar emoji={message.avatar} size={30} /> : null}</View>
      ) : null}
      <View style={{ maxWidth: '78%', gap: 2, alignItems: isMine ? 'flex-end' : 'flex-start' }}>
        {showAuthor && !isMine ? (
          <Txt variant="caption" tone="secondary" style={{ marginLeft: space.sm }}>
            {message.display_name}
          </Txt>
        ) : null}
        <Pressable
          onLongPress={onLongPress}
          delayLongPress={350}
          style={[
            styles.bubble,
            { backgroundColor: bubbleColor },
            message.kind === 'photo' ? styles.photoBubble : null,
            plainPhoto ? { padding: 0 } : null,
          ]}>
          {message.photo_path ? (
            <PhotoButton path={message.photo_path} url={message.photo_url} caption={message.body} style={styles.photo} />
          ) : null}
          {message.body ? (
            <Text style={[styles.text, { color: textColor }, message.kind === 'photo' ? styles.caption : null]}>
              {message.body}
            </Text>
          ) : null}
          <Text
            style={[
              styles.time,
              { color: isMine && !plainPhoto ? withAlpha('#888888', 0.9) : theme.textTertiary },
              message.kind === 'photo' ? { paddingHorizontal: space.sm } : null,
            ]}>
            {formatTime(message.created_at)}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  separator: { alignItems: 'center', marginVertical: space.sm },
  separatorText: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: space.md,
    paddingVertical: 4,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  system: { textAlign: 'center', marginVertical: space.xs },
  checkin: {
    alignSelf: 'center',
    width: '86%',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.md,
    gap: space.sm,
    marginVertical: space.xs,
  },
  checkinHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  checkinPhoto: { width: '100%', aspectRatio: 1, borderRadius: radius.sm },
  streak: { fontSize: 15, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space.xs, marginVertical: 2 },
  rowMine: { justifyContent: 'flex-end' },
  avatarSlot: { width: 30 },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    gap: 2,
  },
  photoBubble: { padding: 4, overflow: 'hidden' },
  photo: { width: 220, height: 220, borderRadius: 14 },
  text: { fontSize: 16, lineHeight: 21 },
  caption: { paddingHorizontal: space.sm, paddingTop: space.xs },
  time: { fontSize: 11, alignSelf: 'flex-end' },
});
