import { create } from 'zustand';
import { Goal, InsertGoal } from '../models/types';
import { GoalRepository } from '../database/repositories/GoalRepository';

interface GoalState {
  goals:     Goal[];
  isLoading: boolean;

  loadGoals:        () => Promise<void>;
  addGoal:          (data: InsertGoal) => Promise<Goal>;
  updateGoal:       (id: number, data: Partial<InsertGoal>) => Promise<void>;
  deleteGoal:       (id: number) => Promise<void>;
  addProgress:      (id: number, amount: number) => Promise<void>;
  getTotalProgress: () => number;
}

export const useGoalStore = create<GoalState>((set, get) => ({
  goals:     [],
  isLoading: false,

  loadGoals: async () => {
    set({ isLoading: true });
    const goals = await GoalRepository.findAll();
    set({ goals, isLoading: false });
  },

  addGoal: async (data) => {
    const goal = await GoalRepository.insert(data);
    set(state => ({ goals: [goal, ...state.goals] }));
    return goal;
  },

  updateGoal: async (id, data) => {
    await GoalRepository.update(id, data);
    const goals = await GoalRepository.findAll();
    set({ goals });
  },

  deleteGoal: async (id) => {
    await GoalRepository.delete(id);
    set(state => ({ goals: state.goals.filter(g => g.id !== id) }));
  },

  addProgress: async (id, amount) => {
    await GoalRepository.addToCurrentAmount(id, amount);
    set(state => ({
      goals: state.goals.map(g =>
        g.id === id ? { ...g, currentAmount: g.currentAmount + amount } : g,
      ),
    }));
  },

  getTotalProgress: () => {
    const { goals } = get();
    if (goals.length === 0) return 0;
    const total   = goals.reduce((s, g) => s + g.targetAmount, 0);
    const current = goals.reduce((s, g) => s + g.currentAmount, 0);
    return total > 0 ? (current / total) * 100 : 0;
  },
}));
