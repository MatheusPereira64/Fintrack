import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const TAB_BAR_CONTENT_HEIGHT = 56;
const ANDROID_NAV_FALLBACK = 48;

export function useTabBarInsets() {
  const insets = useSafeAreaInsets();
  const bottom =
    insets.bottom > 0
      ? insets.bottom
      : Platform.OS === 'android'
        ? ANDROID_NAV_FALLBACK
        : 0;

  return {
    bottom,
    tabBarHeight: TAB_BAR_CONTENT_HEIGHT + bottom,
    top: insets.top,
  };
}
