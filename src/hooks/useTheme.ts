import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, AppTheme } from '../theme';
import { useSettingsStore } from '../store/settingsStore';

export function useTheme(): AppTheme {
  const systemScheme = useColorScheme();
  const { settings } = useSettingsStore();

  if (settings.theme === 'dark') return darkTheme;
  if (settings.theme === 'light') return lightTheme;

  // 'system'
  return systemScheme === 'dark' ? darkTheme : lightTheme;
}
