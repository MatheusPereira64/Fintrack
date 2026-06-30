import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserSettings, AppTheme } from '../models/types';

const SETTINGS_KEY = '@fintrack:settings';

const defaultSettings: UserSettings = {
  theme:                         'system',
  currency:                      'BRL',
  language:                      'pt-BR',
  monthlyIncome:                 undefined,
  budgetLimit:                   undefined,
  onboardingCompleted:           false,
  notificationPermissionGranted: false,
  biometricEnabled:              false,
  userName:                      undefined,
};

interface SettingsState {
  settings: UserSettings;
  isLoading: boolean;

  loadSettings: () => Promise<void>;
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>;
  setTheme: (theme: AppTheme) => Promise<void>;
  setLanguage: (language: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  setNotificationPermission: (granted: boolean) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings:  defaultSettings,
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<UserSettings>;
        set({ settings: { ...defaultSettings, ...saved }, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  updateSettings: async (patch) => {
    const next = { ...get().settings, ...patch };
    set({ settings: next });
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  },

  setTheme: async (theme) => {
    await get().updateSettings({ theme });
  },

  setLanguage: async (language) => {
    await get().updateSettings({ language: language as any });
  },

  completeOnboarding: async () => {
    await get().updateSettings({ onboardingCompleted: true });
  },

  setNotificationPermission: async (granted) => {
    await get().updateSettings({ notificationPermissionGranted: granted });
  },
}));
