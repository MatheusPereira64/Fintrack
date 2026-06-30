import { create } from 'zustand';
import { Transaction, InsertTransaction } from '../models/types';
import { TransactionRepository } from '../database/repositories/TransactionRepository';

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
  error:            string | null;
  currentMonth:     { year: number; month: number };
  summary:          MonthSummary;
  categorySpending: CategorySpending[];
  monthlyTotals:    MonthlyTotal[];

  loadByMonth:        (year: number, month: number) => Promise<void>;
  addTransaction:     (data: InsertTransaction) => Promise<Transaction>;
  updateTransaction:  (id: number, data: Partial<InsertTransaction>) => Promise<void>;
  deleteTransaction:  (id: number) => Promise<void>;
  setCurrentMonth:    (year: number, month: number) => void;
  refreshSummary:     () => Promise<void>;
  loadMonthlyTotals:  () => Promise<void>;
}

const defaultSummary: MonthSummary = { income: 0, expense: 0, balance: 0, count: 0 };

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions:     [],
  isLoading:        false,
  error:            null,
  currentMonth:     { year: new Date().getFullYear(), month: new Date().getMonth() + 1 },
  summary:          defaultSummary,
  categorySpending: [],
  monthlyTotals:    [],

  loadByMonth: async (year, month) => {
    set({ isLoading: true, error: null, currentMonth: { year, month } });
    try {
      const [transactions, sums, catSpending, count] = await Promise.all([
        TransactionRepository.findByMonth(year, month),
        TransactionRepository.sumByMonth(year, month),
        TransactionRepository.spendingByCategory(year, month),
        TransactionRepository.countByMonth(year, month),
      ]);
      set({
        transactions,
        summary:          { ...sums, balance: sums.income - sums.expense, count },
        categorySpending: catSpending,
        isLoading:        false,
      });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  addTransaction: async (data) => {
    const tx = await TransactionRepository.insert(data);
    const { currentMonth } = get();
    // Só adiciona ao array se for do mês atual
    if (tx.date.startsWith(`${currentMonth.year}-${String(currentMonth.month).padStart(2, '0')}`)) {
      set(state => ({ transactions: [tx, ...state.transactions] }));
    }
    await get().refreshSummary();
    return tx;
  },

  updateTransaction: async (id, data) => {
    await TransactionRepository.update(id, data);
    const { currentMonth } = get();
    const txs = await TransactionRepository.findByMonth(currentMonth.year, currentMonth.month);
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
