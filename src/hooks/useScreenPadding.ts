import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarInsets, TAB_BAR_CONTENT_HEIGHT } from './useTabBarInsets';

/**
 * Padding inferior seguro para listas em tabs (acima da tab bar + gesture bar).
 */
export function useTabListPadding(extra = 16): number {
  const { tabBarHeight } = useTabBarInsets();
  return tabBarHeight + extra;
}

/**
 * Padding inferior para telas de stack / sheets (só gesture / nav bar).
 */
export function useSafeBottomPadding(min = 16): number {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, min);
}

export { TAB_BAR_CONTENT_HEIGHT };
