import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/ui';
import { ProgressRing } from '@/components/visuals';
import {
  addDays,
  addMonths,
  dayOfMonth,
  daysInMonth,
  isoWeekday,
  startOfMonth,
  type ISODate,
} from '@/lib/dates';
import { formatMonthYear, weekdayShort } from '@/lib/i18n';
import { isScheduled } from '@/lib/streaks';
import { space, useTheme, withAlpha } from '@/lib/theme';

/** The last 7 days with a progress ring each; today is on the right. */
export function WeekStrip({
  today,
  selected,
  onSelect,
  progress,
}: {
  today: ISODate;
  selected: ISODate;
  onSelect: (date: ISODate) => void;
  progress: (date: ISODate) => number;
}) {
  const theme = useTheme();
  const dates = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  return (
    <View style={styles.strip}>
      {dates.map((date) => {
        const isSelected = date === selected;
        return (
          <Pressable
            key={date}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(date)}
            style={styles.stripDay}>
            <Txt
              variant="footnote"
              tone={isSelected ? 'primary' : 'secondary'}
              style={{ fontWeight: isSelected ? '700' : '500' }}>
              {weekdayShort(isoWeekday(date))}
            </Txt>
            <ProgressRing progress={progress(date)} size={38} stroke={3.5} color={theme.success}>
              <View
                style={[
                  styles.stripNumber,
                  isSelected && { backgroundColor: theme.primary },
                ]}>
                <Txt
                  variant="callout"
                  style={{
                    fontWeight: '600',
                    color: isSelected ? theme.primaryText : theme.text,
                  }}>
                  {dayOfMonth(date)}
                </Txt>
              </View>
            </ProgressRing>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Month view of one habit; tap a past day to toggle it. */
export function MonthCalendar({
  today,
  dates,
  days,
  color,
  onToggle,
}: {
  today: ISODate;
  dates: Set<ISODate>;
  days: number[];
  color: string;
  onToggle?: (date: ISODate, done: boolean) => void;
}) {
  const theme = useTheme();
  const [month, setMonth] = useState(startOfMonth(today));
  const lead = isoWeekday(month) - 1;
  const total = daysInMonth(month);
  const cells: (ISODate | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: total }, (_, i) => addDays(month, i)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  const canGoForward = month < startOfMonth(today);

  return (
    <View style={{ gap: space.md }}>
      <View style={styles.monthHeader}>
        <Pressable hitSlop={12} onPress={() => setMonth(addMonths(month, -1))} accessibilityLabel="Previous month">
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <Txt variant="headline">{formatMonthYear(month)}</Txt>
        <Pressable
          hitSlop={12}
          disabled={!canGoForward}
          onPress={() => setMonth(addMonths(month, 1))}
          accessibilityLabel="Next month">
          <Ionicons name="chevron-forward" size={22} color={canGoForward ? theme.text : theme.textTertiary} />
        </Pressable>
      </View>
      <View style={styles.weekRow}>
        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
          <Txt key={d} variant="footnote" tone="secondary" style={styles.weekdayLabel}>
            {weekdayShort(d)}
          </Txt>
        ))}
      </View>
      {weeks.map((week, i) => (
        <View key={i} style={styles.weekRow}>
          {week.map((date, j) => {
            if (!date) return <View key={j} style={styles.cell} />;
            const done = dates.has(date);
            const future = date > today;
            const scheduled = isScheduled(days, date);
            return (
              <Pressable
                key={date}
                disabled={future || !onToggle}
                onPress={() => onToggle?.(date, !done)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: done, disabled: future }}
                style={styles.cell}>
                <View
                  style={[
                    styles.dayCircle,
                    done && { backgroundColor: color },
                    !done && scheduled && !future && { backgroundColor: withAlpha(color, 0.12) },
                    date === today && !done && { borderWidth: 2, borderColor: color },
                  ]}>
                  <Txt
                    variant="callout"
                    style={{
                      fontWeight: done ? '700' : '500',
                      color: done ? '#fff' : future || !scheduled ? theme.textTertiary : theme.text,
                    }}>
                    {dayOfMonth(date)}
                  </Txt>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', justifyContent: 'space-between' },
  stripDay: { alignItems: 'center', gap: 6, paddingVertical: 2 },
  stripNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xs,
  },
  weekRow: { flexDirection: 'row' },
  weekdayLabel: { flex: 1, textAlign: 'center' },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 3 },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
