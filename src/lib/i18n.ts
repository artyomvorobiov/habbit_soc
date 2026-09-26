import { getLocales } from 'expo-localization';

import { dayOfMonth, isoWeekday, monthIndex, year, type ISODate } from './dates';

// Simple two-language dictionary. The language follows the phone settings.
// To add a language: copy the `ru` object, translate it, and extend `pick()`.

const en = {
  appName: 'Streakmates',
  tagline: 'Habits worth showing off',

  // common
  cancel: 'Cancel',
  save: 'Save',
  done: 'Done',
  delete: 'Delete',
  edit: 'Edit',
  share: 'Share',
  continue: 'Continue',
  error: 'Something went wrong',
  tryAgain: 'Try again',
  loading: 'Loading…',
  today: 'Today',
  yesterday: 'Yesterday',
  you: 'You',

  // auth
  email: 'Email',
  password: 'Password',
  newPassword: 'New password',
  signIn: 'Sign in',
  signUp: 'Create account',
  noAccount: 'No account yet?',
  haveAccount: 'Already have an account?',
  forgotPassword: 'Forgot password?',
  sendCode: 'Send code',
  resetCodeSent: 'We sent a 6-digit code to {email}. Enter it below with a new password.',
  code: 'Code from the email',
  setPassword: 'Set password',
  checkEmail: 'Check your email and confirm the address, then sign in.',
  passwordTooShort: 'Password must be at least 6 characters',
  invalidEmail: 'Enter a valid email',
  backToSignIn: 'Back to sign in',

  // onboarding
  onboardingTitle: 'Who are you?',
  onboardingSubtitle: 'Friends will find you by your username.',
  displayName: 'Name',
  username: 'Username',
  usernameHint: '3–20 characters: a–z, 0–9 and _',
  usernameTaken: 'This username is taken',
  usernameInvalid: 'Use 3–20 characters: a–z, 0–9 and _',
  chooseAvatar: 'Avatar',
  letsGo: "Let's go",

  // tabs
  tabToday: 'Today',
  tabFeed: 'Friends',
  tabChallenges: 'Challenges',
  tabProfile: 'Profile',

  // today
  allDone: 'All done! 🎉',
  keepGoing: 'Keep going',
  goodStart: 'Good start',
  almostThere: 'Almost there',
  nothingToday: 'Nothing scheduled for this day',
  noHabitsTitle: 'Start with one habit',
  noHabitsText: 'Small steps every day. Pick an idea or create your own.',
  newHabit: 'New habit',
  ideas: 'Ideas',
  idea1: 'Drink water',
  idea2: 'Morning run',
  idea3: 'Read 10 pages',
  idea4: 'Meditate',
  idea5: 'No sugar',
  idea6: 'Sleep before 23:00',
  challengeBadge: 'Challenge',
  notPlanned: 'Not planned for this day',
  habits: 'Habits',
  invite: 'Invite',

  // habit form
  habitName: 'Name',
  habitNamePlaceholder: 'e.g. Morning run',
  icon: 'Icon',
  color: 'Color',
  schedule: 'Schedule',
  everyDay: 'Every day',
  weekdays: 'Weekdays',
  custom: 'Custom',
  visibility: 'Who can see it',
  visibilityFriends: 'Friends',
  visibilityPrivate: 'Only me',
  visibilityFriendsHint: 'Friends see your progress and can cheer you on',
  visibilityPrivateHint: 'Nobody but you sees this habit',
  reminder: 'Reminder',
  reminderHint: 'A notification on scheduled days',
  editHabit: 'Edit habit',
  pickEmoji: 'Or type any emoji',

  // habit details
  currentStreak: 'Current streak',
  bestStreak: 'Best streak',
  last30: 'Last 30 days',
  total: 'Total',
  shareStreak: 'Share progress',
  archive: 'Archive',
  unarchive: 'Restore',
  archived: 'Archived',
  archivedHabits: 'Archived habits',
  noArchived: 'No archived habits',
  deleteHabitTitle: 'Delete this habit?',
  deleteHabitText: 'All its history will be deleted. You can archive it instead.',
  habitNotFound: 'Habit not found',
  tapToMark: 'Tap a day to mark it',
  private: 'Private',

  // share card
  shareCardFooter: 'Join me on {app} — @{username}',
  shareInviteText:
    "I'm tracking habits on {app}. Add me as a friend: @{username}\n{link}",
  shareFailed: 'Could not share the image',

  // feed
  feedEmptyTitle: 'Better together',
  feedEmptyText: 'Add friends to see their streaks and cheer them on.',
  inviteFriends: 'Invite friends',
  findFriends: 'Find friends',
  friendRequests: 'Friend requests',
  milestone: 'Milestone!',
  inChallenge: 'Challenge: {title}',
  loadMore: 'Load more',

  // friends
  friends: 'Friends',
  addFriend: 'Add friend',
  searchByUsername: 'Search by username',
  noResults: 'Nobody found',
  requestSent: 'Request sent',
  nowFriends: 'You are now friends!',
  alreadyFriends: 'You are already friends',
  alreadyRequested: 'Request already sent',
  userNotFound: 'User not found',
  cannotAddSelf: "That's you 🙂",
  accept: 'Accept',
  decline: 'Decline',
  incoming: 'Wants to be friends',
  outgoing: 'Request sent',
  noFriendsYet: 'No friends yet',
  removeFriend: 'Remove friend',
  removeFriendConfirm: 'Remove {name} from friends?',
  block: 'Block',
  blockConfirm: 'Block {name}? You will no longer see each other.',
  report: 'Report',
  reportConfirm: 'Report {name} for inappropriate content?',
  reportSent: 'Thank you. We will review the report.',
  friendsOnlyHint: 'Add each other as friends to see habits.',
  noSharedHabits: 'No shared habits yet',
  challengeFriend: 'Challenge',
  cancelRequest: 'Cancel request',
  inviteLinkCopied: 'Link copied',
  myUsername: 'Your username',

  // challenges
  challenges: 'Challenges',
  newChallenge: 'New challenge',
  joinByCode: 'Join by code',
  enterCode: 'Invite code',
  join: 'Join',
  invitations: 'Invitations',
  active: 'Active',
  upcoming: 'Upcoming',
  finished: 'Finished',
  challengesEmptyTitle: 'Compete with friends',
  challengesEmptyText:
    'Pick one habit, invite friends and see who keeps it up longer. Every check-in counts.',
  challengeTitle: 'What are you competing in?',
  challengeTitlePlaceholder: 'e.g. 10 000 steps',
  duration: 'Duration',
  startDate: 'Start',
  startToday: 'Today',
  startTomorrow: 'Tomorrow',
  startMonday: 'Next Monday',
  inviteFriendsToChallenge: 'Invite friends',
  noFriendsToInvite: 'Add friends first — or share the invite code after creating.',
  createChallenge: 'Create challenge',
  invitedBy: '{name} invites you',
  participants: 'Participants',
  dayXofY: 'Day {x} of {y}',
  startsIn: 'Starts in {n}',
  daysLeft: '{n} left',
  endedOn: 'Ended {date}',
  leaderboard: 'Leaderboard',
  doneToday: 'Done today',
  invitePending: 'invited',
  shareCode: 'Share invite code',
  inviteCodeText:
    "Join my challenge \"{title}\" on {app}! Code: {code}\n{link}",
  leaveChallenge: 'Leave challenge',
  leaveChallengeConfirm: 'Leave this challenge? Your progress in it will be deleted.',
  challengeNotFound: 'Challenge not found',
  challengeFinished: 'This challenge has already finished',
  winner: 'Winner',
  challengeOverHabitStays:
    'The challenge is over. The habit stays in your list — keep the streak going or archive it.',
  inviteMore: 'Invite friends',
  checkInHint: 'Check in on the Today tab — every day counts.',

  // profile
  profile: 'Profile',
  settings: 'Settings',
  myHabits: 'My habits',
  checkins: 'Check-ins',
  successRate: 'Success, 30 d',
  bestNow: 'Best streak now',
  shareProfile: 'Invite friends',
  activity: 'Activity',

  // settings
  editProfile: 'Profile',
  notifications: 'Notifications',
  notificationsDenied:
    'Notifications are turned off. Enable them in the iPhone Settings → {app}.',
  openSettings: 'Open Settings',
  privacyPolicy: 'Privacy policy',
  support: 'Support',
  signOut: 'Sign out',
  deleteAccount: 'Delete account',
  deleteAccountConfirm:
    'Your account, habits and history will be deleted forever. This cannot be undone.',
  version: 'Version',
  saved: 'Saved',

  // reminders
  reminderTitle: '{emoji} {name}',
  reminderBody: 'Time to keep your streak going!',

  // config
  configTitle: 'Connect Supabase',
  configText:
    'Create a .env file in the project folder with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, then restart "npx expo start". See README.md.',
};

export type TKey = keyof typeof en;

const ru: Record<TKey, string> = {
  appName: 'Streakmates',
  tagline: 'Привычки, которыми хочется хвастаться',

  cancel: 'Отмена',
  save: 'Сохранить',
  done: 'Готово',
  delete: 'Удалить',
  edit: 'Изменить',
  share: 'Поделиться',
  continue: 'Продолжить',
  error: 'Что-то пошло не так',
  tryAgain: 'Повторить',
  loading: 'Загрузка…',
  today: 'Сегодня',
  yesterday: 'Вчера',
  you: 'Вы',

  email: 'Email',
  password: 'Пароль',
  newPassword: 'Новый пароль',
  signIn: 'Войти',
  signUp: 'Создать аккаунт',
  noAccount: 'Ещё нет аккаунта?',
  haveAccount: 'Уже есть аккаунт?',
  forgotPassword: 'Забыли пароль?',
  sendCode: 'Отправить код',
  resetCodeSent: 'Мы отправили 6-значный код на {email}. Введите его и новый пароль.',
  code: 'Код из письма',
  setPassword: 'Сохранить пароль',
  checkEmail: 'Проверьте почту и подтвердите адрес, затем войдите.',
  passwordTooShort: 'Пароль должен быть не короче 6 символов',
  invalidEmail: 'Введите корректный email',
  backToSignIn: 'Назад ко входу',

  onboardingTitle: 'Давайте знакомиться',
  onboardingSubtitle: 'Друзья найдут вас по никнейму.',
  displayName: 'Имя',
  username: 'Никнейм',
  usernameHint: '3–20 символов: a–z, 0–9 и _',
  usernameTaken: 'Этот никнейм уже занят',
  usernameInvalid: 'Используйте 3–20 символов: a–z, 0–9 и _',
  chooseAvatar: 'Аватар',
  letsGo: 'Поехали',

  tabToday: 'Сегодня',
  tabFeed: 'Друзья',
  tabChallenges: 'Челленджи',
  tabProfile: 'Профиль',

  allDone: 'Всё сделано! 🎉',
  keepGoing: 'Так держать',
  goodStart: 'Хорошее начало',
  almostThere: 'Почти всё',
  nothingToday: 'На этот день ничего не запланировано',
  noHabitsTitle: 'Начните с одной привычки',
  noHabitsText: 'Маленькие шаги каждый день. Выберите идею или создайте свою.',
  newHabit: 'Новая привычка',
  ideas: 'Идеи',
  idea1: 'Пить воду',
  idea2: 'Утренняя пробежка',
  idea3: 'Читать 10 страниц',
  idea4: 'Медитация',
  idea5: 'Без сахара',
  idea6: 'Спать до 23:00',
  challengeBadge: 'Челлендж',
  notPlanned: 'Не запланировано на этот день',
  habits: 'Привычки',
  invite: 'Позвать',

  habitName: 'Название',
  habitNamePlaceholder: 'Например, пробежка',
  icon: 'Иконка',
  color: 'Цвет',
  schedule: 'Расписание',
  everyDay: 'Каждый день',
  weekdays: 'Будни',
  custom: 'Свои дни',
  visibility: 'Кто видит',
  visibilityFriends: 'Друзья',
  visibilityPrivate: 'Только я',
  visibilityFriendsHint: 'Друзья видят ваш прогресс и могут поддержать',
  visibilityPrivateHint: 'Эту привычку не видит никто, кроме вас',
  reminder: 'Напоминание',
  reminderHint: 'Уведомление в дни по расписанию',
  editHabit: 'Изменить привычку',
  pickEmoji: 'Или введите любой эмодзи',

  currentStreak: 'Текущая серия',
  bestStreak: 'Лучшая серия',
  last30: 'За 30 дней',
  total: 'Всего',
  shareStreak: 'Поделиться прогрессом',
  archive: 'В архив',
  unarchive: 'Вернуть',
  archived: 'В архиве',
  archivedHabits: 'Архив привычек',
  noArchived: 'В архиве пусто',
  deleteHabitTitle: 'Удалить привычку?',
  deleteHabitText: 'Вся история будет удалена. Вместо этого можно отправить её в архив.',
  habitNotFound: 'Привычка не найдена',
  tapToMark: 'Нажмите на день, чтобы отметить',
  private: 'Личная',

  shareCardFooter: 'Присоединяйся в {app} — @{username}',
  shareInviteText:
    'Я отслеживаю привычки в {app}. Добавляй меня в друзья: @{username}\n{link}',
  shareFailed: 'Не получилось поделиться картинкой',

  feedEmptyTitle: 'Вместе веселее',
  feedEmptyText: 'Добавьте друзей, чтобы видеть их серии и поддерживать их.',
  inviteFriends: 'Пригласить друзей',
  findFriends: 'Найти друзей',
  friendRequests: 'Заявки в друзья',
  milestone: 'Рекорд!',
  inChallenge: 'Челлендж: {title}',
  loadMore: 'Показать ещё',

  friends: 'Друзья',
  addFriend: 'Добавить в друзья',
  searchByUsername: 'Поиск по никнейму',
  noResults: 'Никого не нашли',
  requestSent: 'Заявка отправлена',
  nowFriends: 'Теперь вы друзья!',
  alreadyFriends: 'Вы уже друзья',
  alreadyRequested: 'Заявка уже отправлена',
  userNotFound: 'Пользователь не найден',
  cannotAddSelf: 'Это же вы 🙂',
  accept: 'Принять',
  decline: 'Отклонить',
  incoming: 'Хочет дружить',
  outgoing: 'Заявка отправлена',
  noFriendsYet: 'Пока нет друзей',
  removeFriend: 'Удалить из друзей',
  removeFriendConfirm: 'Удалить {name} из друзей?',
  block: 'Заблокировать',
  blockConfirm: 'Заблокировать {name}? Вы перестанете видеть друг друга.',
  report: 'Пожаловаться',
  reportConfirm: 'Пожаловаться на {name} за неприемлемый контент?',
  reportSent: 'Спасибо. Мы рассмотрим жалобу.',
  friendsOnlyHint: 'Добавьте друг друга в друзья, чтобы видеть привычки.',
  noSharedHabits: 'Пока нет открытых привычек',
  challengeFriend: 'Вызвать',
  cancelRequest: 'Отменить заявку',
  inviteLinkCopied: 'Ссылка скопирована',
  myUsername: 'Ваш никнейм',

  challenges: 'Челленджи',
  newChallenge: 'Новый челлендж',
  joinByCode: 'Войти по коду',
  enterCode: 'Код приглашения',
  join: 'Участвовать',
  invitations: 'Приглашения',
  active: 'Идут сейчас',
  upcoming: 'Скоро',
  finished: 'Завершённые',
  challengesEmptyTitle: 'Соревнуйтесь с друзьями',
  challengesEmptyText:
    'Выберите одну привычку, позовите друзей и узнайте, кто продержится дольше. Каждая отметка — очко.',
  challengeTitle: 'В чём соревнуемся?',
  challengeTitlePlaceholder: 'Например, 10 000 шагов',
  duration: 'Длительность',
  startDate: 'Старт',
  startToday: 'Сегодня',
  startTomorrow: 'Завтра',
  startMonday: 'С понедельника',
  inviteFriendsToChallenge: 'Позвать друзей',
  noFriendsToInvite: 'Сначала добавьте друзей — или поделитесь кодом после создания.',
  createChallenge: 'Создать челлендж',
  invitedBy: '{name} зовёт вас',
  participants: 'Участники',
  dayXofY: 'День {x} из {y}',
  startsIn: 'Старт через {n}',
  daysLeft: 'Осталось {n}',
  endedOn: 'Завершён {date}',
  leaderboard: 'Таблица лидеров',
  doneToday: 'Сегодня выполнено',
  invitePending: 'приглашён',
  shareCode: 'Поделиться кодом',
  inviteCodeText:
    'Присоединяйся к моему челленджу «{title}» в {app}! Код: {code}\n{link}',
  leaveChallenge: 'Выйти из челленджа',
  leaveChallengeConfirm: 'Выйти из челленджа? Ваш прогресс в нём будет удалён.',
  challengeNotFound: 'Челлендж не найден',
  challengeFinished: 'Этот челлендж уже закончился',
  winner: 'Победитель',
  challengeOverHabitStays:
    'Челлендж завершён. Привычка остаётся в вашем списке — продолжайте серию или отправьте её в архив.',
  inviteMore: 'Позвать друзей',
  checkInHint: 'Отмечайтесь на вкладке «Сегодня» — важен каждый день.',

  profile: 'Профиль',
  settings: 'Настройки',
  myHabits: 'Мои привычки',
  checkins: 'Отметок',
  successRate: 'Успех, 30 дн.',
  bestNow: 'Лучшая серия',
  shareProfile: 'Позвать друзей',
  activity: 'Активность',

  editProfile: 'Профиль',
  notifications: 'Уведомления',
  notificationsDenied:
    'Уведомления выключены. Включите их в Настройках iPhone → {app}.',
  openSettings: 'Открыть настройки',
  privacyPolicy: 'Политика конфиденциальности',
  support: 'Поддержка',
  signOut: 'Выйти',
  deleteAccount: 'Удалить аккаунт',
  deleteAccountConfirm:
    'Аккаунт, привычки и вся история будут удалены навсегда. Это нельзя отменить.',
  version: 'Версия',
  saved: 'Сохранено',

  reminderTitle: '{emoji} {name}',
  reminderBody: 'Время продолжить серию!',

  configTitle: 'Подключите Supabase',
  configText:
    'Создайте файл .env в папке проекта с EXPO_PUBLIC_SUPABASE_URL и EXPO_PUBLIC_SUPABASE_ANON_KEY и перезапустите «npx expo start». Подробности в README.md.',
};

type Lang = 'en' | 'ru';

function pick(): Lang {
  try {
    return getLocales()[0]?.languageCode === 'ru' ? 'ru' : 'en';
  } catch {
    return 'en';
  }
}

export const lang: Lang = pick();
const dict = lang === 'ru' ? ru : en;

export function t(key: TKey, params?: Record<string, string | number>): string {
  let s = dict[key];
  if (params) {
    for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v));
  }
  return s;
}

// ---------------------------------------------------------------- plurals

const pluralWords = {
  en: {
    day: ['day', 'days'],
    friend: ['friend', 'friends'],
    participant: ['participant', 'participants'],
    habit: ['habit', 'habits'],
    dayInRow: ['day in a row', 'days in a row'],
  },
  ru: {
    day: ['день', 'дня', 'дней'],
    friend: ['друг', 'друга', 'друзей'],
    participant: ['участник', 'участника', 'участников'],
    habit: ['привычка', 'привычки', 'привычек'],
    dayInRow: ['день подряд', 'дня подряд', 'дней подряд'],
  },
} as const;

export type PluralWord = keyof (typeof pluralWords)['en'];

export function plural(word: PluralWord, n: number): string {
  if (lang === 'ru') {
    const [one, few, many] = pluralWords.ru[word];
    const n10 = n % 10;
    const n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return one;
    if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
    return many;
  }
  const [one, other] = pluralWords.en[word];
  return n === 1 ? one : other;
}

/** "5 days" / "5 дней" */
export function countOf(word: PluralWord, n: number): string {
  return `${n} ${plural(word, n)}`;
}

// ---------------------------------------------------------------- dates

const WEEKDAYS = {
  en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  ru: ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'],
};
const WEEKDAYS_SHORT = {
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
  ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
};
const MONTHS = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
};
const MONTHS_GENITIVE = {
  en: MONTHS.en,
  ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
};
const MONTHS_SHORT = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  ru: ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
};

/** Short weekday name for an ISO weekday (1 = Monday). */
export function weekdayShort(isoDay: number): string {
  return WEEKDAYS_SHORT[lang][isoDay - 1];
}

/** "Friday, 26 September" */
export function formatLongDate(date: ISODate): string {
  const wd = WEEKDAYS[lang][isoWeekday(date) - 1];
  const m = MONTHS_GENITIVE[lang][monthIndex(date)];
  return lang === 'ru'
    ? `${wd}, ${dayOfMonth(date)} ${m}`
    : `${wd}, ${m} ${dayOfMonth(date)}`;
}

/** "26 Sep" */
export function formatShortDate(date: ISODate): string {
  const m = MONTHS_SHORT[lang][monthIndex(date)];
  return lang === 'ru' ? `${dayOfMonth(date)} ${m}` : `${m} ${dayOfMonth(date)}`;
}

/** "September 2026" */
export function formatMonthYear(date: ISODate): string {
  return `${MONTHS[lang][monthIndex(date)]} ${year(date)}`;
}

/** Compact relative time: "now", "5m", "3h", "2d". */
export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  const units = lang === 'ru' ? ['сейчас', 'мин', 'ч', 'д'] : ['now', 'm', 'h', 'd'];
  if (s < 60) return units[0];
  if (s < 3600) return `${Math.floor(s / 60)} ${units[1]}`;
  if (s < 86400) return `${Math.floor(s / 3600)} ${units[2]}`;
  return `${Math.floor(s / 86400)} ${units[3]}`;
}

/** "Mo · We · Fr", or "Every day". */
export function formatDays(days: number[]): string {
  const sorted = [...days].sort();
  if (sorted.length === 7) return t('everyDay');
  if (sorted.join() === '1,2,3,4,5') return t('weekdays');
  return sorted.map(weekdayShort).join(' · ');
}
