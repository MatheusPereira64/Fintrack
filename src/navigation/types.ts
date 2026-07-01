import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps }    from '@react-navigation/bottom-tabs';

// ─── Stack raiz ────────────────────────────────────────────────────────────────
export type RootStackParamList = {
  Onboarding: undefined;
  App:        undefined;
};

// ─── Bottom Tabs ───────────────────────────────────────────────────────────────
export type AppTabParamList = {
  Dashboard:    undefined;
  Transactions: undefined;
  Accounts:     undefined;
  More:         undefined;
};

// ─── Stack de Transações ───────────────────────────────────────────────────────
import type { Transaction } from '../models/types';

export type TransactionStackParamList = {
  TransactionsList:   undefined;
  TransactionDetail:  { transactionId: number };
  AddTransaction:     { prefillAmount?: number; prefillCategory?: string; editTransaction?: Transaction } | undefined;
};

// ─── Stack de Contas ──────────────────────────────────────────────────────────
export type AccountStackParamList = {
  AccountsList:  undefined;
  AccountDetail: { accountId: number };
  AddAccount:    undefined;
};

// ─── Stack "Mais" ─────────────────────────────────────────────────────────────
export type MoreStackParamList = {
  MoreMenu:         undefined;
  Goals:            undefined;
  AddGoal:          undefined;
  GoalDetail:       { goalId: number };
  Budget:           undefined;
  Insights:         undefined;
  Notifications:    undefined;
  Settings:         undefined;
  Preferences:      undefined;
  Export:           undefined;
  Import:           undefined;
  Categories:       undefined;
};

// ─── Tipagem de props por tela ─────────────────────────────────────────────────
export type RootScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type AppTabScreenProps<T extends keyof AppTabParamList> =
  BottomTabScreenProps<AppTabParamList, T>;

export type TransactionScreenProps<T extends keyof TransactionStackParamList> =
  NativeStackScreenProps<TransactionStackParamList, T>;

export type MoreScreenProps<T extends keyof MoreStackParamList> =
  NativeStackScreenProps<MoreStackParamList, T>;
