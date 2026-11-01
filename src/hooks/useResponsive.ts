import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

/** Largura a partir da qual a tab bar vira barra lateral (tablet / celular deitado). */
export const SIDE_NAV_MIN_WIDTH = 600;
/** Altura abaixo da qual a tela é considerada baixa (celular deitado). */
export const SHORT_HEIGHT_MAX = 480;
/** Largura máxima da coluna de conteúdo das telas. */
export const CONTENT_MAX_WIDTH = 720;
/** Largura máxima dos bottom sheets. */
export const SHEET_MAX_WIDTH = 560;

export interface ResponsiveLayout {
  width:         number;
  height:        number;
  useSideNav:    boolean;
  isShortHeight: boolean;
}

export function getResponsiveLayout(width: number, height: number): ResponsiveLayout {
  return {
    width,
    height,
    useSideNav:    width >= SIDE_NAV_MIN_WIDTH,
    isShortHeight: height < SHORT_HEIGHT_MAX,
  };
}

export function useResponsive(): ResponsiveLayout {
  const { width, height } = useWindowDimensions();
  return useMemo(() => getResponsiveLayout(width, height), [width, height]);
}
