import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_CONTENT_HEIGHT } from './useTabBarInsets';

/**
 * Padding inferior para listas em tabs. A tab bar não é absoluta: o conteúdo
 * já termina acima dela, então basta um respiro no fim da lista.
 */
export function useTabListPadding(extra = 16): number {
  return extra;
}

/**
 * Padding inferior para telas de stack / sheets (só gesture / nav bar).
 */
export function useSafeBottomPadding(min = 16): number {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, min);
}

export { TAB_BAR_CONTENT_HEIGHT };
