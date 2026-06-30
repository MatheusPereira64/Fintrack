import { create } from 'zustand';
import { Category, InsertCategory } from '../models/types';
import { CategoryRepository } from '../database/repositories/CategoryRepository';

interface CategoryState {
  categories: Category[];
  isLoading: boolean;
  error: string | null;

  loadCategories: () => Promise<void>;
  addCategory: (data: InsertCategory) => Promise<Category>;
  updateCategory: (id: number, data: Partial<InsertCategory>) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;
  getCategoryById: (id: number) => Category | undefined;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  isLoading:  false,
  error:      null,

  loadCategories: async () => {
    set({ isLoading: true, error: null });
    try {
      const categories = await CategoryRepository.findAll();
      set({ categories, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  addCategory: async (data) => {
    const cat = await CategoryRepository.insert(data);
    set(state => ({ categories: [...state.categories, cat] }));
    return cat;
  },

  updateCategory: async (id, data) => {
    await CategoryRepository.update(id, data);
    const categories = await CategoryRepository.findAll();
    set({ categories });
  },

  deleteCategory: async (id) => {
    await CategoryRepository.delete(id);
    set(state => ({ categories: state.categories.filter(c => c.id !== id) }));
  },

  getCategoryById: (id) => get().categories.find(c => c.id === id),
}));
