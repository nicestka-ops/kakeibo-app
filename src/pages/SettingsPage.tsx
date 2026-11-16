import React, { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  ACCENT_COLOR_PRESETS,
  CUSTOM_COLOR_META,
  useTheme,
} from '@/contexts/ThemeContext';
import { SubPageHeader } from '@/components/common/SubPageHeader';
import { exportTransactionsCSV, importTransactionsCSV } from '@/services/migration/csvImporter';
import { calculateCardBillingSummary, getTodayDateString } from '@/services/calculation/cardBilling';
import { Account, Category } from '@/types';
import {
  Wallet,
  Tag,
  Target,
  CreditCard,
  Database,
  Palette,
  Sliders,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Pencil,
  Trash2,
  Plus,
  LogOut,
  LogIn,
  User as UserIcon,
  Sun,
  Moon,
  RotateCcw,
  Download,
  Upload,
  Search,
  RefreshCw,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { section } = useParams<{ section?: string }>();
  const navigate = useNavigate();

  const {
    accounts,
    categories,
    transactions,
    budget,
    accountBalances,
    addAccount,
    updateAccount,
    deleteAccount,
    reorderAccounts,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    updateBudget,
    importTransactionsBatch,
    resetToDefaultData,
    syncStatus,
    syncNow,
  } = useApp();
  const { user, isConfigured, signInWithGoogle, signOut } = useAuth();
  const {
    theme,
    setTheme,
    accentColor,
    setAccentColor,
    customColors,
    setCustomColor,
    resetCustomColors,
  } = useTheme();

  // 口座管理 state
  const [newAccountName, setNewAccountName] = useState('');
  const [editingAccId, setEditingAccId] = useState<string | null>(null);
  const [editAccName, setEditAccName] = useState('');
  const [editAccBalance, setEditAccBalance] = useState('');
  const [editAccPayDay, setEditAccPayDay] = useState('26');

  // カテゴリ管理 state
  const [newCatName, setNewCatName] = useState('');
  const [newCatKind, setNewCatKind] = useState<'expense' | 'income'>('expense');
  const [newCatColor, setNewCatColor] = useState('#3b82f6');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatColor, setEditCatColor] = useState('#3b82f6');

  // 予算設定 state
  const [budgetInput, setBudgetInput] = useState<string>(() => String(budget.totalAmount || 0));
  const [budgetSaved, setBudgetSaved] = useState(false);

  // カード設定・支払い履歴 state
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardPayAccId, setCardPayAccId] = useState('');
  const [cardClosingDay, setCardClosingDay] = useState(31);
  const [cardPaymentDay, setCardPaymentDay] = useState(26);
  const [cardMonthOffset, setCardMonthOffset] = useState(1);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [paymentCardFilter, setPaymentCardFilter] = useState<string>('all');
  const [paymentMonthFilter, setPaymentMonthFilter] = useState<string>('all');
  const [paymentSearch, setPaymentSearch] = useState('');

  // データ管理 state
  const csvInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const sortedAccounts = useMemo(
    () => [...accounts].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [accounts]
  );
  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [categories]
  );

  const categoryNameMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const todayStr = getTodayDateString();

  // カード支払い履歴リスト生成
  const cardHistoryRows = useMemo(() => {
    const cards = accounts.filter((a) => a.type === 'credit_card' && a.isActive);
    const rows: Array<{
      id: string;
      cardId: string;
      cardName: string;
      payBankName: string;
      closingYm: string;
      debitDate: string;
      amount: number;
      status: 'paid' | 'unpaid';
    }> = [];

    for (const card of cards) {
      const summary = calculateCardBillingSummary(card, transactions, todayStr, categoryNameMap);
      const payBankName = card.paymentAccountId
        ? accountMap.get(card.paymentAccountId)?.name || card.name
        : card.name;

      // 未払いサイクル
      for (const cycle of summary.unpaidCycles) {
        rows.push({
          id: `${card.id}-${cycle.closingYm}-unpaid`,
          cardId: card.id,
          cardName: card.name,
          payBankName,
          closingYm: cycle.closingYm,
          debitDate: cycle.debitDate,
          amount: cycle.amount,
          status: 'unpaid',
        });
      }

      // 過去月（引き落とし済み）
      const monthTotals = new Map<string, number>();
      for (const tx of transactions) {
        if (tx.accountId !== card.id || tx.type !== 'expense') continue;
        const ym = tx.date.slice(0, 7);
        monthTotals.set(ym, (monthTotals.get(ym) || 0) + Math.round(Math.abs(tx.amount)));
      }
      const unpaidSet = new Set(summary.unpaidCycles.map((c) => c.closingYm));
      for (const [ym, amt] of monthTotals.entries()) {
        if (unpaidSet.has(ym)) continue;
        rows.push({
          id: `${card.id}-${ym}-paid`,
          cardId: card.id,
          cardName: card.name,
          payBankName,
          closingYm: ym,
          debitDate: `${ym}-${String(card.paymentDay ?? 26).padStart(2, '0')}`,
          amount: amt,
          status: 'paid',
        });
      }
    }

    return rows.sort((a, b) => b.closingYm.localeCompare(a.closingYm));
  }, [accounts, transactions, todayStr, categoryNameMap, accountMap]);

  const filteredCardHistory = useMemo(() => {
    const q = paymentSearch.trim().toLowerCase();
    return cardHistoryRows.filter((r) => {
      if (paymentStatusFilter !== 'all' && r.status !== paymentStatusFilter) return false;
      if (paymentCardFilter !== 'all' && r.cardId !== paymentCardFilter) return false;
      if (paymentMonthFilter !== 'all' && r.closingYm !== paymentMonthFilter) return false;
      if (q) {
        const matchText =
          `${r.closingYm} ${r.payBankName} ${r.cardName} ${r.amount}`.toLowerCase();
        if (!matchText.includes(q)) return false;
      }
      return true;
    });
  }, [cardHistoryRows, paymentStatusFilter, paymentCardFilter, paymentMonthFilter, paymentSearch]);

  // --- Subpage 1: 口座・資産管理 ---
  if (section === 'accounts') {
    const startEditAcc = (acc: Account) => {
      setEditingAccId(acc.id);
      setEditAccName(acc.name);
      setEditAccBalance(String(accountBalances[acc.id] ?? acc.openingBalance));
      setEditAccPayDay(String(acc.paymentDay ?? 26));
    };

    const saveEditAcc = (acc: Account) => {
      const targetBal = Math.round(Number(editAccBalance));
      const currentBal = accountBalances[acc.id] ?? acc.openingBalance;
      const diff = isNaN(targetBal) ? 0 : targetBal - currentBal;
      updateAccount(acc.id, {
        name: editAccName.trim() || acc.name,
        openingBalance: acc.openingBalance + diff,
        paymentDay: acc.type === 'credit_card' ? Number(editAccPayDay) || 26 : acc.paymentDay,
      });
      setEditingAccId(null);
    };

    const handleAddAcc = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newAccountName.trim()) return;
      addAccount({
        name: newAccountName.trim(),
        type: 'bank',
        openingBalance: 0,
        openingBalanceDate: todayStr,
        includeInAssets: true,
        sortOrder: sortedAccounts.length + 1,
        isActive: true,
      });
      setNewAccountName('');
    };

    return (
      <div className="space-y-4 animate-fadeIn">
        <SubPageHeader
          title="口座・資産管理"
          subtitle="口座の追加・編集・削除、資産項目の管理"
          backTo="/settings"
        />

        <div className="rounded-3xl p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
              決済手段・口座管理
            </h2>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              クレジットカード口座は利用時に「今月のカード支払い金額」へプールされ、引き落とし日にまとめて計算されます。
            </p>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {sortedAccounts.map((acc, idx) => {
              const isEditing = editingAccId === acc.id;
              return (
                <div key={acc.id} className="py-3 space-y-2">
                  {isEditing ? (
                    <div className="space-y-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70">
                      <input
                        type="text"
                        value={editAccName}
                        onChange={(e) => setEditAccName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        {acc.type === 'credit_card' && (
                          <div>
                            <label className="block text-[10px] text-slate-400 mb-1">
                              引き落とし日
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={31}
                              value={editAccPayDay}
                              onChange={(e) => setEditAccPayDay(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                            />
                          </div>
                        )}
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">
                            現在の残高（確定値）
                          </label>
                          <input
                            type="number"
                            value={editAccBalance}
                            onChange={(e) => setEditAccBalance(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingAccId(null)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500"
                        >
                          キャンセル
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEditAcc(acc)}
                          className="px-4 py-1.5 rounded-xl bg-primary-600 text-white text-xs font-bold"
                        >
                          完了
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                          {acc.name}
                        </span>
                        {acc.type === 'credit_card' && (
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[10px] font-bold shrink-0">
                            カード
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0 text-slate-400">
                        <button
                          type="button"
                          onClick={() => reorderAccounts(idx, idx - 1)}
                          disabled={idx === 0}
                          className="p-1.5 hover:text-slate-700 disabled:opacity-30"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => reorderAccounts(idx, idx + 1)}
                          disabled={idx === sortedAccounts.length - 1}
                          className="p-1.5 hover:text-slate-700 disabled:opacity-30"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditAcc(acc)}
                          className="p-1.5 hover:text-primary-600"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`「${acc.name}」を削除しますか？`)) deleteAccount(acc.id);
                          }}
                          className="p-1.5 hover:text-rose-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <form onSubmit={handleAddAcc} className="flex gap-2 pt-2">
            <input
              type="text"
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              placeholder="新しい決済手段名"
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-primary-600 text-white text-xs font-bold inline-flex items-center gap-1 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>追加</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- Subpage 2: カテゴリ管理 ---
  if (section === 'categories') {
    const startEditCat = (cat: Category) => {
      setEditingCatId(cat.id);
      setEditCatName(cat.name);
      setEditCatColor(cat.color || '#3b82f6');
    };

    const handleAddCat = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newCatName.trim()) return;
      addCategory({
        name: newCatName.trim(),
        kind: newCatKind,
        icon: 'Tag',
        color: newCatColor,
        sortOrder: sortedCategories.length + 1,
        isActive: true,
      });
      setNewCatName('');
    };

    return (
      <div className="space-y-4 animate-fadeIn">
        <SubPageHeader
          title="カテゴリ管理"
          subtitle="収入・支出カテゴリーの追加・編集・削除"
          backTo="/settings"
        />

        <div className="rounded-3xl p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {sortedCategories.map((cat, idx) => (
              <div key={cat.id} className="py-2.5">
                {editingCatId === cat.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editCatColor}
                      onChange={(e) => setEditCatColor(e.target.value)}
                      className="w-8 h-8 rounded-lg border-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={editCatName}
                      onChange={(e) => setEditCatName(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        updateCategory(cat.id, {
                          name: editCatName.trim() || cat.name,
                          color: editCatColor,
                        });
                        setEditingCatId(null);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-primary-600 text-white text-xs font-bold"
                    >
                      保存
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color || '#94a3b8' }}
                      />
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                        {cat.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 text-slate-400">
                      <button
                        type="button"
                        onClick={() => reorderCategories(idx, idx - 1)}
                        disabled={idx === 0}
                        className="p-1.5 hover:text-slate-700 disabled:opacity-30"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => reorderCategories(idx, idx + 1)}
                        disabled={idx === sortedCategories.length - 1}
                        className="p-1.5 hover:text-slate-700 disabled:opacity-30"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => startEditCat(cat)}
                        className="p-1.5 hover:text-primary-600"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`「${cat.name}」を削除しますか？`)) deleteCategory(cat.id);
                        }}
                        className="p-1.5 hover:text-rose-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleAddCat} className="flex flex-wrap gap-2 pt-2">
            <input
              type="color"
              value={newCatColor}
              onChange={(e) => setNewCatColor(e.target.value)}
              className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer"
            />
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="新しいカテゴリー名"
              className="flex-1 min-w-[120px] px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
            />
            <select
              value={newCatKind}
              onChange={(e) => setNewCatKind(e.target.value as 'expense' | 'income')}
              className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
            >
              <option value="expense">支出</option>
              <option value="income">収入</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold inline-flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>追加</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- Subpage 3: 予算設定 ---
  if (section === 'budget') {
    const handleSaveBudget = (e: React.FormEvent) => {
      e.preventDefault();
      const val = Math.max(0, Math.round(Number(budgetInput) || 0));
      updateBudget({ totalAmount: val });
      setBudgetSaved(true);
      window.setTimeout(() => setBudgetSaved(false), 2000);
    };

    return (
      <div className="space-y-4 animate-fadeIn">
        <SubPageHeader
          title="予算設定"
          subtitle="月間予算の設定と変更"
          backTo="/settings"
        />

        <form
          onSubmit={handleSaveBudget}
          className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4"
        >
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
              月間総予算の設定
            </h2>
            <p className="text-[11px] text-slate-400 mt-1">
              1ヶ月にいくら使うかの目安を設定します。設定した金額は他の月でも引き継がれます。
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                ¥
              </span>
              <input
                type="number"
                inputMode="numeric"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className="w-full pl-9 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-lg font-extrabold"
              />
            </div>
            <span className="text-xs font-bold text-slate-400">円/月</span>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm shadow-lg shadow-primary-500/25 transition"
          >
            {budgetSaved ? '保存しました ✓' : '月間総予算を保存'}
          </button>
        </form>
      </div>
    );
  }

  // --- Subpage 4: カード設定 ---
  if (section === 'cards') {
    const cards = sortedAccounts.filter((a) => a.type === 'credit_card');
    const bankAccounts = sortedAccounts.filter((a) => a.type !== 'credit_card');
    const paidSum = filteredCardHistory
      .filter((r) => r.status === 'paid')
      .reduce((s, r) => s + r.amount, 0);
    const unpaidSum = filteredCardHistory
      .filter((r) => r.status === 'unpaid')
      .reduce((s, r) => s + r.amount, 0);
    const uniqueMonths = Array.from(new Set(cardHistoryRows.map((r) => r.closingYm))).sort((a, b) =>
      b.localeCompare(a)
    );

    return (
      <div className="space-y-4 animate-fadeIn">
        <SubPageHeader
          title="カード設定"
          subtitle="締め日・支払日・支払口座の管理"
          backTo="/settings"
        />

        {/* カード設定カード */}
        <div className="rounded-3xl p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
              カード設定
            </h2>
            <p className="text-[11px] text-slate-400 mt-1">
              締め日以前は未確定、翌月の引き落とし日に引き落とし口座から1回だけ精算されます。
            </p>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {sortedAccounts.map((acc) => {
              const isCard = acc.type === 'credit_card';
              const isEditing = editingCardId === acc.id;
              const payBankName = acc.paymentAccountId
                ? accountMap.get(acc.paymentAccountId)?.name || '未設定'
                : '未設定';

              return (
                <div key={acc.id} className="py-3">
                  {isEditing ? (
                    <div className="space-y-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70">
                      <p className="text-xs font-extrabold">{acc.name}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">
                            引落口座
                          </label>
                          <select
                            value={cardPayAccId}
                            onChange={(e) => setCardPayAccId(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                          >
                            <option value="">未設定</option>
                            {bankAccounts.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">締め日</label>
                          <input
                            type="number"
                            min={1}
                            max={31}
                            value={cardClosingDay}
                            onChange={(e) => setCardClosingDay(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">支払日</label>
                          <input
                            type="number"
                            min={1}
                            max={31}
                            value={cardPaymentDay}
                            onChange={(e) => setCardPaymentDay(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">支払月</label>
                          <select
                            value={cardMonthOffset}
                            onChange={(e) => setCardMonthOffset(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                          >
                            <option value={0}>当月</option>
                            <option value={1}>翌月</option>
                            <option value={2}>翌々月</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingCardId(null)}
                          className="px-3 py-1.5 text-xs text-slate-500"
                        >
                          キャンセル
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            updateAccount(acc.id, {
                              type: 'credit_card',
                              paymentAccountId: cardPayAccId || undefined,
                              closingDay: cardClosingDay,
                              paymentDay: cardPaymentDay,
                              paymentMonthOffset: cardMonthOffset,
                            });
                            setEditingCardId(null);
                          }}
                          className="px-4 py-1.5 rounded-xl bg-primary-600 text-white text-xs font-bold"
                        >
                          保存
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                          {acc.name}
                        </p>
                        {isCard ? (
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            締め: {(acc.closingDay ?? 31) >= 29 ? '月末' : `${acc.closingDay}日`} / 支払日: 翌月{acc.paymentDay ?? 26}日 / 引落口座: {payBankName}
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-400 mt-0.5">通常口座</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isCard && (
                          <span className="text-[11px] font-bold text-primary-600">
                            毎月{acc.paymentDay ?? 26}日引き落とし
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCardId(acc.id);
                            setCardPayAccId(acc.paymentAccountId || '');
                            setCardClosingDay(acc.closingDay ?? 31);
                            setCardPaymentDay(acc.paymentDay ?? 26);
                            setCardMonthOffset(acc.paymentMonthOffset ?? 1);
                          }}
                          className="p-1.5 text-slate-400 hover:text-primary-600"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 支払い履歴カード */}
        <div className="rounded-3xl p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
              支払い履歴
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              実際に口座から引き落とされたカード請求の履歴です
            </p>
          </div>

          <div className="grid grid-cols-3 p-1 bg-slate-100 dark:bg-slate-800 rounded-full">
            {[
              { id: 'all' as const, label: 'すべて' },
              { id: 'paid' as const, label: '支払い済み' },
              { id: 'unpaid' as const, label: '未払い' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setPaymentStatusFilter(t.id)}
                className={`py-1.5 rounded-full text-xs font-bold transition ${
                  paymentStatusFilter === t.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={paymentCardFilter}
              onChange={(e) => setPaymentCardFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
            >
              <option value="all">カード: すべて</option>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={paymentMonthFilter}
              onChange={(e) => setPaymentMonthFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
            >
              <option value="all">利用月: すべて</option>
              {uniqueMonths.map((ym) => (
                <option key={ym} value={ym}>
                  {ym.replace('-', '年')}月
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={paymentSearch}
              onChange={(e) => setPaymentSearch(e.target.value)}
              placeholder="キーワード・金額で検索"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>{filteredCardHistory.length}件</span>
            <span className="tabular-nums">
              支払い済み ¥{paidSum.toLocaleString()} / 未払い ¥{unpaidSum.toLocaleString()}
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredCardHistory.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">該当する履歴はありません</p>
            ) : (
              filteredCardHistory.map((row) => (
                <div key={row.id} className="py-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                      {row.closingYm.replace('-', '年')}月分・{row.payBankName}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {row.debitDate} {row.status === 'unpaid' ? '引き落とし予定' : '引き落とし済み'}
                    </p>
                  </div>
                  <div className="text-right tabular-nums">
                    <p className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
                      ¥{row.amount.toLocaleString()}
                    </p>
                    <p
                      className={`text-[10px] font-bold ${
                        row.status === 'unpaid' ? 'text-amber-500' : 'text-emerald-600'
                      }`}
                    >
                      {row.status === 'unpaid' ? '未払い' : '支払い済み'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- Subpage 5: データ管理 ---
  if (section === 'data') {
    const handleExportCSV = () => {
      const accMap = new Map(accounts.map((a) => [a.id, a.name]));
      const catMap = new Map(categories.map((c) => [c.id, c.name]));
      const csv = exportTransactionsCSV(transactions, accMap, catMap);
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kakeibo-${todayStr}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    };

    const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      const accRev = new Map(accounts.map((a) => [a.name, a.id]));
      const catRev = new Map(categories.map((c) => [c.name, c.id]));
      const res = importTransactionsCSV(text, accRev, catRev);
      if (!res.success) {
        alert(res.errors[0] || 'CSVの読み込みに失敗しました');
        return;
      }
      const { addedCount, skippedCount } = importTransactionsBatch(
        res.data,
        res.createdAccounts || [],
        res.createdCategories || []
      );
      alert(`インポート完了: ${addedCount}件追加（重複スキップ ${skippedCount}件）`);
      e.target.value = '';
    };

    const handleBackupJSON = () => {
      const payload = {
        accounts,
        transactions,
        categories,
        budget,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kakeibo-backup-${todayStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
    };

    return (
      <div className="space-y-4 animate-fadeIn">
        <SubPageHeader
          title="データ管理"
          subtitle="CSV入出力・バックアップ・復元"
          backTo="/settings"
        />

        <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
            CSV データ入出力
          </h2>
          <p className="text-[11px] text-slate-400">
            Googleフォーム回答形式（タイムスタンプ, 金額, タイプ, 決済手段, カテゴリー, 利用日, 内容）のCSVを一括取り込み・出力できます
          </p>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => csvInputRef.current?.click()}
              className="py-3 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-primary-600 dark:text-primary-400 text-xs font-bold inline-flex items-center justify-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>インポート</span>
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold inline-flex items-center justify-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              <span>エクスポート</span>
            </button>
          </div>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleImportCSV}
          />
        </div>

        <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
            バックアップ・復元
          </h2>
          <p className="text-[11px] text-slate-400">
            取引・口座・カテゴリー・予算データをJSON形式で保存します
          </p>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={handleBackupJSON}
              className="py-3 rounded-2xl bg-primary-600 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>バックアップ</span>
            </button>
            <button
              type="button"
              onClick={() => jsonInputRef.current?.click()}
              className="py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold inline-flex items-center justify-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              <span>復元</span>
            </button>
          </div>
          <input
            ref={jsonInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const parsed = JSON.parse(await file.text());
                if (Array.isArray(parsed.transactions)) {
                  const res = importTransactionsBatch(
                    parsed.transactions,
                    parsed.accounts || [],
                    parsed.categories || []
                  );
                  alert(`復元完了: ${res.addedCount}件追加`);
                }
              } catch {
                alert('JSONの読み込みに失敗しました');
              }
              e.target.value = '';
            }}
          />
        </div>

        <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900/40 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-extrabold text-rose-600">全データ初期化</p>
            <p className="text-[11px] text-slate-400">ローカルデータを初期状態に戻します</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (confirm('本当にすべてのデータを初期化しますか？')) {
                resetToDefaultData();
              }
            }}
            className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 text-xs font-bold"
          >
            初期化
          </button>
        </div>
      </div>
    );
  }

  // --- Subpage 6: デザイン設定 ---
  if (section === 'design') {
    return (
      <div className="space-y-4 animate-fadeIn">
        <SubPageHeader
          title="デザイン設定"
          subtitle="表示モード・テーマカラー・カラー設定"
          backTo="/settings"
        />

        <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-5">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
              デザイン設定
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              テーマカラーや表示モードはこの端末に保存されます
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">表示モード</p>
            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`py-2.5 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition ${
                  theme === 'light'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>ライト</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`py-2.5 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition ${
                  theme === 'dark'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>ダーク</span>
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">テーマカラー</p>
            <div className="grid grid-cols-4 gap-3">
              {ACCENT_COLOR_PRESETS.map((preset) => {
                const selected = accentColor === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setAccentColor(preset.id)}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <span
                      className={`w-10 h-10 rounded-full transition-transform ${
                        selected ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white scale-105' : ''
                      }`}
                      style={{ backgroundColor: preset.swatchHex }}
                    />
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
                カラー設定
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                項目ごとに色を選べます。変更はすぐに全画面に反映されます。
              </p>
            </div>
            <button
              type="button"
              onClick={resetCustomColors}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>すべて初期色</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {CUSTOM_COLOR_META.map((item) => (
              <div key={item.key} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <label className="relative cursor-pointer shrink-0">
                    <span
                      className="block w-8 h-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700"
                      style={{ backgroundColor: customColors[item.key] }}
                    />
                    <input
                      type="color"
                      value={customColors[item.key]}
                      onChange={(e) => setCustomColor(item.key, e.target.value)}
                      className="sr-only"
                    />
                  </label>
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                      {item.label}
                    </p>
                    <p className="text-[10px] text-slate-400">{item.description}</p>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-slate-400 uppercase shrink-0">
                  {customColors[item.key]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- Subpage 7: その他の設定 ---
  if (section === 'other') {
    return (
      <div className="space-y-4 animate-fadeIn">
        <SubPageHeader
          title="その他の設定"
          subtitle="アプリの表示・動作に関する基本設定"
          backTo="/settings"
        />

        <div className="rounded-3xl p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
          <div className="py-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100">通貨</p>
              <p className="text-[11px] text-slate-400">金額はすべて円で表示されます</p>
            </div>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              日本円 (¥)
            </span>
          </div>

          <div className="py-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                データ同期
              </p>
              <p className="text-[11px] text-slate-400">
                ログインした端末で同じデータを表示します
              </p>
            </div>
            <button
              type="button"
              onClick={() => void syncNow()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              <span>クラウド同期</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Top 設定 Menu ---
  const settingsMenu = [
    {
      to: '/settings/accounts',
      title: '口座・資産管理',
      subtitle: '口座の追加・編集・削除、資産項目の管理',
      icon: Wallet,
      color: 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400',
    },
    {
      to: '/settings/categories',
      title: 'カテゴリ管理',
      subtitle: '収入・支出カテゴリーの追加・編集・削除',
      icon: Tag,
      color: 'bg-pink-50 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400',
    },
    {
      to: '/settings/budget',
      title: '予算設定',
      subtitle: '月間予算の設定と変更',
      icon: Target,
      color: 'bg-fuchsia-50 dark:bg-fuchsia-950/50 text-fuchsia-600 dark:text-fuchsia-400',
    },
    {
      to: '/settings/cards',
      title: 'カード設定',
      subtitle: '締め日・支払日・支払口座の管理',
      icon: CreditCard,
      color: 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400',
    },
    {
      to: '/settings/data',
      title: 'データ管理',
      subtitle: 'CSV入出力・バックアップ・復元',
      icon: Database,
      color: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400',
    },
    {
      to: '/settings/design',
      title: 'デザイン設定',
      subtitle: '表示モード・テーマカラー・カラー設定',
      icon: Palette,
      color: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400',
    },
    {
      to: '/settings/other',
      title: 'その他の設定',
      subtitle: '通貨・動作設定',
      icon: Sliders,
      color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
    },
  ];

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="pt-1">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
          設定
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">アプリ全体の管理とカスタマイズ</p>
      </div>

      {/* Account Card */}
      <div className="rounded-3xl p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
            <UserIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-400">
              {user ? 'ログイン中' : 'ローカルモード'}
            </p>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
              {user?.email || '未ログイン'}
            </p>
          </div>
        </div>
        {isConfigured &&
          (user ? (
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>ログアウト</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={signInWithGoogle}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-600 text-white text-xs font-bold shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>ログイン</span>
            </button>
          ))}
      </div>

      {/* Menu Cards */}
      <div className="space-y-2.5">
        {settingsMenu.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.to}
              type="button"
              onClick={() => navigate(item.to)}
              className="w-full flex items-center justify-between p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:border-slate-200 dark:hover:border-slate-700 active:scale-[0.99] transition text-left"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${item.color}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.subtitle}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
