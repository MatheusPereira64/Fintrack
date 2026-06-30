export const palette = {
  // Roxo FinTrack (brand)
  purple50:  '#F5F3FF',
  purple100: '#EDE9FE',
  purple200: '#DDD6FE',
  purple300: '#C4B5FD',
  purple400: '#A78BFA',
  purple500: '#8B5CF6',
  purple600: '#7C3AED',
  purple700: '#6D28D9',
  purple800: '#5B21B6',
  purple900: '#4C1D95',

  // Verde (receitas / positivo)
  green50:  '#F0FDF4',
  green100: '#DCFCE7',
  green400: '#4ADE80',
  green500: '#22C55E',
  green600: '#16A34A',
  green700: '#15803D',

  // Vermelho (despesas / negativo)
  red50:  '#FEF2F2',
  red100: '#FEE2E2',
  red400: '#F87171',
  red500: '#EF4444',
  red600: '#DC2626',
  red700: '#B91C1C',

  // Amarelo (alertas)
  yellow400: '#FACC15',
  yellow500: '#EAB308',
  yellow600: '#CA8A04',

  // Azul (informação)
  blue400: '#60A5FA',
  blue500: '#3B82F6',
  blue600: '#2563EB',

  // Neutros
  white:   '#FFFFFF',
  black:   '#000000',
  gray50:  '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  // Dark mode
  dark100: '#1A1A2E',
  dark200: '#16213E',
  dark300: '#0F3460',
  dark400: '#533483',
  dark500: '#2D2D2D',
  dark600: '#1E1E1E',
  dark700: '#121212',
  dark800: '#0A0A0A',
} as const;

export const lightColors = {
  primary:          palette.purple600,
  primaryLight:     palette.purple100,
  primaryDark:      palette.purple800,
  onPrimary:        palette.white,

  background:       palette.gray50,
  surface:          palette.white,
  surfaceVariant:   palette.gray100,
  card:             palette.white,

  text:             palette.gray900,
  textSecondary:    palette.gray600,
  textTertiary:     palette.gray400,
  textInverse:      palette.white,

  border:           palette.gray200,
  borderLight:      palette.gray100,
  divider:          palette.gray200,

  income:           palette.green600,
  incomeBackground: palette.green50,
  expense:          palette.red600,
  expenseBackground: palette.red50,

  success:          palette.green500,
  warning:          palette.yellow500,
  error:            palette.red500,
  info:             palette.blue500,

  tabBar:           palette.white,
  tabBarActive:     palette.purple600,
  tabBarInactive:   palette.gray400,

  header:           palette.white,
  headerText:       palette.gray900,

  inputBackground:  palette.gray100,
  inputBorder:      palette.gray300,
  inputText:        palette.gray900,
  placeholder:      palette.gray400,

  shadow:           palette.black,
  overlay:          'rgba(0, 0, 0, 0.5)',
  shimmer:          palette.gray200,
} as const;

export const darkColors: typeof lightColors = {
  primary:          palette.purple400,
  primaryLight:     palette.purple900,
  primaryDark:      palette.purple200,
  onPrimary:        palette.dark700,

  background:       palette.dark700,
  surface:          palette.dark600,
  surfaceVariant:   palette.dark500,
  card:             palette.dark600,

  text:             palette.gray100,
  textSecondary:    palette.gray400,
  textTertiary:     palette.gray600,
  textInverse:      palette.gray900,

  border:           palette.gray700,
  borderLight:      palette.gray800,
  divider:          palette.gray700,

  income:           palette.green400,
  incomeBackground: 'rgba(74, 222, 128, 0.15)',
  expense:          palette.red400,
  expenseBackground: 'rgba(248, 113, 113, 0.15)',

  success:          palette.green400,
  warning:          palette.yellow400,
  error:            palette.red400,
  info:             palette.blue400,

  tabBar:           palette.dark600,
  tabBarActive:     palette.purple400,
  tabBarInactive:   palette.gray600,

  header:           palette.dark600,
  headerText:       palette.gray100,

  inputBackground:  palette.dark500,
  inputBorder:      palette.gray700,
  inputText:        palette.gray100,
  placeholder:      palette.gray600,

  shadow:           palette.black,
  overlay:          'rgba(0, 0, 0, 0.7)',
  shimmer:          palette.dark500,
} as const;

export type ColorScheme = typeof lightColors;
