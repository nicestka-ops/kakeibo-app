import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Account, Category, MonthlyBudget, PlannedExpense, SavingsGoal, Transaction } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchCloudData,
  getCloudSyncMeta,
  hasMeaningfulKakeiboData,
  KAKEIBO_SYNC_TABLE,
  KakeiboCloudPayload,
  saveCloudSyncMeta,
  upsertCloudData,
} from '@/services/sync/cloudSync';
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

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

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
  importTransactionsBatch: (
    newTransactions: Transaction[],
    newAccounts?: Account[],
    newCategories?: Category[]
  ) => void;
  resetToDefaultData: () => void;
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  syncError: string | null;
  syncMissingTable: boolean;
  syncNow: () => Promise<void>;
  migratePayPayExpensesToMastercard: () => number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, supabaseClient } = useAuth();
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

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncMissingTable, setSyncMissingTable] = useState<boolean>(false);

  const hasInitializedSyncRef = useRef<boolean>(false);
  const isApplyingRemoteRef = useRef<boolean>(false);
  const lastSyncedUpdatedAtRef = useRef<string | null>(null);
  const latestPayloadRef = useRef<KakeiboCloudPayload>({
    accounts,
    transactions,
    categories,
    budget,
    plannedExpenses,
    savingsGoals,
  });

  latestPayloadRef.current = {
    accounts,
    transactions,
    categories,
    budget,
    plannedExpenses,
    savingsGoals,
  };

  useEffect(() => { saveToStorage(STORAGE_KEYS.ACCOUNTS, accounts); }, [accounts]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.TRANSACTIONS, transactions); }, [transactions]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.CATEGORIES, categories); }, [categories]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.BUDGETS, budget); }, [budget]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.PLANNED_EXPENSES, plannedExpenses); }, [plannedExpenses]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.SAVINGS_GOALS, savingsGoals); }, [savingsGoals]);

  const applyRemotePayload = useCallback(
    (payload: KakeiboCloudPayload, updatedAt: string, userId: string) => {
      isApplyingRemoteRef.current = true;
      setAccounts(Array.isArray(payload.accounts) ? payload.accounts : DEFAULT_ACCOUNTS);
      setTransactions(Array.isArray(payload.transactions) ? payload.transactions : DEFAULT_TRANSACTIONS);
      setCategories(Array.isArray(payload.categories) ? payload.categories : DEFAULT_CATEGORIES);
      setBudget(payload.budget && typeof payload.budget === 'object' ? payload.budget : DEFAULT_BUDGET);
      setPlannedExpenses(
        Array.isArray(payload.plannedExpenses) ? payload.plannedExpenses : DEFAULT_PLANNED_EXPENSES
      );
      setSavingsGoals(
        Array.isArray(payload.savingsGoals) ? payload.savingsGoals : DEFAULT_SAVINGS_GOALS
      );
      lastSyncedUpdatedAtRef.current = updatedAt;
      saveCloudSyncMeta(userId, updatedAt);
      setLastSyncedAt(updatedAt);
    },
    []
  );

  const pushLocalToCloud = useCallback(async () => {
    if (!user || !supabaseClient) return;
    setSyncStatus('syncing');
    const res = await upsertCloudData(supabaseClient, user.id, latestPayloadRef.current);
    if (res.error) {
      setSyncStatus('error');
      setSyncError(res.error);
      setSyncMissingTable(Boolean(res.missingTable));
      return;
    }
    if (res.updatedAt) {
      lastSyncedUpdatedAtRef.current = res.updatedAt;
      saveCloudSyncMeta(user.id, res.updatedAt);
      setLastSyncedAt(res.updatedAt);
    }
    setSyncError(null);
    setSyncMissingTable(false);
    setSyncStatus('synced');
  }, [user, supabaseClient]);

  const pullOrMergeInitial = useCallback(
    async (isInitial: boolean) => {
      if (!user || !supabaseClient) return;
      setSyncStatus('syncing');
      const remote = await fetchCloudData(supabaseClient, user.id);

      if (remote.error) {
        setSyncStatus('error');
        setSyncError(remote.error);
        setSyncMissingTable(Boolean(remote.missingTable));
        return;
      }

      setSyncMissingTable(false);
      setSyncError(null);

      if (remote.exists && remote.data && remote.updatedAt) {
        const localPayload = latestPayloadRef.current;
        const meta = getCloudSyncMeta(user.id);
        const shouldSeedCloudFromLocal =
          isInitial &&
          !meta &&
          hasMeaningfulKakeiboData(localPayload) &&
          !hasMeaningfulKakeiboData(remote.data);

        if (shouldSeedCloudFromLocal) {
          await pushLocalToCloud();
        } else if (lastSyncedUpdatedAtRef.current !== remote.updatedAt) {
          applyRemotePayload(remote.data, remote.updatedAt, user.id);
          setSyncStatus('synced');
        } else {
          setLastSyncedAt(remote.updatedAt);
          setSyncStatus('synced');
        }
      } else {
        await pushLocalToCloud();
      }
    },
    [user, supabaseClient, applyRemotePayload, pushLocalToCloud]
  );

  // ログイン時の初回同期 & Realtime 購読 & タブ復帰時の再同期
  useEffect(() => {
    if (!user || !supabaseClient) {
      hasInitializedSyncRef.current = false;
      setSyncStatus('idle');
      setSyncError(null);
      setSyncMissingTable(false);
      return;
    }

    let cancelled = false;
    hasInitializedSyncRef.current = false;

    const init = async () => {
      await pullOrMergeInitial(true);
      if (!cancelled) {
        hasInitializedSyncRef.current = true;
      }
    };
    void init();

    const channel = supabaseClient
      .channel(`kakeibo-sync-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: KAKEIBO_SYNC_TABLE,
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as { data?: KakeiboCloudPayload; updated_at?: string } | null;
          if (!row?.data || !row.updated_at) return;
          if (lastSyncedUpdatedAtRef.current === row.updated_at) return;
          applyRemotePayload(row.data, row.updated_at, user.id);
          setSyncError(null);
          setSyncMissingTable(false);
          setSyncStatus('synced');
        }
      )
      .subscribe();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && hasInitializedSyncRef.current) {
        void pullOrMergeInitial(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void supabaseClient.removeChannel(channel);
    };
  }, [user, supabaseClient, pullOrMergeInitial, applyRemotePayload]);

  // ローカルデータ変更時にクラウドへ自動保存（デバウンス）
  useEffect(() => {
    if (!user || !supabaseClient || !hasInitializedSyncRef.current) return;
    if (isApplyingRemoteRef.current) {
      isApplyingRemoteRef.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      void pushLocalToCloud();
    }, 700);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    accounts,
    transactions,
    categories,
    budget,
    plannedExpenses,
    savingsGoals,
    user,
    supabaseClient,
    pushLocalToCloud,
  ]);

  const syncNow = useCallback(async () => {
    if (!user || !supabaseClient) return;
    await pullOrMergeInitial(false);
  }, [user, supabaseClient, pullOrMergeInitial]);

  const migratePayPayExpensesToMastercard = useCallback((): number => {
    const current = latestPayloadRef.current;
    const paypayAccounts = current.accounts.filter((a) => a.name.trim() === 'PayPay銀行');
    if (paypayAccounts.length === 0) return 0;

    const paypayIds = new Set(paypayAccounts.map((a) => a.id));
    const targetTransactions = current.transactions.filter(
      (tx) =>
        paypayIds.has(tx.accountId) &&
        tx.type === 'expense' &&
        !tx.description?.includes('カード引き落とし')
    );
    if (targetTransactions.length === 0) return 0;

    const nowIso = new Date().toISOString();
    const existingCard = current.accounts.find(
      (a) => a.name.trim().toLowerCase() === 'amazon prime mastercard'
    );

    let cardId: string;
    let nextAccounts = [...current.accounts];

    const paypayBankId = paypayAccounts[0].id;

    if (existingCard) {
      cardId = existingCard.id;
      if (
        existingCard.type !== 'credit_card' ||
        existingCard.includeInAssets !== false ||
        !existingCard.paymentAccountId
      ) {
        nextAccounts = nextAccounts.map((a) =>
          a.id === cardId
            ? {
                ...a,
                type: 'credit_card',
                includeInAssets: false,
                paymentAccountId: a.paymentAccountId || paypayBankId,
                closingDay: a.closingDay ?? 31,
                paymentDay: a.paymentDay ?? 28,
                paymentMonthOffset: a.paymentMonthOffset ?? 1,
                autoDebitEnabled: a.autoDebitEnabled ?? true,
                updatedAt: nowIso,
              }
            : a
        );
      }
    } else {
      cardId = `acc-amz-mc-${Date.now()}`;
      const earliestDate = targetTransactions.reduce(
        (min, tx) => (tx.date < min ? tx.date : min),
        targetTransactions[0].date
      );
      const newCardAccount: Account = {
        id: cardId,
        name: 'Amazon Prime Mastercard',
        type: 'credit_card',
        openingBalance: 0,
        openingBalanceDate: earliestDate,
        includeInAssets: false,
        paymentAccountId: paypayBankId,
        closingDay: 31,
        paymentDay: 28,
        paymentMonthOffset: 1,
        autoDebitEnabled: true,
        sortOrder: nextAccounts.length + 1,
        isActive: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      nextAccounts = [...nextAccounts, newCardAccount];
    }

    const nextTransactions = current.transactions.map((tx) =>
      paypayIds.has(tx.accountId) &&
      tx.type === 'expense' &&
      !tx.description?.includes('カード引き落とし')
        ? { ...tx, accountId: cardId, updatedAt: nowIso }
        : tx
    );

    setAccounts(nextAccounts);
    setTransactions(nextTransactions);
    return targetTransactions.length;
  }, []);

  // 初回同期完了後に PayPay銀行の支出を Amazon Prime Mastercard へ自動修正（1回のみ）
  useEffect(() => {
    const migrationKey = 'kakeibo_migrated_paypay_to_amz_card_v1';
    if (localStorage.getItem(migrationKey) === 'done') return;
    if (user && supabaseClient && syncStatus !== 'synced') return;

    const migratedCount = migratePayPayExpensesToMastercard();
    if (migratedCount > 0 || (syncStatus === 'synced' || !user)) {
      localStorage.setItem(migrationKey, 'done');
    }
  }, [user, supabaseClient, syncStatus, migratePayPayExpensesToMastercard]);

  // 既存のクレジットカード口座に引き落とし設定が未設定の場合、デフォルト設定を補完（1回のみ）
  useEffect(() => {
    const billingMigrationKey = 'kakeibo_migrated_card_billing_v1';
    if (localStorage.getItem(billingMigrationKey) === 'done') return;
    if (user && supabaseClient && syncStatus !== 'synced') return;

    const current = latestPayloadRef.current;
    const paypayBank = current.accounts.find((a) => a.name.trim() === 'PayPay銀行');
    const cardsNeedingDefaults = current.accounts.filter(
      (a) =>
        a.type === 'credit_card' &&
        (a.closingDay === undefined ||
          a.paymentDay === undefined ||
          a.paymentMonthOffset === undefined ||
          (paypayBank && !a.paymentAccountId && a.autoDebitEnabled === undefined))
    );

    if (cardsNeedingDefaults.length > 0) {
      const nowIso = new Date().toISOString();
      setAccounts((prev) =>
        prev.map((a) => {
          if (a.type !== 'credit_card') return a;
          return {
            ...a,
            paymentAccountId: a.paymentAccountId || paypayBank?.id,
            closingDay: a.closingDay ?? 31,
            paymentDay: a.paymentDay ?? 28,
            paymentMonthOffset: a.paymentMonthOffset ?? 1,
            autoDebitEnabled: a.autoDebitEnabled ?? true,
            updatedAt: nowIso,
          };
        })
      );
    }

    if (syncStatus === 'synced' || !user) {
      localStorage.setItem(billingMigrationKey, 'done');
    }
  }, [user, supabaseClient, syncStatus]);

  // 誤ってクレジットカード口座へ移行された「カード引き落とし」取引を銀行口座の card_payment へ修復（1回のみ）
  useEffect(() => {
    const fixKey = 'kakeibo_fix_card_debit_tx_v1';
    if (localStorage.getItem(fixKey) === 'done') return;
    if (user && supabaseClient && syncStatus !== 'synced') return;

    const current = latestPayloadRef.current;
    const paypayBank = current.accounts.find((a) => a.name.trim() === 'PayPay銀行');
    const cardMap = new Map(
      current.accounts.filter((a) => a.type === 'credit_card').map((a) => [a.id, a])
    );

    let fixedCount = 0;
    const nowIso = new Date().toISOString();
    const nextTransactions = current.transactions.map((tx) => {
      if (tx.type !== 'expense' || !tx.description?.includes('カード引き落とし')) {
        return tx;
      }
      const card = cardMap.get(tx.accountId);
      const targetBankId = card?.paymentAccountId || paypayBank?.id;
      if (card && targetBankId) {
        fixedCount += 1;
        return {
          ...tx,
          accountId: targetBankId,
          type: 'card_payment' as const,
          linkedCardId: card.id,
          updatedAt: nowIso,
        };
      }
      return tx;
    });

    if (fixedCount > 0) {
      setTransactions(nextTransactions);
    }

    if (syncStatus === 'synced' || !user) {
      localStorage.setItem(fixKey, 'done');
    }
  }, [user, supabaseClient, syncStatus]);

  const categoryNameMap = new Map(categories.map((c) => [c.id, c.name]));
  const accountBalances = calculateAccountBalances(accounts, transactions, undefined, categoryNameMap);
  const financialSummary = calculateFinancialSummary(accounts, accountBalances);
  const monthlyCashFlow = calculateMonthlyCashFlow(transactions, selectedYearMonth, categoryNameMap);
  const categoryBreakdown = calculateCategoryBreakdown(transactions, selectedYearMonth, categoryNameMap);

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

  const importTransactionsBatch = (
    newTransactions: Transaction[],
    newAccounts: Account[] = [],
    newCategories: Category[] = []
  ) => {
    if (newAccounts.length > 0) {
      setAccounts((prev) => [...prev, ...newAccounts]);
    }
    if (newCategories.length > 0) {
      setCategories((prev) => [...prev, ...newCategories]);
    }
    if (newTransactions.length > 0) {
      setTransactions((prev) => [...newTransactions, ...prev]);
    }
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
        importTransactionsBatch,
        resetToDefaultData,
        syncStatus,
        lastSyncedAt,
        syncError,
        syncMissingTable,
        syncNow,
        migratePayPayExpensesToMastercard,
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