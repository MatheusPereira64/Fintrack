import { create } from 'zustand';
import { InsertBudget } from '../models/types';
import { BudgetRepository } from '../database/repositories/BudgetRepository';
import { TransactionRepository } from '../database/repositories/TransactionRepository';

type BudgetWithMeta = {
  id:            number;
  categoryId?:   number;
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
  amount:        number;
  spent:         number;
  period:        string;
  startDate:     string;
  endDate?:      string;
};

interface BudgetState {
  budgets:   BudgetWithMeta[];
  isLoading: boolean;

  loadBudgets:  () => Promise<void>;
  addBudget:    (data: InsertBudget) => Promise<void>;
  updateBudget: (id: number, data: Partial<InsertBudget>) => Promise<void>;
  deleteBudget: (id: number) => Promise<void>;
  syncSpent:    (year: number, month: number) => Promise<void>;
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  budgets:   [],
  isLoading: false,

  loadBudgets: async () => {
    set({ isLoading: true });
    const data = await BudgetRepository.findAll();
    set({ budgets: data as BudgetWithMeta[], isLoading: false });
  },

  addBudget: async (data) => {
    await BudgetRepository.insert(data);
    await get().loadBudgets();
  },

  updateBudget: async (id, data) => {
    await BudgetRepository.update(id, data);
    await get().loadBudgets();
  },

  deleteBudget: async (id) => {
    await BudgetRepository.delete(id);
    set(state => ({ budgets: state.budgets.filter(b => b.id !== id) }));
  },

  /**
   * Sincroniza o campo `spent` de cada orçamento com os gastos reais do mês.
   * Deve ser chamado após loadByMonth no transactionStore.
   */
  syncSpent: async (year, month) => {
    const catSpending = await TransactionRepository.spendingByCategory(year, month);
    const spendMap = new Map(catSpending.map(c => [c.categoryId, c.total]));

    for (const budget of get().budgets) {
      const spent = budget.categoryId ? (spendMap.get(budget.categoryId) ?? 0) : 0;
      if (Math.abs(spent - budget.spent) > 0.01) {
        await BudgetRepository.updateSpent(budget.id, spent);
      }
    }
    await get().loadBudgets();
  },
}));
