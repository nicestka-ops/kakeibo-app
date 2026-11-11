import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card } from '@/components/common/Card';
import { Target, Plus, CheckCircle2, X } from 'lucide-react';

export const GoalsPage: React.FC = () => {
  const { savingsGoals, addSavingsGoal } = useApp();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addSavingsGoal({
      title: title.trim(),
      targetAmount: Math.round(Number(targetAmount) || 0),
      currentAmount: 0,
      deadlineDate: deadlineDate || undefined,
    });

    setTitle('');
    setTargetAmount('');
    setDeadlineDate('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">貯金目標</h2>
          <p className="text-xs text-slate-400 mt-0.5">夢や将来のための積立計画</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          新しい目標
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {savingsGoals.map((goal) => {
          const percent =
            goal.targetAmount > 0
              ? Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100)
              : 0;
          const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);

          return (
            <Card key={goal.id} className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Target className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                      {goal.title}
                    </h3>
                    {goal.deadlineDate && (
                      <p className="text-xs text-slate-400">目標期日: {goal.deadlineDate}</p>
                    )}
                  </div>
                </div>
                <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  {percent}% 達成
                </span>
              </div>

              <div className="flex justify-between items-baseline pt-2">
                <div>
                  <span className="text-xs text-slate-400">現在積立額</span>
                  <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
                    ¥{goal.currentAmount.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
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
            </Card>
          );
        })}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">目標を追加</h3>
              <button onClick={() => setIsAdding(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">目標名</label>
                <input
                  type="text"
                  required
                  placeholder="例: 旅行資金、引っ越し、パソコン購入"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">目標額（円）</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="100000"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">目標期日（任意）</label>
                <input
                  type="date"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition"
                >
                  登録する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
