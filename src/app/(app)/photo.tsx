import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Photo } from '@/components/photos';
import { t } from '@/lib/i18n';
import { space } from '@/lib/theme';

/** Full-screen photo. */
export default function PhotoViewer() {
  const { path, caption } = useLocalSearchParams<{ path: string; caption?: string }>();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      {path ? <Photo path={path} contentFit="contain" style={styles.photo} /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('done')}
        hitSlop={12}
        onPress={() => router.back()}
        style={[styles.close, { top: insets.top + space.sm }]}>
        <Ionicons name="close" size={26} color="#fff" />
      </Pressable>
      {caption ? (
        <Text style={[styles.caption, { paddingBottom: insets.bottom + space.lg }]}>{caption}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  photo: { flex: 1, backgroundColor: '#000' },
  close: {
    position: 'absolute',
    left: space.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    color: '#fff',
    fontSize: 16,
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
});
