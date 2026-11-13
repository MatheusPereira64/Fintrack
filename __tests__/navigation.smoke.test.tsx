/**
 * @format
 * Monta o navegador real em tamanho de celular e de tablet e abre as telas
 * principais, para pegar erros de runtime que o TypeScript não vê.
 */

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View, Text, ScrollView } = require('react-native');
  const chain: any = new Proxy(function () {}, {
    get: (_t, key) => (key === 'then' ? undefined : chain),
    apply: () => chain,
  });
  return {
    __esModule: true,
    default: { View, Text, ScrollView, createAnimatedComponent: (c: any) => c },
    FadeInDown: chain, FadeInUp: chain, FadeInRight: chain, SlideInDown: chain,
    useSharedValue: (value: unknown) => ({ value }),
    useAnimatedStyle: () => ({}),
    withSpring: (v: unknown) => v,
    withTiming: (v: unknown) => v,
    React,
  };
});

jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return { GestureHandlerRootView: View };
});
jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: React.forwardRef(({ children }: any, _ref: any) => React.createElement(View, null, children)),
  };
});

jest.mock('react-native-screens', () => {
  const actual = jest.requireActual('react-native-screens');
  return { ...actual, enableScreens: jest.fn() };
});

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  const insets = { top: 24, bottom: 24, left: 0, right: 0 };
  const frame = { x: 0, y: 0, width: 400, height: 800 };
  const SafeAreaInsetsContext = React.createContext(insets);
  const SafeAreaFrameContext = React.createContext(frame);
  return {
    SafeAreaInsetsContext,
    SafeAreaFrameContext,
    SafeAreaProvider: ({ children }: any) => children,
    SafeAreaView: View,
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => frame,
    initialWindowMetrics: { insets, frame },
  };
});

jest.mock('react-native-svg', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: View, G: View, Path: View, Rect: View, Line: View, Text: View };
});

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'MCI');
jest.mock('@react-native-community/datetimepicker', () => ({ __esModule: true, default: 'DateTimePicker' }));
jest.mock('react-native-document-picker', () => ({ __esModule: true, default: {}, types: {} }));
jest.mock('react-native-fs', () => ({}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
  },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'pt-BR', changeLanguage: jest.fn(async () => undefined) },
  }),
  initReactI18next: { type: '3rdParty', init: jest.fn() },
}));
jest.mock('../src/i18n/config', () => ({
  __esModule: true,
  default: { t: (key: string) => key, language: 'pt-BR', changeLanguage: jest.fn(async () => undefined) },
}));

jest.mock('../src/database/db', () => ({
  getDatabase: jest.fn(async () => ({
    executeSql: jest.fn(async () => [{ rows: { length: 0, item: () => ({ income: 0, expense: 0, total: 0, count: 0 }), raw: () => [] }, insertId: 0, rowsAffected: 0 }]),
    transaction: jest.fn(),
  })),
}));
jest.mock('../src/services/NotificationManager', () => ({
  NotificationManager: { start: jest.fn(), addObserver: jest.fn(), removeObserver: jest.fn() },
}));
jest.mock('../src/services/UpdateService', () => ({
  UpdateService: {
    checkOnLaunch: jest.fn(async () => undefined),
    checkFromSettings: jest.fn(async () => undefined),
    getLocalVersion: jest.fn(async () => ({ versionName: '1.0.5', versionCode: 5 })),
  },
}));
jest.mock('../src/components/UpdateDialog', () => ({ UpdateDialog: () => null }));
jest.mock('../src/services/LoggerService', () => ({
  Logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import React from 'react';
import { Text, useWindowDimensions } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { AppNavigator } from '../src/navigation/AppNavigator';
import { useSettingsStore } from '../src/store/settingsStore';

const mockDimensions = jest.fn();
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => mockDimensions(),
}));

const SIZES: Array<[string, number, number]> = [
  ['celular', 393, 852],
  ['celular deitado', 852, 393],
  ['tablet', 1024, 768],
];

async function flush() {
  await ReactTestRenderer.act(async () => {
    await new Promise<void>(resolve => { setTimeout(() => resolve(), 20); });
  });
}

async function mount() {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<AppNavigator />);
  });
  await flush();
  return tree;
}

function textOf(tree: ReactTestRenderer.ReactTestRenderer): string[] {
  return tree.root.findAllByType(Text).map(n => {
    const c = n.props.children;
    return Array.isArray(c) ? c.join('') : String(c);
  });
}

function pressTab(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  const tab = tree.root.findAll(
    n => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function',
  )[0];
  expect(tab).toBeTruthy();
  ReactTestRenderer.act(() => {
    tab.props.onPress({ preventDefault: jest.fn(), defaultPrevented: false });
  });
}

describe.each(SIZES)('navegador em %s', (_name, width, height) => {
  beforeEach(() => {
    mockDimensions.mockReturnValue({ width, height, scale: 2, fontScale: 1 });
    useSettingsStore.setState(s => ({
      settings: { ...s.settings, onboardingCompleted: true },
    }));
  });

  test('abre as abas sem erro', async () => {
    const tree = await mount();
    expect(useWindowDimensions().width).toBe(width);
    expect(textOf(tree)).toContain('dashboard.financialSummary');

    pressTab(tree, 'navigation.transactions');
    await flush();
    expect(textOf(tree)).toContain('transactions.title');

    pressTab(tree, 'navigation.accounts');
    await flush();
    expect(textOf(tree)).toContain('accounts.title');

    pressTab(tree, 'navigation.more');
    await flush();
    expect(textOf(tree)).toContain('moreMenu.sectionPlanning');

    ReactTestRenderer.act(() => tree.unmount());
  });

  test('onboarding renderiza e avança', async () => {
    useSettingsStore.setState(s => ({
      settings: { ...s.settings, onboardingCompleted: false },
    }));
    const tree = await mount();
    expect(textOf(tree)).toContain('onboarding.step1Title');
    const buttonWith = (text: string) => tree.root.findAll(
      n => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function' &&
        n.findAllByType(Text).some(t => t.props.children === text),
    )[0];
    ReactTestRenderer.act(() => buttonWith('onboarding.next').props.onPress());
    await flush();
    expect(textOf(tree)).toContain('onboarding.step2Title');
    expect(tree.root.findAll(n => n.props.accessibilityLabel === 'common.back').length).toBeGreaterThan(0);

    // "Pular" leva ao passo da permissão, que não pode ser ignorado sem ser visto.
    ReactTestRenderer.act(() => buttonWith('onboarding.skip').props.onPress());
    await flush();
    expect(textOf(tree)).toContain('onboarding.step4Title');
    expect(textOf(tree)).toContain('onboarding.start');
    ReactTestRenderer.act(() => tree.unmount());
  });
});
