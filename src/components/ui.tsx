import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, space, useTheme } from '@/lib/theme';

// ---------------------------------------------------------------- text

const variants = StyleSheet.create({
  largeTitle: { fontSize: 34, fontWeight: '700', letterSpacing: 0.3 },
  title: { fontSize: 22, fontWeight: '700' },
  headline: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 17 },
  callout: { fontSize: 15 },
  caption: { fontSize: 13 },
  footnote: { fontSize: 12 },
});

type Tone = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'inverse';

export function Txt({
  variant = 'body',
  tone = 'primary',
  style,
  ...rest
}: TextProps & { variant?: keyof typeof variants; tone?: Tone }) {
  const theme = useTheme();
  const color = {
    primary: theme.text,
    secondary: theme.textSecondary,
    tertiary: theme.textTertiary,
    danger: theme.danger,
    inverse: theme.primaryText,
  }[tone];
  return <Text style={[variants[variant], { color }, style]} {...rest} />;
}

// ---------------------------------------------------------------- layout

/** Scrollable screen for stack screens (with a native header). */
export function Screen({
  children,
  refreshing,
  onRefresh,
  contentStyle,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        { padding: space.lg, paddingBottom: insets.bottom + space.xxl, gap: space.lg },
        contentStyle,
      ]}
      refreshControl={
        onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined
      }>
      {children}
    </ScrollView>
  );
}

/** Screen inside a tab: large title header, pull to refresh. */
export function TabScreen({
  title,
  subtitle,
  right,
  children,
  refreshing,
  onRefresh,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        // on the web the tab bar sits at the top of the page
        paddingTop: insets.top + space.md + (Platform.OS === 'web' ? 64 : 0),
        paddingHorizontal: space.lg,
        paddingBottom: insets.bottom + 100,
        gap: space.lg,
      }}
      refreshControl={
        onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined
      }>
      <View style={styles.tabHeader}>
        <View style={{ flex: 1 }}>
          <Txt variant="largeTitle">{title}</Txt>
          {subtitle ? (
            <Txt variant="callout" tone="secondary">
              {subtitle}
            </Txt>
          ) : null}
        </View>
        {right ? <View style={styles.tabHeaderRight}>{right}</View> : null}
      </View>
      {children}
    </ScrollView>
  );
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const theme = useTheme();
  if (!onPress) {
    return <View style={[styles.card, { backgroundColor: theme.card }, style]}>{children}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: pressed ? theme.cardPressed : theme.card },
        style,
      ]}>
      {children}
    </Pressable>
  );
}

export function Section({
  title,
  right,
  children,
}: {
  title?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={{ gap: space.sm }}>
      {title || right ? (
        <View style={styles.sectionHeader}>
          <Txt variant="footnote" tone="secondary" style={styles.sectionTitle}>
            {title}
          </Txt>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

// ---------------------------------------------------------------- controls

type IconName = ComponentProps<typeof Ionicons>['name'];

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  compact,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'plain';
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const bg = {
    primary: theme.primary,
    secondary: theme.fill,
    danger: theme.fill,
    plain: 'transparent',
  }[variant];
  const fg = {
    primary: theme.primaryText,
    secondary: theme.text,
    danger: theme.danger,
    plain: theme.text,
  }[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
        variant === 'plain' && { paddingVertical: space.sm },
        compact && { minHeight: 42, paddingHorizontal: space.md },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={compact ? 17 : 19} color={fg} /> : null}
          <Text numberOfLines={1} style={[styles.buttonText, { color: fg }, compact && { fontSize: 15 }]}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  badge,
}: {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  badge?: number;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor: pressed ? theme.cardPressed : theme.card },
      ]}>
      <Ionicons name={icon} size={20} color={theme.text} />
      {badge ? (
        <View style={[styles.badge, { backgroundColor: theme.danger }]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export const Input = function Input({ style, ...props }: TextInputProps) {
  const theme = useTheme();
  return (
    <TextInput
      placeholderTextColor={theme.textTertiary}
      style={[styles.input, { backgroundColor: theme.card, color: theme.text }, style]}
      {...props}
    />
  );
};

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Txt variant="footnote" tone="secondary" style={styles.sectionTitle}>
        {label}
      </Txt>
      {children}
      {hint ? (
        <Txt variant="footnote" tone="secondary" style={{ paddingHorizontal: space.xs }}>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

/** A row in a grouped list (settings style). */
export function ListItem({
  title,
  subtitle,
  value,
  icon,
  left,
  onPress,
  destructive,
  chevron = !!onPress,
  right,
}: {
  title: string;
  subtitle?: string;
  value?: string;
  icon?: IconName;
  left?: ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  chevron?: boolean;
  right?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.listItem,
        { backgroundColor: pressed ? theme.cardPressed : theme.card },
      ]}>
      {icon ? <Ionicons name={icon} size={20} color={destructive ? theme.danger : theme.text} /> : null}
      {left}
      <View style={{ flex: 1 }}>
        <Txt variant="body" tone={destructive ? 'danger' : 'primary'} numberOfLines={1}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt variant="caption" tone="secondary" numberOfLines={1}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {value ? <Txt tone="secondary">{value}</Txt> : null}
      {right}
      {chevron ? <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} /> : null}
    </Pressable>
  );
}

/** Groups ListItems into one rounded block with separators. */
export function List({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const items = (Array.isArray(children) ? children : [children]).flat().filter(Boolean);
  return (
    <View style={[styles.list, { backgroundColor: theme.card }]}>
      {items.map((child, i) => (
        <View key={i}>
          {i > 0 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.border, marginLeft: space.lg }} /> : null}
          {child}
        </View>
      ))}
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: theme.border }]}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, selected && { backgroundColor: theme.card }]}>
            <Txt variant="callout" style={{ fontWeight: selected ? '600' : '400' }}>
              {o.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  color,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  const theme = useTheme();
  const accent = color ?? theme.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.chip,
        { backgroundColor: selected ? accent : theme.card, borderColor: selected ? accent : theme.border },
      ]}>
      <Txt variant="callout" style={{ color: selected ? (color ? '#fff' : theme.primaryText) : theme.text }}>
        {label}
      </Txt>
    </Pressable>
  );
}

// ---------------------------------------------------------------- states

export function EmptyState({
  emoji,
  title,
  text,
  children,
}: {
  emoji: string;
  title: string;
  text?: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <Text style={{ fontSize: 56 }}>{emoji}</Text>
      <Txt variant="title" style={{ textAlign: 'center' }}>
        {title}
      </Txt>
      {text ? (
        <Txt tone="secondary" style={{ textAlign: 'center' }}>
          {text}
        </Txt>
      ) : null}
      {children ? <View style={{ alignSelf: 'stretch', gap: space.sm, marginTop: space.sm }}>{children}</View> : null}
    </View>
  );
}

export function Loading() {
  const theme = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: theme.background }]}>
      <ActivityIndicator />
    </View>
  );
}

const styles = StyleSheet.create({
  tabHeader: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  tabHeaderRight: { flexDirection: 'row', gap: space.sm, paddingBottom: 6 },
  card: { borderRadius: radius.md, padding: space.lg, borderCurve: 'continuous' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xs,
  },
  sectionTitle: { textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: space.xs },
  button: {
    minHeight: 50,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  buttonText: { fontSize: 17, fontWeight: '600' },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  input: {
    fontSize: 17,
    paddingHorizontal: space.lg,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderCurve: 'continuous',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: 13,
    minHeight: 50,
  },
  list: { borderRadius: radius.md, overflow: 'hidden', borderCurve: 'continuous' },
  segmented: { flexDirection: 'row', borderRadius: radius.sm, padding: 2 },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: radius.sm - 2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: space.xl, paddingHorizontal: space.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
