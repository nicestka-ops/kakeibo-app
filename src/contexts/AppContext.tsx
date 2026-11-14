import React, { createContext, useContext, useState, useEffect } from 'react';
import { Account, Category, MonthlyBudget, PlannedExpense, SavingsGoal, Transaction } from '@/types';
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_BUDGET,
  DEFAULT_CATEGORIES,
  DEFAULT_PLANNED_EXPENSES,
  DEFAULT_SAVINGS_GOALS,
  DEFAULT_TRANSACTIONS,
  loadFromStorage,
  saveToStorage,
  STORAGE_KEYS,
} from '@/services/storage/localStorage';
import {
  calculateAccountBalances,
  calculateCategoryBreakdown,
  calculateFinancialSummary,
  calculateMonthlyCashFlow,
  FinancialSummary,
  MonthlyCashFlow,
} from '@/services/calculation/balanceEngine';

/** 振替入力用の追加フィールド */
export interface TransferInput {
  toAccountId: string; // 振替先口座ID
}

interface AppContextType {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  budget: MonthlyBudget;
  plannedExpenses: PlannedExpense[];
  savingsGoals: SavingsGoal[];
  selectedYearMonth: string;
  setSelectedYearMonth: (ym: string) => void;
  accountBalances: Record<string, number>;
  financialSummary: FinancialSummary;
  monthlyCashFlow: MonthlyCashFlow;
  categoryBreakdown: Record<string, number>;
  /** 通常の取引を追加する */
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => void;
  /** 口座間振替を追加する（移動元・移動先の2エントリを自動生成） */
  addTransfer: (
    base: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'type'>,
    toAccountId: string
  ) => void;
  updateTransaction: (id: string, tx: Partial<Transaction>) => void;
  /** 取引を削除する。振替ペア（transferGroupId 共有）は両方削除する */
  deleteTransaction: (id: string) => void;
  addAccount: (acc: Omit<Account, 'id'>) => void;
  updateAccount: (id: string, acc: Partial<Account>) => void;
  updateBudget: (budget: Partial<MonthlyBudget>) => void;
  addPlannedExpense: (item: Omit<PlannedExpense, 'id'>) => void;
  deletePlannedExpense: (id: string) => void;
  addSavingsGoal: (goal: Omit<SavingsGoal, 'id'>) => void;
  updateSavingsGoal: (id: string, goal: Partial<SavingsGoal>) => void;
  resetToDefaultData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [accounts, setAccounts] = useState<Account[]>(() =>
    loadFromStorage(STORAGE_KEYS.ACCOUNTS, DEFAULT_ACCOUNTS)
  );
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    loadFromStorage(STORAGE_KEYS.TRANSACTIONS, DEFAULT_TRANSACTIONS)
  );
  const [categories, setCategories] = useState<Category[]>(() =>
    loadFromStorage(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES)
  );
  const [budget, setBudget] = useState<MonthlyBudget>(() =>
    loadFromStorage(STORAGE_KEYS.BUDGETS, DEFAULT_BUDGET)
  );
  const [plannedExpenses, setPlannedExpenses] = useState<PlannedExpense[]>(() =>
    loadFromStorage(STORAGE_KEYS.PLANNED_EXPENSES, DEFAULT_PLANNED_EXPENSES)
  );
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(() =>
    loadFromStorage(STORAGE_KEYS.SAVINGS_GOALS, DEFAULT_SAVINGS_GOALS)
  );

  useEffect(() => { saveToStorage(STORAGE_KEYS.ACCOUNTS, accounts); }, [accounts]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.TRANSACTIONS, transactions); }, [transactions]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.CATEGORIES, categories); }, [categories]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.BUDGETS, budget); }, [budget]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.PLANNED_EXPENSES, plannedExpenses); }, [plannedExpenses]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.SAVINGS_GOALS, savingsGoals); }, [savingsGoals]);

  const accountBalances = calculateAccountBalances(accounts, transactions);
  const financialSummary = calculateFinancialSummary(accounts, accountBalances);
  const monthlyCashFlow = calculateMonthlyCashFlow(transactions, selectedYearMonth);
  const categoryBreakdown = calculateCategoryBreakdown(transactions, selectedYearMonth);

  const makeId = () => `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const addTransaction = (newTx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const tx: Transaction = {
      ...newTx,
      id: makeId(),
      createdAt: now,
      updatedAt: now,
    };
    setTransactions((prev) => [tx, ...prev]);
  };

  /**
   * 口座間振替を2エントリで記録する。
   * - transfer_out: 移動元口座の残高を減らす
   * - transfer_in:  移動先口座の残高を増やす
   * - 両エントリは同じ transferGroupId を持つ
   */
  const addTransfer = (
    base: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'type'>,
    toAccountId: string
  ) => {
    const now = new Date().toISOString();
    const groupId = `trf-${Date.now()}`;
    const outTx: Transaction = {
      ...base,
      id: makeId(),
      type: 'transfer_out',
      transferGroupId: groupId,
      createdAt: now,
      updatedAt: now,
    };
    const inTx: Transaction = {
      ...base,
      id: makeId(),
      type: 'transfer_in',
      accountId: toAccountId,
      transferGroupId: groupId,
      createdAt: now,
      updatedAt: now,
    };
    setTransactions((prev) => [outTx, inTx, ...prev]);
  };

  const updateTransaction = (id: string, updatedFields: Partial<Transaction>) => {
    setTransactions((prev) =>
      prev.map((tx) =>
        tx.id === id ? { ...tx, ...updatedFields, updatedAt: new Date().toISOString() } : tx
      )
    );
  };

  /**
   * 取引を削除する。
   * 振替（transfer_out / transfer_in）の場合は、同じ transferGroupId を持つ
   * 両エントリをまとめて削除する。
   */
  const deleteTransaction = (id: string) => {
    setTransactions((prev) => {
      const target = prev.find((tx) => tx.id === id);
      if (target?.transferGroupId) {
        // 振替ペアを両方削除
        return prev.filter((tx) => tx.transferGroupId !== target.transferGroupId);
      }
      return prev.filter((tx) => tx.id !== id);
    });
  };

  const addAccount = (newAcc: Omit<Account, 'id'>) => {
    const acc: Account = { ...newAcc, id: `acc-${Date.now()}` };
    setAccounts((prev) => [...prev, acc]);
  };

  const updateAccount = (id: string, updatedFields: Partial<Account>) => {
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === id ? { ...acc, ...updatedFields } : acc))
    );
  };

  const updateBudget = (updated: Partial<MonthlyBudget>) => {
    setBudget((prev) => ({ ...prev, ...updated, updatedAt: new Date().toISOString() }));
  };

  const addPlannedExpense = (item: Omit<PlannedExpense, 'id'>) => {
    setPlannedExpenses((prev) => [...prev, { ...item, id: `plan-${Date.now()}` }]);
  };

  const deletePlannedExpense = (id: string) => {
    setPlannedExpenses((prev) => prev.filter((p) => p.id !== id));
  };

  const addSavingsGoal = (goal: Omit<SavingsGoal, 'id'>) => {
    setSavingsGoals((prev) => [
      ...prev,
      { ...goal, id: `goal-${Date.now()}`, createdAt: new Date().toISOString() },
    ]);
  };

  const updateSavingsGoal = (id: string, updatedFields: Partial<SavingsGoal>) => {
    setSavingsGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...updatedFields } : g))
    );
  };

  const resetToDefaultData = () => {
    setAccounts(DEFAULT_ACCOUNTS);
    setTransactions(DEFAULT_TRANSACTIONS);
    setCategories(DEFAULT_CATEGORIES);
    setBudget(DEFAULT_BUDGET);
    setPlannedExpenses(DEFAULT_PLANNED_EXPENSES);
    setSavingsGoals(DEFAULT_SAVINGS_GOALS);
  };

  return (
    <AppContext.Provider
      value={{
        accounts,
        transactions,
        categories,
        budget,
        plannedExpenses,
        savingsGoals,
        selectedYearMonth,
        setSelectedYearMonth,
        accountBalances,
        financialSummary,
        monthlyCashFlow,
        categoryBreakdown,
        addTransaction,
        addTransfer,
        updateTransaction,
        deleteTransaction,
        addAccount,
        updateAccount,
        updateBudget,
        addPlannedExpense,
        deletePlannedExpense,
        addSavingsGoal,
        updateSavingsGoal,
        resetToDefaultData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};