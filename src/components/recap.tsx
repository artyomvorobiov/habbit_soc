import type { Ref } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatShortDate, plural, t } from '@/lib/i18n';
import type { DayState, Recap } from '@/lib/recap';

const MAX_HABITS = 6;

/** Shareable weekly summary (captured with react-native-view-shot). */
export function RecapCard({ ref, recap, username }: { ref?: Ref<View>; recap: Recap; username: string }) {
  const rows = recap.habits.slice(0, MAX_HABITS);
  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <Text style={styles.kicker}>{t('weeklyRecap').toUpperCase()}</Text>
      <Text style={styles.range}>
        {formatShortDate(recap.from)} – {formatShortDate(recap.to)}
      </Text>

      {recap.planned > 0 ? (
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.percent}>{Math.round(recap.rate * 100)}%</Text>
          <Text style={styles.label}>{t('recapDone')}</Text>
        </View>
      ) : (
        <Text style={[styles.label, { marginVertical: 24 }]}>{t('recapEmpty')}</Text>
      )}

      <View style={styles.stats}>
        <Stat value={String(recap.checkins)} label={plural('checkin', recap.checkins)} />
        <Stat value={`🔥 ${recap.bestStreak}`} label={plural('dayInRow', recap.bestStreak)} />
        <Stat value={String(recap.perfectDays)} label={plural('perfectDay', recap.perfectDays)} />
      </View>

      {rows.length > 0 ? (
        <View style={styles.habits}>
          {rows.map((row) => (
            <View key={row.habit.id} style={styles.habitRow}>
              <Text style={styles.habitEmoji}>{row.habit.emoji}</Text>
              <Text style={styles.habitName} numberOfLines={1}>
                {row.habit.name}
              </Text>
              <View style={styles.dots}>
                {row.days.map((state, i) => (
                  <Dot key={i} state={state} />
                ))}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.footer}>{t('shareCardFooter', { app: t('appName'), username })}</Text>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

function Dot({ state }: { state: DayState }) {
  return (
    <View
      style={[
        styles.dot,
        state === 'done' && { backgroundColor: '#fff' },
        state === 'missed' && { backgroundColor: 'rgba(255,255,255,0.28)' },
        (state === 'off' || state === 'future') && { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)' },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    width: 330,
    borderRadius: 32,
    borderCurve: 'continuous',
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 16,
    alignItems: 'center',
    backgroundColor: '#FF7A33',
    experimental_backgroundImage: 'linear-gradient(145deg, #FFB340 0%, #FF5E3A 55%, #FF2D55 100%)',
    overflow: 'hidden',
  },
  kicker: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 2, opacity: 0.9 },
  range: { color: '#fff', fontSize: 16, fontWeight: '600', marginTop: -10, opacity: 0.9 },
  percent: { color: '#fff', fontSize: 92, fontWeight: '900', lineHeight: 100, fontVariant: ['tabular-nums'] },
  label: { color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center' },
  stats: { flexDirection: 'row', alignSelf: 'stretch', gap: 8 },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  statValue: { color: '#fff', fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  statLabel: { color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center', opacity: 0.9 },
  habits: { alignSelf: 'stretch', gap: 8 },
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  habitEmoji: { fontSize: 18, width: 24, textAlign: 'center' },
  habitName: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '600' },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 11, height: 11, borderRadius: 6 },
  footer: { color: '#fff', fontSize: 13, fontWeight: '600', opacity: 0.85, textAlign: 'center' },
});
