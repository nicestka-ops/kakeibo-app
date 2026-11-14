import { Account, Category, MonthlyBudget, PlannedExpense, SavingsGoal, Transaction } from '@/types';

export const STORAGE_KEYS = {
  ACCOUNTS: 'kakeibo_accounts',
  TRANSACTIONS: 'kakeibo_transactions',
  CATEGORIES: 'kakeibo_categories',
  BUDGETS: 'kakeibo_budgets',
  PLANNED_EXPENSES: 'kakeibo_planned_expenses',
  SAVINGS_GOALS: 'kakeibo_savings_goals',
  SETTINGS: 'kakeibo_settings',
};

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: '食費', kind: 'expense', icon: 'Utensils', color: '#f97316', sortOrder: 1, isActive: true },
  { id: 'cat-2', name: '日用品', kind: 'expense', icon: 'ShoppingCart', color: '#06b6d4', sortOrder: 2, isActive: true },
  { id: 'cat-3', name: '住居・光熱費', kind: 'expense', icon: 'Home', color: '#3b82f6', sortOrder: 3, isActive: true },
  { id: 'cat-4', name: '交通費', kind: 'expense', icon: 'Car', color: '#6366f1', sortOrder: 4, isActive: true },
  { id: 'cat-5', name: '通信費', kind: 'expense', icon: 'Wifi', color: '#8b5cf6', sortOrder: 5, isActive: true },
  { id: 'cat-6', name: '交際・趣味', kind: 'expense', icon: 'Coffee', color: '#ec4899', sortOrder: 6, isActive: true },
  { id: 'cat-7', name: '自己投資・教養', kind: 'expense', icon: 'BookOpen', color: '#10b981', sortOrder: 7, isActive: true },
  { id: 'cat-8', name: '医療・健康', kind: 'expense', icon: 'HeartPulse', color: '#ef4444', sortOrder: 8, isActive: true },
  { id: 'cat-9', name: 'その他支出', kind: 'expense', icon: 'MoreHorizontal', color: '#64748b', sortOrder: 9, isActive: true },
  { id: 'cat-10', name: '給与収入', kind: 'income', icon: 'Banknote', color: '#22c55e', sortOrder: 10, isActive: true },
  { id: 'cat-11', name: '臨時収入・副業', kind: 'income', icon: 'Coins', color: '#eab308', sortOrder: 11, isActive: true },
];

export const DEFAULT_ACCOUNTS: Account[] = [];

export const DEFAULT_TRANSACTIONS: Transaction[] = [];

export const DEFAULT_BUDGET: MonthlyBudget = {
  id: 'b-default',
  month: new Date().toISOString().slice(0, 7),
  totalAmount: 0,
  categoryBudgets: {},
};

export const DEFAULT_PLANNED_EXPENSES: PlannedExpense[] = [];

export const DEFAULT_SAVINGS_GOALS: SavingsGoal[] = [];

export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error loading ${key}:`, error);
    return defaultValue;
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key}:`, error);
  }
}
