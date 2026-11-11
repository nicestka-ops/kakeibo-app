import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Transaction } from '@/types';
import { Card } from '@/components/common/Card';
import { Search, Trash2, ArrowUpRight, ArrowDownRight, ArrowLeftRight, CreditCard } from 'lucide-react';

/** 取引種別の表示設定 */
const TX_TYPE_CONFIG: Record<
  Transaction['type'],
  { label: string; icon: React.ReactNode; colorClass: string; prefix: string; bgColor: string }
> = {
  income: {
    label: '収入',
    icon: <ArrowUpRight className="w-5 h-5" />,
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    prefix: '+',
    bgColor: '#22c55e',
  },
  expense: {
    label: '支出',
    icon: <ArrowDownRight className="w-5 h-5" />,
    colorClass: 'text-slate-900 dark:text-slate-100',
    prefix: '-',
    bgColor: '#64748b',
  },
  transfer_out: {
    label: '振替（移動元）',
    icon: <ArrowLeftRight className="w-5 h-5" />,
    colorClass: 'text-indigo-600 dark:text-indigo-400',
    prefix: '→',
    bgColor: '#6366f1',
  },
  transfer_in: {
    label: '振替（移動先）',
    icon: <ArrowLeftRight className="w-5 h-5" />,
    colorClass: 'text-indigo-500 dark:text-indigo-300',
    prefix: '←',
    bgColor: '#818cf8',
  },
  transfer: {
    label: '振替',
    icon: <ArrowLeftRight className="w-5 h-5" />,
    colorClass: 'text-indigo-600 dark:text-indigo-400',
    prefix: '→',
    bgColor: '#6366f1',
  },
  card_payment: {
    label: 'カード引落',
    icon: <CreditCard className="w-5 h-5" />,
    colorClass: 'text-amber-600 dark:text-amber-400',
    prefix: '-',
    bgColor: '#f59e0b',
  },
  adjustment: {
    label: '残高調整',
    icon: <ArrowUpRight className="w-5 h-5" />,
    colorClass: 'text-sky-600 dark:text-sky-400',
    prefix: '±',
    bgColor: '#0ea5e9',
  },
};

export const TransactionsPage: React.FC = () => {
  const { transactions, categories, accounts, deleteTransaction, selectedYearMonth } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  const filtered = transactions.filter((tx) => {
    if (!tx.date.startsWith(selectedYearMonth)) return false;
    if (filterType === 'transfer') {
      if (!['transfer', 'transfer_out', 'transfer_in'].includes(tx.type)) return false;
    } else if (filterType !== 'all' && tx.type !== filterType) {
      return false;
    }
    if (filterCategory !== 'all' && tx.categoryId !== filterCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const descMatch = tx.description.toLowerCase().includes(q);
      const catMatch = tx.categoryId ? categoryMap.get(tx.categoryId)?.name.toLowerCase().includes(q) : false;
      const accMatch = accountMap.get(tx.accountId)?.name.toLowerCase().includes(q);
      if (!descMatch && !catMatch && !accMatch) return false;
    }
    return true;
  });

  const handleDelete = (tx: { id: string; description: string; type: Transaction['type']; transferGroupId?: string }) => {
    const isTransfer = tx.type === 'transfer_out' || tx.type === 'transfer_in';
    const msg = isTransfer
      ? `「${tx.description}」の振替取引を削除しますか？\n（移動元・移動先の両エントリが削除されます）`
      : `「${tx.description}」の取引を削除しますか？`;
    if (confirm(msg)) {
      deleteTransaction(tx.id);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="摘要、カテゴリ、口座で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
          >
            <option value="all">すべての種別</option>
            <option value="expense">支出のみ</option>
            <option value="income">収入のみ</option>
            <option value="transfer">口座振替のみ</option>
            <option value="card_payment">カード引落のみ</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
          >
            <option value="all">すべてのカテゴリー</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <div className="flex justify-between items-center px-1 text-sm text-slate-500 dark:text-slate-400">
        <span>該当件数: {filtered.length} 件</span>
      </div>

      <Card>
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            条件に一致する取引データは見つかりませんでした
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((tx) => {
              const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : undefined;
              const acc = accountMap.get(tx.accountId);
              const cfg = TX_TYPE_CONFIG[tx.type] || TX_TYPE_CONFIG.expense;

              // 振替の場合、相手口座を探す
              const pairTx = (tx.type === 'transfer_out' || tx.type === 'transfer_in') && tx.transferGroupId
                ? transactions.find(
                    (t) =>
                      t.transferGroupId === tx.transferGroupId &&
                      t.id !== tx.id
                  )
                : undefined;
              const pairAcc = pairTx ? accountMap.get(pairTx.accountId) : undefined;

              return (
                <div
                  key={tx.id}
                  className="py-3.5 flex items-center justify-between group hover:bg-slate-50/50 dark:hover:bg-slate-800/40 rounded-xl px-2 transition"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: cat?.color || cfg.bgColor }}
                    >
                      {cfg.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                          {tx.description}
                        </span>
                        {cat && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {cat.name}
                          </span>
                        )}
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {tx.date} • {acc?.name || '口座未設定'}
                        {pairAcc && (
                          <span> → {pairAcc.name}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`font-extrabold text-base ${cfg.colorClass}`}>
                      {cfg.prefix}¥{tx.amount.toLocaleString()}
                    </span>
                    <button
                      onClick={() => handleDelete(tx)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      aria-label="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};