import { useQuery } from '@tanstack/react-query';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { ActionSheetIOS, Alert, Platform } from 'react-native';

import { t } from './i18n';
import { supabase } from './supabase';

// Photos are stored in the private "photos" bucket under "<user id>/".
// The database decides who may open a photo (see can_view_photo() in
// supabase/schema.sql); the app shows them through short-lived signed links.

export const PHOTO_BUCKET = 'photos';
/** Longest side after resizing: sharp on a phone, ~200 KB per photo. */
const MAX_SIDE = 1280;
const SIGNED_URL_SECONDS = 6 * 60 * 60;

export type PickedPhoto = { uri: string; width: number; height: number };
export type PhotoSource = 'camera' | 'library';

/** Asks where the photo should come from. Resolves null when cancelled. */
export function choosePhotoSource(): Promise<PhotoSource | null> {
  // there is no camera picker on the web
  if (Platform.OS === 'web') return Promise.resolve('library');
  return new Promise((resolve) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [t('takePhoto'), t('chooseFromLibrary'), t('cancel')], cancelButtonIndex: 2 },
        (index) => resolve(index === 0 ? 'camera' : index === 1 ? 'library' : null),
      );
      return;
    }
    Alert.alert(
      t('addPhoto'),
      undefined,
      [
        { text: t('takePhoto'), onPress: () => resolve('camera') },
        { text: t('chooseFromLibrary'), onPress: () => resolve('library') },
        { text: t('cancel'), style: 'cancel', onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}

/** Opens the camera or the photo library. */
export async function pickPhoto(source: PhotoSource): Promise<PickedPhoto | null> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.9 };
  let result: ImagePicker.ImagePickerResult;
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('cameraDenied'));
      return null;
    }
    result = await ImagePicker.launchCameraAsync(options);
  } else {
    result = await ImagePicker.launchImageLibraryAsync(options);
  }
  if (result.canceled || !result.assets[0]) return null;
  const { uri, width, height } = result.assets[0];
  return { uri, width, height };
}

/** Asks for the source and opens it. */
export async function choosePhoto(): Promise<PickedPhoto | null> {
  const source = await choosePhotoSource();
  return source ? pickPhoto(source) : null;
}

/** Shrinks the photo, uploads it to the user's folder and returns its path. */
export async function uploadPhoto(userId: string, photo: PickedPhoto): Promise<string> {
  let context = ImageManipulator.manipulate(photo.uri);
  if (Math.max(photo.width, photo.height) > MAX_SIDE) {
    context = context.resize(photo.width >= photo.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
  const body = await fetch(saved.uri).then((response) => response.arrayBuffer());

  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, body, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return path;
}

/** Deletes photo files; problems are ignored (a leftover file is harmless). */
export async function removePhotos(paths: (string | null | undefined)[]): Promise<void> {
  const list = paths.filter((p): p is string => !!p);
  if (list.length === 0) return;
  await supabase.storage.from(PHOTO_BUCKET).remove(list).catch(() => undefined);
}

/** Signed links for many photos at once: path → url. */
export async function signPhotos(paths: (string | null | undefined)[]): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => !!p))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(unique, SIGNED_URL_SECONDS);
  if (error) return map; // photos just don't show; the rest of the screen still works
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) map.set(item.path, item.signedUrl);
  }
  return map;
}

/** Adds `photo_url` to every item that has a `photo_path`. */
export async function withPhotoUrls<T extends { photo_path: string | null }>(items: T[]): Promise<T[]> {
  const urls = await signPhotos(items.map((i) => i.photo_path));
  return items.map((i) => (i.photo_path && urls.has(i.photo_path) ? { ...i, photo_url: urls.get(i.photo_path) } : i));
}

/** Signed link for one photo, cached while it is valid. */
export function useSignedUrl(path: string | null | undefined): string | undefined {
  const { data } = useQuery({
    queryKey: ['signed-url', path],
    queryFn: async () => (await signPhotos([path])).get(path!) ?? null,
    enabled: !!path,
    staleTime: (SIGNED_URL_SECONDS - 600) * 1000,
    gcTime: SIGNED_URL_SECONDS * 1000,
  });
  return data ?? undefined;
}
