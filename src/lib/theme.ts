import { useColorScheme } from 'react-native';

const light = {
  background: '#F2F2F7',
  card: '#FFFFFF',
  cardPressed: '#E9E9EE',
  text: '#000000',
  textSecondary: '#6E6E73',
  textTertiary: '#AEAEB2',
  border: '#E5E5EA',
  /** primary button background (monochrome UI, habits bring the colour) */
  primary: '#000000',
  primaryText: '#FFFFFF',
  danger: '#FF3B30',
  flame: '#FF9500',
  success: '#34C759',
  empty: '#E5E5EA',
  /** neutral fill that reads on both the page and cards */
  fill: 'rgba(120,120,128,0.14)',
};

const dark: typeof light = {
  background: '#000000',
  card: '#1C1C1E',
  cardPressed: '#2C2C2E',
  text: '#FFFFFF',
  textSecondary: '#98989F',
  textTertiary: '#636366',
  border: '#38383A',
  primary: '#FFFFFF',
  primaryText: '#000000',
  danger: '#FF453A',
  flame: '#FF9F0A',
  success: '#30D158',
  empty: '#2C2C2E',
  fill: 'rgba(120,120,128,0.3)',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export const radius = { sm: 10, md: 16, lg: 22, full: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

/** iOS system colours, readable in light and dark mode. */
export const HABIT_COLORS = [
  '#FF3B30',
  '#FF9500',
  '#FFCC00',
  '#34C759',
  '#00C7BE',
  '#30B0C7',
  '#007AFF',
  '#5856D6',
  '#AF52DE',
  '#FF2D55',
  '#A2845E',
  '#8E8E93',
];

export const HABIT_EMOJIS = [
  '✅', '🏃', '💧', '📚', '🧘', '💪', '🥗', '😴', '🚭', '🍬', '🧠', '✍️',
  '🎸', '🇬🇧', '💊', '🚶', '🚴', '🏊', '🧹', '💰', '📵', '🌅', '🙏', '🦷',
  '🎨', '💻', '🌱', '☕️', '🍷', '🐶', '❤️', '⭐️',
];

export const AVATARS = [
  '🙂', '😎', '🦊', '🐻', '🐼', '🐯', '🦁', '🐸', '🐙', '🦄', '🐝', '🐧',
  '🐨', '🐵', '🦉', '🐳', '🌵', '🍀', '🔥', '⚡️', '🌈', '🚀', '👾', '🤖',
];

/** Adds transparency to a '#RRGGBB' colour. */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}
