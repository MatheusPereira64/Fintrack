// ─── Tipos base do domínio financeiro ─────────────────────────────────────────
// Migrados e adaptados do shared/schema.ts (PostgreSQL/Drizzle) para SQLite local

export type AccountType = 'checking' | 'savings' | 'credit_card' | 'investment' | 'wallet';

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  balance: number;
  limit?: number;
  color: string;
  bankName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InsertAccount {
  name: string;
  type: AccountType;
  balance: number;
  limit?: number;
  color: string;
  bankName?: string;
}

// ─── Categorias ────────────────────────────────────────────────────────────────

export interface Category {
  id: number;
  name: string;
  color: string;
  icon?: string;
  isSystem: boolean;
}

export interface InsertCategory {
  name: string;
  color: string;
  icon?: string;
  isSystem?: boolean;
}

// ─── Subcategorias ─────────────────────────────────────────────────────────────

export interface Subcategory {
  id: number;
  categoryId: number;
  name: string;
}

// ─── Tags ──────────────────────────────────────────────────────────────────────

export interface Tag {
  id: number;
  name: string;
  color: string;
}

// ─── Centros de Custo ──────────────────────────────────────────────────────────

export interface CostCenter {
  id: number;
  name: string;
  color: string;
}

// ─── Transações ────────────────────────────────────────────────────────────────

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id: number;
  accountId: number;
  categoryId?: number;
  costCenterId?: number;
  date: string;
  amount: number;        // positivo = receita, negativo = despesa
  description: string;
  type: TransactionType;
  isRecurring: boolean;
  tags?: string[];
  bankName?: string;
  sourceNotification?: string;
  createdAt: string;
}

export interface InsertTransaction {
  accountId: number;
  categoryId?: number;
  costCenterId?: number;
  date: string;
  amount: number;
  description: string;
  type: TransactionType;
  isRecurring?: boolean;
  tags?: string[];
  bankName?: string;
  sourceNotification?: string;
}

// ─── Orçamentos ────────────────────────────────────────────────────────────────

export type BudgetPeriod = 'monthly' | 'yearly';

export interface Budget {
  id: number;
  categoryId?: number;
  amount: number;
  period: BudgetPeriod;
  startDate: string;
  endDate?: string;
}

export interface InsertBudget {
  categoryId?: number;
  amount: number;
  period: BudgetPeriod;
  startDate: string;
  endDate?: string;
}

// ─── Notificações internas ─────────────────────────────────────────────────────

export type NotificationType =
  | 'budget_alert'
  | 'goal_milestone'
  | 'unusual_spending'
  | 'transaction_auto'
  | 'info';

export type NotificationSeverity = 'info' | 'warning' | 'critical';

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  metadata?: string;   // JSON serializado
  createdAt: string;
}

export interface InsertAppNotification {
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

// ─── Insights ──────────────────────────────────────────────────────────────────

export type InsightType = 'spending_pattern' | 'savings_opportunity' | 'anomaly';

export interface Insight {
  id: number;
  type: InsightType;
  title: string;
  description: string;
  severity: NotificationSeverity;
  metadata?: string;  // JSON serializado
  createdAt: string;
}

// ─── Pagamentos agendados ──────────────────────────────────────────────────────

export type RecurringInterval = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface UpcomingPayment {
  id: number;
  title: string;
  amount: number;
  dueDate: string;
  isPaid: boolean;
  recurringInterval?: RecurringInterval;
  categoryId?: number;
}

export interface InsertUpcomingPayment {
  title: string;
  amount: number;
  dueDate: string;
  isPaid?: boolean;
  recurringInterval?: RecurringInterval;
  categoryId?: number;
}

// ─── Metas ─────────────────────────────────────────────────────────────────────

export type GoalCategory = 'emergency' | 'travel' | 'purchase' | 'custom' | 'education' | 'health';

export interface Goal {
  id: number;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  category: GoalCategory;
  icon?: string;
  color: string;
  createdAt: string;
}

export interface InsertGoal {
  title: string;
  targetAmount: number;
  currentAmount?: number;
  deadline?: string;
  category: GoalCategory;
  icon?: string;
  color?: string;
}

// ─── Configurações do usuário ──────────────────────────────────────────────────

export type AppTheme = 'light' | 'dark' | 'system';
export type AppCurrency = 'BRL' | 'USD' | 'EUR';
export type AppLanguage = 'pt-BR' | 'en-US';

export interface UserSettings {
  theme: AppTheme;
  currency: AppCurrency;
  language: AppLanguage;
  monthlyIncome?: number;
  budgetLimit?: number;
  onboardingCompleted: boolean;
  notificationPermissionGranted: boolean;
  biometricEnabled: boolean;
  userName?: string;
}

// ─── Tipos do parser de notificações ──────────────────────────────────────────

export interface ParsedTransaction {
  type: TransactionType;
  category: string;
  amount: number;
  description: string;
  bankName: string;
  rawTitle: string;
  rawBody: string;
}

export interface BankParser {
  parse(title: string, body: string, packageName: string): ParsedTransaction | null;
}

export interface BankConfig {
  name: string;
  parser: BankParser;
  packageNames: string[];
  primaryColor: string;
}

// ─── Tipagem para navegação ────────────────────────────────────────────────────

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};

export type AuthStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
};

export type AppTabParamList = {
  Dashboard: undefined;
  Transactions: undefined;
  Accounts: undefined;
  More: undefined;
};

export type TransactionStackParamList = {
  TransactionsList: undefined;
  TransactionDetail: { transactionId: number };
  AddTransaction: undefined;
};

export type AccountsStackParamList = {
  AccountsList: undefined;
  AccountDetail: { accountId: number };
  AddAccount: undefined;
};

export type MoreStackParamList = {
  MoreMenu: undefined;
  Goals: undefined;
  Budget: undefined;
  Insights: undefined;
  Notifications: undefined;
  Settings: undefined;
  Preferences: undefined;
  Export: undefined;
};
