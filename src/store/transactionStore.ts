import { create } from 'zustand';
import { Transaction, InsertTransaction } from '../models/types';
import {
  TransactionRepository,
  MONTH_PAGE_SIZE,
  MONTH_HARD_CAP,
} from '../database/repositories/TransactionRepository';

interface MonthSummary {
  income:   number;
  expense:  number;
  balance:  number;
  count:    number;
}

interface CategorySpending {
  categoryId: number;
  name:       string;
  total:      number;
  color:      string;
  icon:       string;
}

interface MonthlyTotal {
  year:    number;
  month:   number;
  income:  number;
  expense: number;
}

interface TransactionState {
  transactions:     Transaction[];
  isLoading:        boolean;
  isLoadingMore:    boolean;
  error:            string | null;
  currentMonth:     { year: number; month: number };
  summary:          MonthSummary;
  categorySpending: CategorySpending[];
  monthlyTotals:    MonthlyTotal[];
  hasMore:          boolean;
  truncated:        boolean;

  loadByMonth:          (year: number, month: number) => Promise<void>;
  loadMore:             () => Promise<void>;
  addTransaction:       (data: InsertTransaction) => Promise<Transaction>;
  ingestAutoTransaction:(tx: Transaction) => Promise<void>;
  updateTransaction:    (id: number, data: Partial<InsertTransaction>) => Promise<void>;
  deleteTransaction:    (id: number) => Promise<void>;
  setCurrentMonth:      (year: number, month: number) => void;
  refreshSummary:       () => Promise<void>;
  loadMonthlyTotals:    () => Promise<void>;
}

const defaultSummary: MonthSummary = { income: 0, expense: 0, balance: 0, count: 0 };

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions:     [],
  isLoading:        false,
  isLoadingMore:    false,
  error:            null,
  currentMonth:     { year: new Date().getFullYear(), month: new Date().getMonth() + 1 },
  summary:          defaultSummary,
  categorySpending: [],
  monthlyTotals:    [],
  hasMore:          false,
  truncated:        false,

  loadByMonth: async (year, month) => {
    set({ isLoading: true, error: null, currentMonth: { year, month } });
    try {
      const [transactions, sums, catSpending, count] = await Promise.all([
        TransactionRepository.findByMonth(year, month, MONTH_PAGE_SIZE, 0),
        TransactionRepository.sumByMonth(year, month),
        TransactionRepository.spendingByCategory(year, month),
        TransactionRepository.countByMonth(year, month),
      ]);
      set({
        transactions,
        summary:          { ...sums, balance: sums.income - sums.expense, count },
        categorySpending: catSpending,
        hasMore:          count > transactions.length && transactions.length < MONTH_HARD_CAP,
        truncated:        count > MONTH_HARD_CAP,
        isLoading:        false,
      });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  loadMore: async () => {
    const { hasMore, isLoadingMore, currentMonth, transactions } = get();
    if (!hasMore || isLoadingMore) return;
    if (transactions.length >= MONTH_HARD_CAP) {
      set({ hasMore: false, truncated: true });
      return;
    }
    set({ isLoadingMore: true });
    try {
      const next = await TransactionRepository.findByMonth(
        currentMonth.year,
        currentMonth.month,
        MONTH_PAGE_SIZE,
        transactions.length,
      );
      const merged = [...transactions, ...next];
      set({
        transactions: merged,
        hasMore: next.length === MONTH_PAGE_SIZE && merged.length < MONTH_HARD_CAP,
        truncated: merged.length >= MONTH_HARD_CAP,
        isLoadingMore: false,
      });
    } catch {
      set({ isLoadingMore: false });
    }
  },

  addTransaction: async (data) => {
    const tx = await TransactionRepository.insert(data);
    const { currentMonth } = get();
    if (tx.date.startsWith(`${currentMonth.year}-${String(currentMonth.month).padStart(2, '0')}`)) {
      set(state => ({ transactions: [tx, ...state.transactions] }));
    }
    await Promise.all([get().refreshSummary(), get().loadMonthlyTotals()]);
    return tx;
  },

  ingestAutoTransaction: async (tx) => {
    const { currentMonth } = get();
    const prefix = `${currentMonth.year}-${String(currentMonth.month).padStart(2, '0')}`;
    if (tx.date.startsWith(prefix)) {
      set(state => {
        if (state.transactions.some(t => t.id === tx.id)) return state;
        return { transactions: [tx, ...state.transactions] };
      });
    }
    await Promise.all([get().refreshSummary(), get().loadMonthlyTotals()]);
  },

  updateTransaction: async (id, data) => {
    await TransactionRepository.update(id, data);
    const { currentMonth, transactions } = get();
    const txs = await TransactionRepository.findByMonth(
      currentMonth.year,
      currentMonth.month,
      Math.max(transactions.length, MONTH_PAGE_SIZE),
      0,
    );
    set({ transactions: txs });
    await get().refreshSummary();
  },

  deleteTransaction: async (id) => {
    await TransactionRepository.delete(id);
    set(state => ({ transactions: state.transactions.filter(t => t.id !== id) }));
    await get().refreshSummary();
  },

  setCurrentMonth: (year, month) => {
    get().loadByMonth(year, month);
  },

  refreshSummary: async () => {
    const { year, month } = get().currentMonth;
    const [sums, catSpending, count] = await Promise.all([
      TransactionRepository.sumByMonth(year, month),
      TransactionRepository.spendingByCategory(year, month),
      TransactionRepository.countByMonth(year, month),
    ]);
    set({
      summary:          { ...sums, balance: sums.income - sums.expense, count },
      categorySpending: catSpending,
    });
  },

  loadMonthlyTotals: async () => {
    const totals = await TransactionRepository.monthlyTotals(6);
    set({ monthlyTotals: totals });
  },
}));
