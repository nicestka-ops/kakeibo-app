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

export const DEFAULT_ACCOUNTS: Account[] = [
  {
    id: 'acc-1',
    name: 'PayPay銀行',
    type: 'bank',
    openingBalance: 125000,
    openingBalanceDate: '2026-10-01',
    includeInAssets: true,
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 'acc-2',
    name: '現金手元財布',
    type: 'cash',
    openingBalance: 18500,
    openingBalanceDate: '2026-10-01',
    includeInAssets: true,
    sortOrder: 2,
    isActive: true,
  },
  {
    id: 'acc-3',
    name: 'クレジットカード (メイン)',
    type: 'credit_card',
    openingBalance: 0,
    openingBalanceDate: '2026-10-01',
    includeInAssets: false,
    sortOrder: 3,
    isActive: true,
  },
];

export const DEFAULT_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    date: '2026-11-01',
    type: 'income',
    amount: 220000,
    accountId: 'acc-1',
    categoryId: 'cat-10',
    description: '月給手取り',
    createdAt: '2026-11-01T09:00:00Z',
    updatedAt: '2026-11-01T09:00:00Z',
  },
  {
    id: 'tx-2',
    date: '2026-11-02',
    type: 'expense',
    amount: 3200,
    accountId: 'acc-2',
    categoryId: 'cat-1',
    description: 'スーパーまとめ買い',
    createdAt: '2026-11-02T18:30:00Z',
    updatedAt: '2026-11-02T18:30:00Z',
  },
  {
    id: 'tx-3',
    date: '2026-11-04',
    type: 'expense',
    amount: 1200,
    accountId: 'acc-2',
    categoryId: 'cat-6',
    description: 'カフェ・読書',
    createdAt: '2026-11-04T15:00:00Z',
    updatedAt: '2026-11-04T15:00:00Z',
  },
  {
    id: 'tx-4',
    date: '2026-11-05',
    type: 'expense',
    amount: 6800,
    accountId: 'acc-1',
    categoryId: 'cat-5',
    description: 'スマホ通信費引き落とし',
    createdAt: '2026-11-05T08:00:00Z',
    updatedAt: '2026-11-05T08:00:00Z',
  },
  {
    id: 'tx-5',
    date: '2026-11-07',
    type: 'expense',
    amount: 4500,
    accountId: 'acc-1',
    categoryId: 'cat-3',
    description: '水道光熱費',
    createdAt: '2026-11-07T10:00:00Z',
    updatedAt: '2026-11-07T10:00:00Z',
  },
  {
    id: 'tx-6',
    date: '2026-11-09',
    type: 'expense',
    amount: 2400,
    accountId: 'acc-2',
    categoryId: 'cat-1',
    description: 'ランチ外食',
    createdAt: '2026-11-09T12:30:00Z',
    updatedAt: '2026-11-09T12:30:00Z',
  },
];

export const DEFAULT_BUDGET: MonthlyBudget = {
  id: 'b-2026-11',
  month: '2026-11',
  totalAmount: 120000,
  categoryBudgets: {
    'cat-1': 35000,
    'cat-2': 10000,
    'cat-3': 15000,
    'cat-5': 8000,
    'cat-6': 15000,
  },
};

export const DEFAULT_PLANNED_EXPENSES: PlannedExpense[] = [
  {
    id: 'p-1',
    description: 'Wi-Fiルーター更新費用',
    amount: 5500,
    dueDate: '2026-11-20',
    categoryId: 'cat-5',
    accountId: 'acc-1',
    kind: 'expense',
    repeatType: 'none',
  },
  {
    id: 'p-2',
    description: '友人結婚祝い',
    amount: 30000,
    dueDate: '2026-11-28',
    categoryId: 'cat-6',
    accountId: 'acc-1',
    kind: 'expense',
    repeatType: 'none',
  },
];

export const DEFAULT_SAVINGS_GOAL: SavingsGoal = {
  id: 'goal-1',
  title: '来春の旅行資金',
  targetAmount: 150000,
  currentAmount: 48000,
  deadlineDate: '2027-03-31',
  autoSavingRate: 15,
};

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
