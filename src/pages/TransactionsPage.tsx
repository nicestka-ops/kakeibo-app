import React, { useMemo, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Transaction } from '@/types';
import { TransactionFormModal } from '@/components/forms/TransactionFormModal';
import { Search, CheckSquare, Square, Trash2, X, SlidersHorizontal } from 'lucide-react';

export const TransactionsPage: React.FC = () => {
  const { transactions, accounts, categories, selectedYearMonth, deleteTransactionsBatch } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [filterAccountId, setFilterAccountId] = useState<string>('all');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');
  const [filterScope, setFilterScope] = useState<'all' | 'month'>('all');
  const [showFilters, setShowFilters] = useState(false);

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const activeFilterCount =
    (filterAccountId !== 'all' ? 1 : 0) +
    (filterCategoryId !== 'all' ? 1 : 0) +
    (filterScope === 'month' ? 1 : 0);

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...transactions]
      .filter((tx) => {
        if (filterScope === 'month' && !tx.date.startsWith(selectedYearMonth)) {
          return false;
        }
        if (filterType === 'expense') {
          if (tx.type !== 'expense' && tx.type !== 'card_payment' && tx.type !== 'transfer_out') {
            return false;
          }
        } else if (filterType === 'income') {
          if (tx.type !== 'income' && tx.type !== 'adjustment' && tx.type !== 'transfer_in') {
            return false;
          }
        }
        if (filterAccountId !== 'all' && tx.accountId !== filterAccountId) {
          return false;
        }
        if (filterCategoryId !== 'all' && tx.categoryId !== filterCategoryId) {
          return false;
        }
        if (!q) return true;
        const catName = (tx.categoryId ? categoryMap.get(tx.categoryId)?.name : '') || '';
        const accName = accountMap.get(tx.accountId)?.name || '';
        return (
          (tx.description || '').toLowerCase().includes(q) ||
          catName.toLowerCase().includes(q) ||
          accName.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [
    transactions,
    filterScope,
    selectedYearMonth,
    filterType,
    filterAccountId,
    filterCategoryId,
    searchQuery,
    categoryMap,
    accountMap,
  ]);

  const groupedByDate = useMemo(() => {
    const groups: Array<{
      date: string;
      items: Transaction[];
      incomeTotal: number;
      expenseTotal: number;
    }> = [];
    const map = new Map<string, Transaction[]>();
    for (const tx of filteredTransactions) {
      const list = map.get(tx.date) || [];
      list.push(tx);
      map.set(tx.date, list);
    }
    for (const [date, items] of map.entries()) {
      let incomeTotal = 0;
      let expenseTotal = 0;
      for (const tx of items) {
        const amt = Math.round(Math.abs(tx.amount));
        if (tx.type === 'income' || tx.type === 'transfer_in' || tx.type === 'adjustment') {
          incomeTotal += amt;
        } else {
          expenseTotal += amt;
        }
      }
      groups.push({ date, items, incomeTotal, expenseTotal });
    }
    return groups;
  }, [filteredTransactions]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`選択した ${selectedIds.size} 件の取引を削除しますか？`)) return;
    deleteTransactionsBatch(Array.from(selectedIds));
    setSelectedIds(new Set());
    setIsSelectMode(false);
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
          取引履歴
        </h1>
        <div className="flex items-center gap-2">
          {isSelectMode && selectedIds.size > 0 && (
            <button
              type="button"
              onClick={handleBulkDelete}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500 text-white text-xs font-bold shadow-sm active:scale-95 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>削除 ({selectedIds.size})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-sm active:scale-95 transition ${
              showFilters || activeFilterCount > 0
                ? 'bg-primary-50 dark:bg-primary-950/50 border-primary-300 dark:border-primary-700 text-primary-600 dark:text-primary-400'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>絞り込み{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSelectMode((prev) => !prev);
              setSelectedIds(new Set());
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm active:scale-95 transition"
          >
            {isSelectMode ? (
              <>
                <X className="w-3.5 h-3.5" />
                <span>完了</span>
              </>
            ) : (
              <>
                <CheckSquare className="w-3.5 h-3.5" />
                <span>選択</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="内容・カテゴリー・口座で検索"
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
        />
      </div>

      {/* Expandable Filter Panel */}
      {showFilters && (
        <div className="rounded-2xl p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2.5 animate-fadeIn">
          <div className="grid grid-cols-3 gap-2">
            <select
              value={filterScope}
              onChange={(e) => setFilterScope(e.target.value as 'all' | 'month')}
              className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
            >
              <option value="all">全期間</option>
              <option value="month">{selectedYearMonth.replace('-', '年')}月</option>
            </select>
            <select
              value={filterAccountId}
              onChange={(e) => setFilterAccountId(e.target.value)}
              className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
            >
              <option value="all">口座: すべて</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <select
              value={filterCategoryId}
              onChange={(e) => setFilterCategoryId(e.target.value)}
              className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
            >
              <option value="all">カテゴリ: すべて</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setFilterScope('all');
                setFilterAccountId('all');
                setFilterCategoryId('all');
              }}
              className="text-[11px] font-bold text-primary-600"
            >
              絞り込みをリセット
            </button>
          )}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="grid grid-cols-3 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-full">
        {[
          { id: 'all' as const, label: 'すべて' },
          { id: 'expense' as const, label: '支出' },
          { id: 'income' as const, label: '収入' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterType(tab.id)}
            className={`py-2 rounded-full text-xs font-bold transition ${
              filterType === tab.id
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grouped List */}
      {groupedByDate.length === 0 ? (
        <div className="rounded-3xl p-10 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center text-sm text-slate-400">
          該当する取引がありません
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByDate.map((group) => (
            <div key={group.date} className="space-y-1.5">
              <div className="flex items-center justify-between px-1 text-xs">
                <span className="font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                  {group.date}
                </span>
                <div className="flex items-center gap-2 font-bold tabular-nums">
                  {group.incomeTotal > 0 && (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      +{group.incomeTotal.toLocaleString()}
                    </span>
                  )}
                  {group.expenseTotal > 0 && (
                    <span className="text-rose-500 dark:text-rose-400">
                      -{group.expenseTotal.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                {group.items.map((tx) => {
                  const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : undefined;
                  const acc = accountMap.get(tx.accountId);
                  const isPositive =
                    tx.type === 'income' || tx.type === 'transfer_in' || tx.type === 'adjustment';
                  const isSelected = selectedIds.has(tx.id);

                  return (
                    <button
                      key={tx.id}
                      type="button"
                      onClick={() => {
                        if (isSelectMode) toggleSelect(tx.id);
                        else setEditingTx(tx);
                      }}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isSelectMode && (
                          <span className="text-primary-600 shrink-0">
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-300" />
                            )}
                          </span>
                        )}
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: `${cat?.color || '#94a3b8'}20`,
                          }}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: cat?.color || '#94a3b8' }}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                            {tx.description}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {cat?.name || (tx.type === 'adjustment' ? '調整' : '未分類')}・
                            {acc?.name || '不明'}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-sm font-extrabold tabular-nums shrink-0 ${
                          isPositive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-800 dark:text-slate-100'
                        }`}
                      >
                        {isPositive ? '+' : '-'}
                        {Math.round(Math.abs(tx.amount)).toLocaleString()} 円
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <TransactionFormModal
        isOpen={Boolean(editingTx)}
        onClose={() => setEditingTx(null)}
        initialTransaction={editingTx}
      />
    </div>
  );
};
