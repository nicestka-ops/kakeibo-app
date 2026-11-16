import React, { useEffect, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Transaction, TransactionType } from '@/types';
import { X, Delete, Check } from 'lucide-react';

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTransaction?: Transaction | null;
  initialType?: 'expense' | 'income' | 'transfer';
}

export const TransactionFormModal: React.FC<TransactionFormModalProps> = ({
  isOpen,
  onClose,
  initialTransaction = null,
  initialType = 'expense',
}) => {
  const { accounts, categories, addTransaction, updateTransaction, addTransfer, selectedYearMonth } = useApp();
  const isEditMode = Boolean(initialTransaction);

  const [type, setType] = useState<TransactionType>(initialType);
  const [amountStr, setAmountStr] = useState<string>('0');
  const [date, setDate] = useState<string>(() => {
    const today = new Date().toISOString().split('T')[0];
    return today.startsWith(selectedYearMonth) ? today : `${selectedYearMonth}-01`;
  });
  const [accountId, setAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [memo, setMemo] = useState<string>('');

  const activeAccounts = accounts.filter((a) => a.isActive);
  const activeCategories = categories.filter((c) => c.isActive);

  useEffect(() => {
    if (!isOpen) return;
    if (initialTransaction) {
      setType(initialTransaction.type);
      setAmountStr(String(Math.round(Math.abs(initialTransaction.amount))));
      setDate(initialTransaction.date);
      setAccountId(initialTransaction.accountId);
      setCategoryId(initialTransaction.categoryId || '');
      setDescription(initialTransaction.description || '');
      setMemo(initialTransaction.memo || '');
    } else {
      const today = new Date().toISOString().split('T')[0];
      setType(initialType);
      setAmountStr('0');
      setDate(today.startsWith(selectedYearMonth) ? today : `${selectedYearMonth}-01`);
      setAccountId(activeAccounts[0]?.id || accounts[0]?.id || '');
      setToAccountId(activeAccounts[1]?.id || activeAccounts[0]?.id || accounts[0]?.id || '');
      const matchingCats = activeCategories.filter((c) =>
        initialType === 'income'
          ? c.kind === 'income' || c.kind === 'both'
          : c.kind === 'expense' || c.kind === 'both'
      );
      setCategoryId(matchingCats[0]?.id || activeCategories[0]?.id || '');
      setDescription('');
      setMemo('');
    }
  }, [isOpen, initialTransaction, initialType, selectedYearMonth]);

  if (!isOpen) return null;

  const isTransfer = !isEditMode && type === 'transfer';

  const filteredCategories = activeCategories.filter((c) => {
    if (type === 'income') return c.kind === 'income' || c.kind === 'both';
    if (type === 'expense') return c.kind === 'expense' || c.kind === 'both';
    return true;
  });

  const handleKeypad = (key: string) => {
    setAmountStr((prev) => {
      if (key === 'backspace') {
        if (prev.length <= 1) return '0';
        return prev.slice(0, -1);
      }
      if (prev === '0') {
        if (key === '0' || key === '00') return '0';
        return key;
      }
      if (prev.length >= 9) return prev;
      return prev + key;
    });
  };

  const handleTypeSwitch = (nextType: 'expense' | 'income' | 'transfer') => {
    setType(nextType);
    const matching = activeCategories.filter((c) =>
      nextType === 'income'
        ? c.kind === 'income' || c.kind === 'both'
        : c.kind === 'expense' || c.kind === 'both'
    );
    if (matching.length > 0 && !matching.some((c) => c.id === categoryId)) {
      setCategoryId(matching[0].id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Math.round(Number(amountStr));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('金額を1円以上で入力してください');
      return;
    }
    if (isTransfer && accountId === toAccountId) {
      alert('振替元と振替先に同じ口座は選択できません');
      return;
    }

    const selectedCat = categories.find((c) => c.id === categoryId);
    const baseDesc =
      description.trim() ||
      (type === 'transfer'
        ? '口座間振替'
        : selectedCat?.name || (type === 'income' ? '収入' : '支出'));

    if (isEditMode && initialTransaction) {
      updateTransaction(initialTransaction.id, {
        date,
        type,
        amount: parsedAmount,
        accountId,
        categoryId: categoryId || undefined,
        description: baseDesc,
        memo: memo.trim() || undefined,
      });
    } else if (isTransfer) {
      addTransfer(
        {
          date,
          amount: parsedAmount,
          accountId,
          description: baseDesc,
          memo: memo.trim() || undefined,
        },
        toAccountId
      );
    } else {
      addTransaction({
        date,
        type,
        amount: parsedAmount,
        accountId,
        categoryId: categoryId || undefined,
        description: baseDesc,
        memo: memo.trim() || undefined,
      });
    }
    onClose();
  };

  const formattedAmount = Number(amountStr || '0').toLocaleString();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fadeIn p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-slideUp max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
          <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-50">
            {isEditMode ? '取引を編集' : '新しい取引'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} className="px-5 pb-5 overflow-y-auto space-y-4">
          {/* Segmented Tabs */}
          {!isEditMode && (
            <div className="grid grid-cols-3 p-1 bg-slate-100 dark:bg-slate-800 rounded-full">
              {[
                { id: 'expense' as const, label: '支出', activeClass: 'bg-pink-500 text-white shadow-sm' },
                { id: 'income' as const, label: '収入', activeClass: 'bg-emerald-500 text-white shadow-sm' },
                { id: 'transfer' as const, label: '振替', activeClass: 'bg-primary-600 text-white shadow-sm' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTypeSwitch(tab.id)}
                  className={`py-2 rounded-full text-xs font-bold transition-all ${
                    type === tab.id
                      ? tab.activeClass
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Big Amount Display */}
          <div className="text-center py-1">
            <span className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 tabular-nums">
              {formattedAmount}
            </span>
            <span className="text-sm font-bold text-slate-400 ml-1.5">円</span>
          </div>

          {/* Calculator Keypad */}
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0'].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleKeypad(key)}
                className="h-12 rounded-2xl bg-slate-100/90 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 active:scale-95 text-lg font-bold text-slate-800 dark:text-slate-100 transition"
              >
                {key}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleKeypad('backspace')}
              className="h-12 rounded-2xl bg-slate-100/90 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 active:scale-95 flex items-center justify-center text-slate-600 dark:text-slate-300 transition"
              aria-label="1文字削除"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          {/* Account Chips */}
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
              {isTransfer ? '振替元口座' : '決済手段'}
            </p>
            <div className="flex flex-wrap gap-2">
              {activeAccounts.map((acc) => {
                const selected = accountId === acc.id;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setAccountId(acc.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                      selected
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {acc.name}
                  </button>
                );
              })}
            </div>
          </div>

          {isTransfer && (
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                振替先口座
              </p>
              <div className="flex flex-wrap gap-2">
                {activeAccounts.map((acc) => {
                  const selected = toAccountId === acc.id;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setToAccountId(acc.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                        selected
                          ? 'bg-primary-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {acc.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category Chips */}
          {!isTransfer && (
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                カテゴリー
              </p>
              <div className="flex flex-wrap gap-2">
                {filteredCategories.map((cat) => {
                  const selected = categoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                        selected
                          ? 'bg-pink-50 dark:bg-pink-950/40 text-slate-900 dark:text-white border-pink-400 dark:border-pink-500 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color || '#94a3b8' }}
                      />
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Date & Description & Memo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                利用日
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                内容
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="例: ランチ、スーパー"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
              メモ（任意）
            </label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="補足メモ"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-primary-600 hover:bg-primary-700 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2 transition"
          >
            <Check className="w-4 h-4" />
            <span>{isEditMode ? '更新する' : '登録する'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
