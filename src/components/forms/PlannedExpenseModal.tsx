import React, { useEffect, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { PlannedExpense } from '@/types';
import { X } from 'lucide-react';

interface PlannedExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
  initialPlanned?: PlannedExpense | null;
}

export const PlannedExpenseModal: React.FC<PlannedExpenseModalProps> = ({
  isOpen,
  onClose,
  initialDate,
  initialPlanned = null,
}) => {
  const { accounts, categories, addPlannedExpense, updatePlannedExpense } = useApp();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [memo, setMemo] = useState('');
  const [repeatType, setRepeatType] = useState<'none' | 'monthly' | 'yearly'>('none');
  const [repeatUntil, setRepeatUntil] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (initialPlanned) {
      setDescription(initialPlanned.description);
      setAmount(String(initialPlanned.amount));
      setDueDate(initialPlanned.dueDate);
      setCategoryId(initialPlanned.categoryId || '');
      setAccountId(initialPlanned.accountId || '');
      setMemo(initialPlanned.memo || '');
      setRepeatType(initialPlanned.repeatType || 'none');
      setRepeatUntil(initialPlanned.repeatUntil || '');
    } else {
      const today = new Date().toISOString().split('T')[0];
      setDescription('');
      setAmount('');
      setDueDate(initialDate || today);
      const expenseCats = categories.filter((c) => c.isActive && c.kind !== 'income');
      setCategoryId(expenseCats[0]?.id || categories[0]?.id || '');
      const activeAccs = accounts.filter((a) => a.isActive);
      setAccountId(activeAccs[0]?.id || '');
      setMemo('');
      setRepeatType('none');
      setRepeatUntil('');
    }
  }, [isOpen, initialDate, initialPlanned, categories, accounts]);

  if (!isOpen) return null;

  const expenseCategories = categories.filter((c) => c.isActive && c.kind !== 'income');
  const activeAccounts = accounts.filter((a) => a.isActive);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Math.round(Number(amount));
    if (!description.trim()) {
      alert('支出内容を入力してください');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('有効な金額を入力してください');
      return;
    }

    const payload = {
      description: description.trim(),
      amount: parsedAmount,
      dueDate,
      categoryId: categoryId || undefined,
      accountId: accountId || undefined,
      kind: 'expense' as const,
      repeatType,
      repeatUntil: repeatType !== 'none' && repeatUntil ? repeatUntil : undefined,
      memo: memo.trim() || undefined,
      isCompleted: initialPlanned?.isCompleted ?? false,
    };

    if (initialPlanned) {
      updatePlannedExpense(initialPlanned.id, payload);
    } else {
      addPlannedExpense(payload);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fadeIn p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-slideUp max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-50">
            {initialPlanned ? '支出予定を編集' : '支出予定を追加'}
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
              支出内容
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例: 家賃、サブスク"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                金額
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                支出予定日
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                カテゴリー
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {expenseCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                支払い口座
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {activeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
              メモ（任意）
            </label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="補足メモ"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                繰り返し
              </label>
              <select
                value={repeatType}
                onChange={(e) => setRepeatType(e.target.value as 'none' | 'monthly' | 'yearly')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="none">繰り返しなし</option>
                <option value="monthly">毎月</option>
                <option value="yearly">毎年</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                繰り返し終了日
              </label>
              <input
                type="date"
                value={repeatUntil}
                onChange={(e) => setRepeatUntil(e.target.value)}
                disabled={repeatType === 'none'}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-primary-600 hover:bg-primary-700 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-primary-500/25 transition"
          >
            {initialPlanned ? '予定を更新' : '予定を登録'}
          </button>
        </form>
      </div>
    </div>
  );
};
