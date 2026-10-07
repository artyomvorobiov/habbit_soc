import type { ISODate } from './dates';

export type Visibility = 'private' | 'friends';

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar: string;
  created_at: string;
};

export type Habit = {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  color: string;
  /** ISO weekdays: 1 = Monday … 7 = Sunday */
  days: number[];
  visibility: Visibility;
  /** 'HH:MM:SS' local time or null */
  reminder_time: string | null;
  sort_order: number;
  archived_at: string | null;
  created_at: string;
};

export type HabitInput = Pick<Habit, 'name' | 'emoji' | 'color' | 'days' | 'visibility' | 'reminder_time'>;

export type Checkin = {
  habit_id: string;
  user_id: string;
  date: ISODate;
  /** storage path of the photo proof, '<user id>/<file>.jpg' */
  photo_path?: string | null;
  note?: string | null;
};

export type FriendStatus = 'friend' | 'incoming' | 'outgoing';

export type Friend = {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string;
  status: FriendStatus;
  since: string;
  best_streak: number;
};

export const REACTIONS = ['🔥', '👏', '💪', '❤️', '🎉'] as const;
export type ReactionEmoji = (typeof REACTIONS)[number];

export type FeedItem = {
  checkin_id: string;
  date: ISODate;
  created_at: string;
  streak: number;
  habit_id: string;
  habit_name: string;
  habit_emoji: string;
  habit_color: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar: string;
  reactions: Partial<Record<ReactionEmoji, number>>;
  my_reaction: ReactionEmoji | null;
  challenge_title: string | null;
  photo_path: string | null;
  note: string | null;
  /** signed link to the photo, added by the app */
  photo_url?: string;
};

export type Challenge = {
  id: string;
  title: string;
  emoji: string;
  color: string;
  start_date: ISODate;
  end_date: ISODate;
  invite_code: string;
  creator: string | null;
  my_status: 'invited' | 'joined';
  my_habit_id: string | null;
  member_count: number;
  invited_by: string | null;
  /** only check-ins with a photo count */
  proof_required: boolean;
  /** chat messages you have not seen yet */
  unread_count: number;
};

export type ChallengeMember = {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string;
  status: 'invited' | 'joined';
  habit_id: string | null;
  joined_at: string | null;
};

export type ChatMessage = {
  id: string;
  kind: 'text' | 'photo' | 'checkin' | 'joined';
  body: string | null;
  /** photo of the message, or of the check-in for 'checkin' messages */
  photo_path: string | null;
  note: string | null;
  checkin_date: ISODate | null;
  streak: number | null;
  created_at: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar: string;
  /** signed link to the photo, added by the app */
  photo_url?: string;
};

export type NotificationKind = 'reaction' | 'friend_request' | 'friend_accepted' | 'challenge_invite' | 'nudge';

export type AppNotification = {
  id: number;
  kind: NotificationKind;
  created_at: string;
  read_at: string | null;
  emoji: string | null;
  subject: string | null;
  checkin_id: string | null;
  challenge_id: string | null;
  actor_id: string | null;
  username: string | null;
  display_name: string | null;
  avatar: string | null;
};
