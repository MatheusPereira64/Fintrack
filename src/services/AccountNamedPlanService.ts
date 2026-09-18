import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AccountNamedPlan {
  id: string;
  accountId: number;
  name: string;
  income: number;
  expense: number;
  yieldRate: number;
  months: number;
  createdAt: string;
}

export interface InsertAccountNamedPlan {
  accountId: number;
  name: string;
  income: number;
  expense: number;
  yieldRate: number;
  months: number;
}

const STORAGE_KEY = '@fintrack/named-plans';
const LEGACY_STORAGE_KEY = (id: number) => `@fintrack/plan/${id}`;

export class AccountNamedPlanService {
  static async loadPlans(): Promise<AccountNamedPlan[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
      return [];
    } catch {
      return [];
    }
  }

  static async savePlan(plan: InsertAccountNamedPlan): Promise<AccountNamedPlan> {
    const plans = await this.loadPlans();
    const newPlan: AccountNamedPlan = {
      ...plan,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
    };
    plans.push(newPlan);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    return newPlan;
  }

  static async updatePlan(id: string, updates: Partial<Omit<AccountNamedPlan, 'id' | 'accountId' | 'createdAt'>>): Promise<void> {
    const plans = await this.loadPlans();
    const index = plans.findIndex(p => p.id === id);
    if (index !== -1) {
      plans[index] = { ...plans[index], ...updates };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    }
  }

  static async deletePlan(id: string): Promise<void> {
    const plans = await this.loadPlans();
    const filtered = plans.filter(p => p.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }

  static async getPlansByAccount(accountId: number): Promise<AccountNamedPlan[]> {
    const plans = await this.loadPlans();
    return plans.filter(p => p.accountId === accountId);
  }

  static async migrateLegacyPlan(accountId: number, defaultName: string): Promise<void> {
    try {
      const legacyKey = LEGACY_STORAGE_KEY(accountId);
      const raw = await AsyncStorage.getItem(legacyKey);
      if (!raw) return;

      const saved = JSON.parse(raw);
      const existingPlans = await this.getPlansByAccount(accountId);
      
      if (existingPlans.length === 0) {
        await this.savePlan({
          accountId,
          name: defaultName,
          income: saved.income ?? 0,
          expense: saved.expense ?? 0,
          yieldRate: saved.yieldRate ?? 0,
          months: saved.months ?? 6,
        });
      }

      await AsyncStorage.removeItem(legacyKey);
    } catch {
      // Ignore migration errors
    }
  }
}
