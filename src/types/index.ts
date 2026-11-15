export type AccountType = 'bank' | 'cash' | 'credit_card' | 'wallet' | 'gift_card' | 'other';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  openingBalanceDate: string; // YYYY-MM-DD
  includeInAssets: boolean;
  sortOrder: number;
  isActive: boolean;
  /** クレジットカード設定 (type === 'credit_card') */
  paymentAccountId?: string;
  closingDay?: number;         // 1-28, 31=末日 (デフォルト 31)
  paymentDay?: number;         // 1-28, 31=末日 (デフォルト 28)
  paymentMonthOffset?: number; // 0=当月, 1=翌月, 2=翌々月 (デフォルト 1)
  autoDebitEnabled?: boolean;  // 自動引き落とし計算 (デフォルト true)
  createdAt?: string;
  updatedAt?: string;
}

/**
 * TransactionType:
 * - income       : 収入
 * - expense      : 支出
 * - transfer_out : 口座間振替（移動元）
 * - transfer_in  : 口座間振替（移動先）
 * - transfer     : 旧形式（後方互換のため残す）移動元のみ記録
 * - card_payment : クレジットカード引き落とし
 * - adjustment   : 残高調整
 */
export type TransactionType =
  | 'income'
  | 'expense'
  | 'transfer_out'
  | 'transfer_in'
  | 'transfer'
  | 'card_payment'
  | 'adjustment';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp?: string;
  type: TransactionType;
  amount: number; // 正の整数円
  accountId: string;
  categoryId?: string;
  description: string;
  transferGroupId?: string; // transfer_out と transfer_in を紐付けるID
  linkedCardId?: string;    // クレジットカードと連携する口座ID
  memo?: string;
  isSample?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CategoryKind = 'income' | 'expense' | 'both';

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
}

export interface MonthlyBudget {
  id: string;
  month: string; // YYYY-MM
  totalAmount: number;
  categoryBudgets?: Record<string, number>;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlannedExpense {
  id: string;
  description: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  categoryId?: string;
  accountId?: string;
  kind: 'expense' | 'income';
  repeatType: 'none' | 'monthly' | 'yearly';
  repeatUntil?: string;
  isCompleted?: boolean;
  memo?: string;
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  linkedAccountId?: string;
  deadlineDate?: string; // YYYY-MM-DD
  autoSavingRate?: number;
  createdAt?: string;
}