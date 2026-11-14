import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card } from '@/components/common/Card';
import { Target, Plus, CheckCircle2, X, Trash2, Edit2, Wallet } from 'lucide-react';

export const GoalsPage: React.FC = () => {
  const { savingsGoals, addSavingsGoal, updateSavingsGoal, accounts, accountBalances } = useApp();
  const [isAdding, setIsAdding] = useState(false);
  const [editingGoal, setEditingGoal] = useState<typeof savingsGoals[0] | null>(null);
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [linkedAccountId, setLinkedAccountId] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingGoal) {
      updateSavingsGoal(editingGoal.id, {
        title: title.trim(),
        targetAmount: Math.round(Number(targetAmount) || 0),
        currentAmount: Math.round(Number(currentAmount) || 0),
        deadlineDate: deadlineDate || undefined,
        linkedAccountId: linkedAccountId || undefined,
      });
    } else {
      addSavingsGoal({
        title: title.trim(),
        targetAmount: Math.round(Number(targetAmount) || 0),
        currentAmount: Math.round(Number(currentAmount) || 0),
        deadlineDate: deadlineDate || undefined,
        linkedAccountId: linkedAccountId || undefined,
      });
    }

    setTitle('');
    setTargetAmount('');
    setCurrentAmount('');
    setDeadlineDate('');
    setLinkedAccountId('');
    setIsAdding(false);
    setEditingGoal(null);
  };

  const startEditing = (goal: typeof savingsGoals[0]) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setTargetAmount(goal.targetAmount.toString());
    setCurrentAmount(goal.currentAmount.toString());
    setDeadlineDate(goal.deadlineDate || '');
    setLinkedAccountId(goal.linkedAccountId || '');
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('この貯金目標を削除しますか？')) {
      updateSavingsGoal(id, { targetAmount: 0 }); // Soft delete by setting target to 0
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn px-1 sm:px-0">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">貯金目標</h2>
          <p className="text-xs text-slate-400 mt-0.5">夢や将来のための積立計画</p>
        </div>
        <button
          onClick={() => { setEditingGoal(null); setIsAdding(true); }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          新しい目標
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {savingsGoals.filter(g => g.targetAmount > 0).map((goal) => {
          const percent =
            goal.targetAmount > 0
              ? Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100)
              : 0;
          const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
          const linkedAccount = goal.linkedAccountId ? accounts.find(a => a.id === goal.linkedAccountId) : null;
          const linkedBalance = linkedAccount ? accountBalances[linkedAccount.id] ?? 0 : 0;

          return (
            <Card key={goal.id} className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Target className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 truncate">
                      {goal.title}
                    </h3>
                    {goal.deadlineDate && (
                      <p className="text-xs text-slate-400">目標期日: {goal.deadlineDate}</p>
                    )}
                    {linkedAccount && (
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <Wallet className="w-3 h-3" />
                        連携: {linkedAccount.name} (残高: ¥{linkedBalance.toLocaleString()})
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 shrink-0">
                  {percent}% 達成
                </span>
              </div>

              <div className="flex justify-between items-baseline pt-2">
                <div className="min-w-0">
                  <span className="text-xs text-slate-400">現在積立額</span>
                  <p className="text-xl font-extrabold text-slate-800 dark:text-slate-100 truncate">
                    ¥{goal.currentAmount.toLocaleString()}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <span className="text-xs text-slate-400">目標金額</span>
                  <p className="text-lg font-bold text-slate-600 dark:text-slate-300">
                    ¥{goal.targetAmount.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-xs text-slate-400 pt-1">
                <span>残りあと ¥{remaining.toLocaleString()}</span>
                {percent >= 100 && (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    目標達成おめでとうございます！
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => startEditing(goal)}
                  className="flex-1 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  編集
                </button>
                <button
                  onClick={() => handleDelete(goal.id)}
                  className="flex-1 py-2 text-xs font-medium text-slate-400 hover:text-rose-500"
                >
                  削除
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {savingsGoals.filter(g => g.targetAmount > 0).length === 0 && (
        <Card className="py-12 text-center">
          <Target className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-sm text-slate-400 mb-4">貯金目標が設定されていません</p>
          <button
            onClick={() => { setEditingGoal(null); setIsAdding(true); }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            最初の目標を作成
          </button>
        </Card>
      )}

      {(isAdding || editingGoal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">
                {editingGoal ? '目標を編集' : '目標を追加'}
              </h3>
              <button onClick={() => { setIsAdding(false); setEditingGoal(null); }} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">目標名</label>
                <input
                  type="text"
                  required
                  placeholder="例: 旅行資金、引っ越し、パソコン購入"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">目標額（円）</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="100000"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">現在額（円）</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">目標期日（任意）</label>
                <input
                  type="date"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">連携口座（任意）</label>
                <select
                  value={linkedAccountId}
                  onChange={(e) => setLinkedAccountId(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                >
                  <option value="">連携しない</option>
                  {accounts.filter(a => a.isActive && a.includeInAssets).map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-400">口座残高と同期して進捗を自動更新できます</p>
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition"
                >
                  {editingGoal ? '保存する' : '登録する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
