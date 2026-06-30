import { Platform } from 'react-native';

const fontFamily = Platform.select({
  android: {
    regular:    'Roboto',
    medium:     'Roboto-Medium',
    bold:       'Roboto-Bold',
    light:      'Roboto-Light',
    thin:       'Roboto-Thin',
    italic:     'Roboto-Italic',
    monospace:  'monospace',
  },
  default: {
    regular:    'System',
    medium:     'System',
    bold:       'System',
    light:      'System',
    thin:       'System',
    italic:     'System',
    monospace:  'monospace',
  },
});

export const typography = {
  fonts: fontFamily!,

  sizes: {
    xs:   10,
    sm:   12,
    md:   14,
    base: 16,
    lg:   18,
    xl:   20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 40,
  },

  weights: {
    thin:     '100' as const,
    light:    '300' as const,
    regular:  '400' as const,
    medium:   '500' as const,
    semibold: '600' as const,
    bold:     '700' as const,
    extrabold:'800' as const,
  },

  lineHeights: {
    tight:   1.2,
    snug:    1.375,
    normal:  1.5,
    relaxed: 1.625,
    loose:   2,
  },

  // Estilos compostos
  styles: {
    displayLarge: {
      fontSize: 40,
      fontWeight: '700' as const,
      lineHeight: 48,
      letterSpacing: -0.5,
    },
    displaySmall: {
      fontSize: 32,
      fontWeight: '700' as const,
      lineHeight: 40,
      letterSpacing: -0.3,
    },
    headlineLarge: {
      fontSize: 28,
      fontWeight: '700' as const,
      lineHeight: 36,
    },
    headlineMedium: {
      fontSize: 24,
      fontWeight: '600' as const,
      lineHeight: 32,
    },
    headlineSmall: {
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 28,
    },
    titleLarge: {
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 26,
    },
    titleMedium: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 24,
    },
    titleSmall: {
      fontSize: 14,
      fontWeight: '600' as const,
      lineHeight: 22,
    },
    bodyLarge: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
    },
    bodyMedium: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 22,
    },
    bodySmall: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 20,
    },
    labelLarge: {
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 20,
      letterSpacing: 0.1,
    },
    labelMedium: {
      fontSize: 12,
      fontWeight: '500' as const,
      lineHeight: 18,
      letterSpacing: 0.3,
    },
    labelSmall: {
      fontSize: 10,
      fontWeight: '500' as const,
      lineHeight: 16,
      letterSpacing: 0.5,
    },
    currency: {
      fontSize: 32,
      fontWeight: '700' as const,
      lineHeight: 40,
      letterSpacing: -0.5,
    },
    currencySmall: {
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 28,
    },
    caption: {
      fontSize: 11,
      fontWeight: '400' as const,
      lineHeight: 16,
      letterSpacing: 0.2,
    },
  },
} as const;
