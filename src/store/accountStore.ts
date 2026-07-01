import { create } from 'zustand';
import { Account, InsertAccount } from '../models/types';
import { AccountRepository } from '../database/repositories/AccountRepository';
import {
  reconcileAccountBalance,
  setInformedBalance,
} from '../services/AccountBalanceService';

interface AccountState {
  accounts:     Account[];
  totalBalance: number;
  isLoading:    boolean;
  error:        string | null;

  loadAccounts:        () => Promise<void>;
  addAccount:          (data: InsertAccount) => Promise<Account>;
  updateAccount:       (id: number, data: Partial<InsertAccount & { informedBalance?: number }>) => Promise<void>;
  deleteAccount:     (id: number) => Promise<void>;
  refreshTotalBalance: () => Promise<void>;
  reconcileBalance:    (id: number, targetInformedBalance: number) => Promise<void>;
  updateInformedBalance: (id: number, informedBalance: number) => Promise<void>;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts:     [],
  totalBalance: 0,
  isLoading:    false,
  error:        null,

  loadAccounts: async () => {
    set({ isLoading: true, error: null });
    try {
      const accounts     = await AccountRepository.findAll();
      const totalBalance = await AccountRepository.totalBalance();
      set({ accounts, totalBalance, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  addAccount: async (data) => {
    const account = await AccountRepository.insert(data);
    set(state => ({ accounts: [...state.accounts, account] }));
    await get().refreshTotalBalance();
    return account;
  },

  updateAccount: async (id, data) => {
    await AccountRepository.update(id, data);
    await get().loadAccounts();
  },

  deleteAccount: async (id) => {
    await AccountRepository.delete(id);
    set(state => ({ accounts: state.accounts.filter(a => a.id !== id) }));
    await get().refreshTotalBalance();
  },

  refreshTotalBalance: async () => {
    const totalBalance = await AccountRepository.totalBalance();
    set({ totalBalance });
  },

  reconcileBalance: async (id, targetInformedBalance) => {
    await reconcileAccountBalance(id, targetInformedBalance);
    await get().loadAccounts();
  },

  updateInformedBalance: async (id, informedBalance) => {
    await setInformedBalance(id, informedBalance);
    await get().loadAccounts();
  },
}));
