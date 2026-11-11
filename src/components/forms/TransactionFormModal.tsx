import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { TransactionType } from '@/types';
import { X, ArrowDownRight, ArrowUpRight, ArrowLeftRight } from 'lucide-react';

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TransactionFormModal: React.FC<TransactionFormModalProps> = ({ isOpen, onClose }) => {
  const { accounts, categories, addTransaction, addTransfer, selectedYearMonth } = useApp();

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(() => {
    const today = new Date().toISOString().split('T')[0];
    return today.startsWith(selectedYearMonth) ? today : `${selectedYearMonth}-01`;
  });
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState<string>(accounts[1]?.id || accounts[0]?.id || '');
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id || '');
  const [description, setDescription] = useState<string>('');
  const [memo, setMemo] = useState<string>('');

  if (!isOpen) return null;

  const isTransfer = type === 'transfer';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Math.round(Number(amount));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('有効な金額を整数で入力してください');
      return;
    }
    if (isTransfer && accountId === toAccountId) {
      alert('振替元と振替先に同じ口座は選択できません');
      return;
    }

    const baseDesc = description.trim() || (
      type === 'income' ? '臨時収入' :
      type === 'transfer' ? '口座間振替' :
      '買い物・支出'
    );

    if (isTransfer) {
      // 振替: transfer_out（移動元）+ transfer_in（移動先）の2エントリを生成
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

    setAmount('');
    setDescription('');
    setMemo('');
    onClose();
  };

  const filteredCategories = categories.filter((c) =>
    type === 'expense'
      ? c.kind === 'expense' || c.kind === 'both'
      : c.kind === 'income' || c.kind === 'both'
  );

  // 振替先の口座リスト（移動元を除く）
  const toAccountOptions = accounts.filter((a) => a.id !== accountId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">取引を記録</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 取引タイプ選択 */}
        <div className="grid grid-cols-3 gap-2 p-4 bg-slate-50 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition ${
              type === 'expense'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <ArrowDownRight className="w-4 h-4" />
            支出
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition ${
              type === 'income'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            収入
          </button>
          <button
            type="button"
            onClick={() => setType('transfer')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition ${
              isTransfer
                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            口座振替
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* 金額 */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              金額（円）
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">¥</span>
              <input
                type="number"
                inputMode="numeric"
                required
                min="1"
                step="1"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-3 text-2xl font-bold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* 日付 + 口座 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                日付
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                {isTransfer ? '振替元口座' : '口座'}
              </label>
              <select
                value={accountId}
                onChange={(e) => {
                  setAccountId(e.target.value);
                  // 振替先が同じになった場合は別の口座を選ぶ
                  if (e.target.value === toAccountId) {
                    const other = accounts.find((a) => a.id !== e.target.value);
                    if (other) setToAccountId(other.id);
                  }
                }}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 振替先口座（振替モードのみ） */}
          {isTransfer && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                振替先口座
              </label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
              >
                {toAccountOptions.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-400">
                ※ 振替は総資産を変化させません（口座間の移動のみ）
              </p>
            </div>
          )}

          {/* カテゴリー（収入・支出のみ） */}
          {!isTransfer && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                カテゴリー
              </label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                {filteredCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 ${
                      categoryId === cat.id
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 品名・摘要 */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              品名・摘要
            </label>
            <input
              type="text"
              placeholder={isTransfer ? '例: 生活費の口座移動' : '例: スーパー、昼食、光熱費など'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className={`w-full py-3.5 text-white font-bold rounded-2xl shadow-lg transition transform active:scale-[0.98] ${
                isTransfer
                  ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
              }`}
            >
              {isTransfer ? '振替を記録する' : '登録する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};