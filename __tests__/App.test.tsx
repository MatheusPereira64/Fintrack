/**
 * @format
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
    multiGet: jest.fn(async () => []),
    multiSet: jest.fn(async () => undefined),
    clear: jest.fn(async () => undefined),
  },
}));

jest.mock('../src/i18n/config', () => ({}));

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    GestureHandlerRootView: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
  };
});

jest.mock('../src/database/db', () => ({
  getDatabase: jest.fn(async () => ({})),
}));

jest.mock('../src/services/NotificationManager', () => ({
  NotificationManager: { start: jest.fn() },
}));

jest.mock('../src/services/RecurringService', () => ({
  RecurringService: { processCurrentMonth: jest.fn(async () => 0) },
}));

jest.mock('../src/services/UpdateService', () => ({
  UpdateService: { checkOnLaunch: jest.fn(async () => undefined) },
}));

jest.mock('../src/store/settingsStore', () => ({
  useSettingsStore: (sel: (s: object) => unknown) =>
    sel({ loadSettings: jest.fn(async () => undefined) }),
}));
jest.mock('../src/store/accountStore', () => ({
  useAccountStore: (sel: (s: object) => unknown) =>
    sel({ loadAccounts: jest.fn(async () => undefined) }),
}));
jest.mock('../src/store/categoryStore', () => ({
  useCategoryStore: (sel: (s: object) => unknown) =>
    sel({ loadCategories: jest.fn(async () => undefined) }),
}));
jest.mock('../src/store/transactionStore', () => ({
  useTransactionStore: () => ({
    loadByMonth: jest.fn(async () => undefined),
    loadMonthlyTotals: jest.fn(),
  }),
}));
jest.mock('../src/store/budgetStore', () => ({
  useBudgetStore: (sel: (s: object) => unknown) =>
    sel({ loadBudgets: jest.fn(async () => undefined) }),
}));
jest.mock('../src/store/goalStore', () => ({
  useGoalStore: (sel: (s: object) => unknown) =>
    sel({ loadGoals: jest.fn(async () => undefined) }),
}));
jest.mock('../src/navigation/AppNavigator', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { AppNavigator: () => React.createElement(Text, null, 'Navigator') };
});
jest.mock('../src/components/Logo', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { Logo: () => React.createElement(View) };
});
jest.mock('../src/services/LoggerService', () => ({
  Logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../src/App';

test('App monta após bootstrap', async () => {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(React.createElement(App));
    await new Promise(r => setTimeout(r, 50));
  });
  expect(tree).toBeTruthy();
});
