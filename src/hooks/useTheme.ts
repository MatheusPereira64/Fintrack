import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, AppTheme } from '../theme';
import { useSettingsStore } from '../store/settingsStore';

export function useTheme(): AppTheme {
  const systemScheme = useColorScheme();
  const themePref = useSettingsStore(s => s.settings.theme);

  if (themePref === 'dark') return darkTheme;
  if (themePref === 'light') return lightTheme;

  // 'system'
  return systemScheme === 'dark' ? darkTheme : lightTheme;
}
