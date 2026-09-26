import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { addDays, startOfWeek, type ISODate } from '@/lib/dates';
import { isScheduled } from '@/lib/streaks';
import { useTheme, withAlpha } from '@/lib/theme';

export function Avatar({ emoji, size = 40 }: { emoji: string; size?: number }) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.empty,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ fontSize: size * 0.55 }}>{emoji}</Text>
    </View>
  );
}

/** Emoji on a soft tile of the habit colour. */
export function HabitIcon({ emoji, color, size = 44 }: { emoji: string; color: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        borderCurve: 'continuous',
        backgroundColor: withAlpha(color, 0.18),
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
    </View>
  );
}

export function haptic(kind: 'light' | 'success' = 'light') {
  if (Platform.OS === 'web') return;
  if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** Round check button that fills with the habit colour. */
export function CheckButton({
  done,
  color,
  onPress,
  size = 40,
  disabled,
  accessibilityLabel,
}: {
  done: boolean;
  color: string;
  onPress: () => void;
  size?: number;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const [scale] = useState(() => new Animated.Value(1));

  const press = () => {
    haptic();
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.85, duration: 70, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done, disabled }}
      accessibilityLabel={accessibilityLabel}
      onPress={press}
      disabled={disabled}
      hitSlop={10}>
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: done ? 0 : 2.5,
          borderColor: withAlpha(color, 0.45),
          backgroundColor: done ? color : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.4 : 1,
          transform: [{ scale }],
        }}>
        {done ? <Ionicons name="checkmark" size={size * 0.6} color="#fff" /> : null}
        {!done && disabled ? <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: theme.textTertiary }} /> : null}
      </Animated.View>
    </Pressable>
  );
}

export function ProgressRing({
  progress,
  size = 64,
  stroke = 7,
  color,
  track,
  children,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  color: string;
  track?: string;
  children?: React.ReactNode;
}) {
  const theme = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track ?? theme.empty} strokeWidth={stroke} fill="none" />
        {p > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${c} ${c}`}
            strokeDashoffset={c * (1 - p)}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
      {children}
    </View>
  );
}

/**
 * GitHub-style activity grid: one column per week (Monday on top), newest week
 * on the right. `value(date)` returns 0…1, or null for days to leave empty.
 */
export function ActivityGrid({
  today,
  weeks = 16,
  color,
  value,
  cell = 12,
  gap = 3,
  emptyColor,
}: {
  today: ISODate;
  weeks?: number;
  color: string;
  value: (date: ISODate) => number | null;
  cell?: number;
  gap?: number;
  emptyColor?: string;
}) {
  const theme = useTheme();
  const firstMonday = addDays(startOfWeek(today), -7 * (weeks - 1));
  const columns = Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(firstMonday, w * 7 + d)),
  );
  return (
    <View style={{ flexDirection: 'row', gap }}>
      {columns.map((days, w) => (
        <View key={w} style={{ gap }}>
          {days.map((date) => {
            const future = date > today;
            const v = future ? null : value(date);
            return (
              <View
                key={date}
                style={{
                  width: cell,
                  height: cell,
                  borderRadius: cell / 4,
                  backgroundColor: future
                    ? 'transparent'
                    : v === null || v === 0
                      ? (emptyColor ?? theme.empty)
                      : withAlpha(color, 0.3 + 0.7 * v),
                }}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

/** Seven dots for the current week, used in compact lists. */
export function WeekDots({
  today,
  dates,
  days,
  color,
}: {
  today: ISODate;
  dates: Set<ISODate> | undefined;
  days: number[];
  color: string;
}) {
  const theme = useTheme();
  const monday = startOfWeek(today);
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {Array.from({ length: 7 }, (_, i) => {
        const date = addDays(monday, i);
        const done = dates?.has(date);
        const scheduled = isScheduled(days, date);
        return (
          <View
            key={date}
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: done ? color : scheduled && date <= today ? theme.empty : 'transparent',
              borderWidth: !done && (date > today || !scheduled) ? 1 : 0,
              borderColor: theme.empty,
              opacity: date > today ? 0.6 : 1,
            }}
          />
        );
      })}
    </View>
  );
}
