import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ptBR from './locales/pt-BR.json';
import en from './locales/en.json';
import es from './locales/es.json';

const LANGUAGE_KEY = '@fintrack:language';

const resources = {
  'pt-BR': { translation: ptBR },
  en: { translation: en },
  es: { translation: es },
};

let storedLanguage: string | null = null;

const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lng: string) => void) => {
    try {
      if (!storedLanguage) {
        storedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
      }
      callback(storedLanguage || 'pt-BR');
    } catch {
      callback('pt-BR');
    }
  },
  init: () => {},
  cacheUserLanguage: async (language: string) => {
    try {
      storedLanguage = language;
      await AsyncStorage.setItem(LANGUAGE_KEY, language);
    } catch {
      // Ignore
    }
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'pt-BR',
    compatibilityJSON: 'v4',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
