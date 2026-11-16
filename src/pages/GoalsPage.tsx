import React, { useMemo, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { SubPageHeader } from '@/components/common/SubPageHeader';
import { SavingsGoal } from '@/types';
import { PiggyBank, Plus, Pencil, Trash2, X, Info } from 'lucide-react';

export const GoalsPage: React.FC = () => {
  const {
    savingsGoals,
    accounts,
    categories,
    transactions,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    addTransaction,
  } = useApp();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('0');
  const [deadlineDate, setDeadlineDate] = useState('');

  const [txModalGoal, setTxModalGoal] = useState<{
    goal: SavingsGoal;
    mode: 'deposit' | 'withdraw';
  } | null>(null);
  const [moveAmount, setMoveAmount] = useState('');

  const cashAccount = useMemo(
    () =>
      accounts.find((a) => a.isActive && (a.type === 'cash' || a.name.includes('現金'))) ||
      accounts.find((a) => a.isActive) ||
      null,
    [accounts]
  );

  const savingsCategory = useMemo(
    () =>
      categories.find((c) => c.name === 'イベント貯金' || c.name === '貯金') ||
      categories.find((c) => c.name === '調整') ||
      null,
    [categories]
  );

  // 既存の「積立 → {title}」「引き出し ← {title}」履歴から各目標の積立額を算出できるヘルパー
  const goalHistoryTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of transactions) {
      const desc = tx.description || '';
      if (desc.startsWith('積立 → ')) {
        const name = desc.replace('積立 → ', '').trim();
        map.set(name, (map.get(name) || 0) + Math.round(Math.abs(tx.amount)));
      } else if (desc.startsWith('引き出し ← ')) {
        const name = desc.replace('引き出し ← ', '').trim();
        map.set(name, (map.get(name) || 0) - Math.round(Math.abs(tx.amount)));
      }
    }
    return map;
  }, [transactions]);

  const openNewModal = () => {
    setEditingGoal(null);
    setTitle('');
    setTargetAmount('');
    setCurrentAmount('0');
    setDeadlineDate('');
    setIsFormOpen(true);
  };

  const openEditModal = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setTargetAmount(String(goal.targetAmount));
    setCurrentAmount(String(goal.currentAmount));
    setDeadlineDate(goal.deadlineDate || '');
    setIsFormOpen(true);
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const target = Math.round(Number(targetAmount));
    const current = Math.round(Number(currentAmount || '0'));
    if (!title.trim() || isNaN(target) || target <= 0) {
      alert('タイトルと有効な目標金額を入力してください');
      return;
    }

    if (editingGoal) {
      updateSavingsGoal(editingGoal.id, {
        title: title.trim(),
        targetAmount: target,
        currentAmount: Math.max(0, current),
        deadlineDate: deadlineDate || undefined,
      });
    } else {
      const historyBase = goalHistoryTotals.get(title.trim()) || 0;
      addSavingsGoal({
        title: title.trim(),
        targetAmount: target,
        currentAmount: Math.max(0, current || historyBase),
        deadlineDate: deadlineDate || undefined,
        linkedAccountId: cashAccount?.id,
      });
    }
    setIsFormOpen(false);
  };

  const handleMoveFunds = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txModalGoal) return;
    const amt = Math.round(Number(moveAmount));
    if (isNaN(amt) || amt <= 0) {
      alert('有効な金額を入力してください');
      return;
    }
    const { goal, mode } = txModalGoal;
    const nextCurrent =
      mode === 'deposit'
        ? goal.currentAmount + amt
        : Math.max(0, goal.currentAmount - amt);

    updateSavingsGoal(goal.id, { currentAmount: nextCurrent });

    if (cashAccount) {
      const today = new Date().toISOString().split('T')[0];
      addTransaction({
        date: today,
        type: mode === 'deposit' ? 'expense' : 'income',
        amount: amt,
        accountId: cashAccount.id,
        categoryId: savingsCategory?.id,
        description:
          mode === 'deposit' ? `積立 → ${goal.title}` : `引き出し ← ${goal.title}`,
      });
    }

    setTxModalGoal(null);
    setMoveAmount('');
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <SubPageHeader
        title="イベント貯金"
        subtitle="目標に向けてコツコツ積み立てよう 🐷"
        backTo="/"
        rightAction={
          <button
            type="button"
            onClick={openNewModal}
            className="w-9 h-9 rounded-full bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center shadow-md shadow-primary-500/25 active:scale-95 transition"
            aria-label="目標を追加"
          >
            <Plus className="w-5 h-5" />
          </button>
        }
      />

      <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 text-xs text-purple-800 dark:text-purple-200">
        <Info className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          イベント貯金は手元現金でのみ管理・プールされ、PayPay銀行などの口座残高やカード支払い予定とは連動しません。
        </p>
      </div>

      {savingsGoals.length === 0 ? (
        <div className="rounded-3xl p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center space-y-3">
          <p className="text-sm text-slate-400">まだイベント貯金がありません</p>
          <button
            type="button"
            onClick={openNewModal}
            className="px-4 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold"
          >
            ＋ 最初の目標を作成
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {savingsGoals.map((goal) => {
            const pct =
              goal.targetAmount > 0
                ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
                : 0;
            const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

            return (
              <div
                key={goal.id}
                className="rounded-3xl p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-pink-50 dark:bg-pink-950/50 text-pink-500 flex items-center justify-center shrink-0">
                      <PiggyBank className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-50 truncate">
                        {goal.title}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {goal.deadlineDate ? `期限 ${goal.deadlineDate}・` : ''}現金（手元）
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditModal(goal)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      aria-label="編集"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`「${goal.title}」を削除しますか？`)) {
                          deleteSavingsGoal(goal.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      aria-label="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      目標 ¥{goal.targetAmount.toLocaleString()} まで あと{' '}
                      {remaining.toLocaleString()} 円
                    </span>
                    <span className="font-bold">達成率 {pct}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                    積立済み ¥{goal.currentAmount.toLocaleString()}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMoveAmount('');
                      setTxModalGoal({ goal, mode: 'deposit' });
                    }}
                    className="py-2.5 rounded-xl bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 hover:bg-primary-100 text-xs font-bold transition"
                  >
                    + 現金から積立
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMoveAmount('');
                      setTxModalGoal({ goal, mode: 'withdraw' });
                    }}
                    className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 text-xs font-bold transition"
                  >
                    - 引き出す
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Goal Add/Edit Modal */}
      {isFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fadeIn p-0 sm:p-4"
          onClick={() => setIsFormOpen(false)}
        >
          <div
            className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-5 space-y-4 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-50">
                {editingGoal ? '目標を編集' : '新しいイベント貯金'}
              </h2>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveGoal} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">タイトル</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例: あんちゃん旅行"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">目標金額</label>
                  <input
                    type="number"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="150000"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">現在の積立額</label>
                  <input
                    type="number"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">期限（任意）</label>
                <input
                  type="date"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-primary-600 text-white font-bold text-sm"
              >
                保存する
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Deposit / Withdraw Modal */}
      {txModalGoal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fadeIn p-0 sm:p-4"
          onClick={() => setTxModalGoal(null)}
        >
          <div
            className="w-full sm:max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-5 space-y-4 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-50">
                {txModalGoal.mode === 'deposit' ? '現金から積立' : '貯金を引き出す'}
              </h2>
              <button
                type="button"
                onClick={() => setTxModalGoal(null)}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500">対象: {txModalGoal.goal.title}</p>
            <form onSubmit={handleMoveFunds} className="space-y-3">
              <input
                type="number"
                inputMode="numeric"
                value={moveAmount}
                onChange={(e) => setMoveAmount(e.target.value)}
                placeholder="金額を入力（例: 1000）"
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-lg font-bold"
                autoFocus
                required
              />
              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-primary-600 text-white font-bold text-sm"
              >
                {txModalGoal.mode === 'deposit' ? '積立を実行' : '引き出しを実行'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
