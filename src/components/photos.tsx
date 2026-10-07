import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { HabitPhoto } from '@/lib/api';
import { formatShortDate } from '@/lib/i18n';
import { useSignedUrl } from '@/lib/photos';
import { radius, useTheme, withAlpha } from '@/lib/theme';

/**
 * A private photo from storage. Pass `url` when the list already signed it,
 * otherwise the link is fetched. The storage path doubles as the cache key,
 * so a photo is downloaded once even though its signed link changes.
 */
export function Photo({
  path,
  url,
  style,
  contentFit = 'cover',
}: {
  path: string;
  url?: string;
  style?: StyleProp<ViewStyle>;
  contentFit?: 'cover' | 'contain';
}) {
  const theme = useTheme();
  const fetched = useSignedUrl(url ? null : path);
  const uri = url ?? fetched;
  return (
    <View style={[{ backgroundColor: theme.empty, overflow: 'hidden' }, style]}>
      {uri ? (
        <Image
          source={{ uri, cacheKey: path }}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          transition={150}
          recyclingKey={path}
        />
      ) : null}
    </View>
  );
}

/** Opens a photo full screen. */
export function openPhoto(path: string, caption?: string | null) {
  router.push({ pathname: '/photo', params: caption ? { path, caption } : { path } });
}

/** Tappable photo that opens full screen. */
export function PhotoButton({
  path,
  url,
  caption,
  style,
}: {
  path: string;
  url?: string;
  caption?: string | null;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable accessibilityRole="imagebutton" onPress={() => openPhoto(path, caption)}>
      <Photo path={path} url={url} style={style} />
    </Pressable>
  );
}

/** Small camera button or photo thumbnail next to a habit's check button. */
export function ProofButton({
  path,
  color,
  onPress,
  accessibilityLabel,
}: {
  path: string | null | undefined;
  color: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
      {path ? (
        <Photo path={path} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.camera, { backgroundColor: withAlpha(color, 0.14) }]}>
          <Ionicons name="camera" size={17} color={color} />
        </View>
      )}
    </Pressable>
  );
}

/** Three-column grid of a habit's photos, newest first, with dates. */
export function PhotoGrid({ photos }: { photos: (HabitPhoto & { photo_url?: string })[] }) {
  const [width, setWidth] = useState(0);
  const gap = 4;
  const size = width ? (width - gap * 2) / 3 : 0;
  return (
    <View style={styles.grid} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {size
        ? photos.map((p) => (
            <Pressable
              key={p.photo_path}
              accessibilityRole="imagebutton"
              accessibilityLabel={formatShortDate(p.date)}
              onPress={() => openPhoto(p.photo_path, p.note)}>
              <Photo path={p.photo_path} url={p.photo_url} style={{ width: size, height: size, borderRadius: 6 }} />
              <Text style={styles.date}>{formatShortDate(p.date)}</Text>
            </Pressable>
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: { width: 34, height: 34, borderRadius: radius.sm },
  camera: { alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  date: {
    position: 'absolute',
    left: 6,
    bottom: 4,
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 3,
  },
});
