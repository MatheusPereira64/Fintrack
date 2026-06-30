import { create } from 'zustand';
import { Account, InsertAccount } from '../models/types';
import { AccountRepository } from '../database/repositories/AccountRepository';

interface AccountState {
  accounts: Account[];
  totalBalance: number;
  isLoading: boolean;
  error: string | null;

  loadAccounts: () => Promise<void>;
  addAccount: (data: InsertAccount) => Promise<Account>;
  updateAccount: (id: number, data: Partial<InsertAccount>) => Promise<void>;
  deleteAccount: (id: number) => Promise<void>;
  refreshTotalBalance: () => Promise<void>;
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
    const accounts = await AccountRepository.findAll();
    set({ accounts });
    await get().refreshTotalBalance();
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
}));
