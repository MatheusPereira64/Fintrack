import { lightColors, darkColors, ColorScheme } from './colors';
import { typography } from './typography';

export const spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  base:16,
  lg:  20,
  xl:  24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

export const borderRadius = {
  none:   0,
  sm:     4,
  md:     8,
  lg:     12,
  xl:     16,
  '2xl':  20,
  '3xl':  24,
  full:   9999,
} as const;

export const shadows = {
  none: {},
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

export const zIndex = {
  base:    0,
  card:    10,
  overlay: 100,
  modal:   200,
  toast:   300,
} as const;

export interface AppTheme {
  colors: ColorScheme;
  typography: typeof typography;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  shadows: typeof shadows;
  isDark: boolean;
}

export const lightTheme: AppTheme = {
  colors: lightColors,
  typography,
  spacing,
  borderRadius,
  shadows,
  isDark: false,
};

export const darkTheme: AppTheme = {
  colors: darkColors,
  typography,
  spacing,
  borderRadius,
  shadows,
  isDark: true,
};

export { lightColors, darkColors, typography };
export type { ColorScheme };
