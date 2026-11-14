import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card } from '@/components/common/Card';
import { Plus, Edit2, TrendingDown, CheckCircle, AlertCircle } from 'lucide-react';

export const BudgetsPage: React.FC = () => {
  const { budget, updateBudget, categories, categoryBreakdown, monthlyCashFlow, selectedYearMonth } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [totalAmountInput, setTotalAmountInput] = useState(budget.totalAmount.toString());
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, number>>(budget.categoryBudgets || {});

  const expenseCategories = categories.filter((c) => c.kind === 'expense' || c.kind === 'both');

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const newTotal = Math.round(Number(totalAmountInput));
    if (!isNaN(newTotal) && newTotal >= 0) {
      updateBudget({ totalAmount: newTotal, categoryBudgets });
    }
    setIsEditing(false);
  };

  const handleCategoryBudgetChange = (catId: string, value: string) => {
    const num = Math.round(Number(value) || 0);
    setCategoryBudgets(prev => ({ ...prev, [catId]: num }));
  };

  const remaining = budget.totalAmount - monthlyCashFlow.expense;
  const progressPercent =
    budget.totalAmount > 0
      ? Math.min(Math.round((monthlyCashFlow.expense / budget.totalAmount) * 100), 100)
      : 0;

  return (
    <div className="space-y-5 animate-fadeIn px-1 sm:px-0">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-slate-900 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{selectedYearMonth} 月間総予算</p>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-1 truncate">
                ¥{budget.totalAmount.toLocaleString()}
              </h2>
            </div>
            <button
              onClick={() => { setTotalAmountInput(budget.totalAmount.toString()); setCategoryBudgets(budget.categoryBudgets || {}); setIsEditing(true); }}
              className="px-3 py-1.5 text-xs font-bold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-xl hover:bg-indigo-200 transition shrink-0"
            >
              <Edit2 className="w-3.5 h-3.5 mr-1" />
              変更
            </button>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/20 dark:to-slate-900 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400">現在の総支出</p>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-1 truncate">
                ¥{monthlyCashFlow.expense.toLocaleString()}
              </h2>
              <p className="text-xs text-slate-400 mt-1">消化率: {progressPercent}%</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </Card>

        <Card className={`p-4 sm:p-5 ${remaining >= 0 ? 'bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-slate-900' : 'bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-slate-900'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={`text-xs font-bold ${remaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {remaining >= 0 ? '残り使える予算' : '予算超過'}
              </p>
              <h2 className={`text-xl sm:text-2xl font-extrabold mt-1 truncate ${remaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                ¥{Math.abs(remaining).toLocaleString()}
              </h2>
              <p className="text-xs text-slate-400 mt-1">{remaining >= 0 ? '計画的な支出を維持中' : '支出の見直しを推奨'}</p>
            </div>
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 ${remaining >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
              {remaining >= 0 ? <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" /> : <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />}
            </div>
          </div>
        </Card>
      </div>

      <Card title="予算消化バー">
        <div className="space-y-3">
          <div className="flex justify-between items-baseline text-sm">
            <span className="text-slate-500 dark:text-slate-400">
              予算: ¥{budget.totalAmount.toLocaleString()}
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-100">
              実績: ¥{monthlyCashFlow.expense.toLocaleString()} ({progressPercent}%)
            </span>
          </div>

          <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progressPercent >= 100
                  ? 'bg-rose-500'
                  : progressPercent >= 90
                  ? 'bg-rose-500'
                  : progressPercent >= 70
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>消化率 {progressPercent}%</span>
            {remaining < 0 && (
              <span className="text-rose-500 font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                予算オーバー ¥{Math.abs(remaining).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </Card>

      <Card title="カテゴリー別支出状況">
        <div className="space-y-3">
          {expenseCategories.map((cat) => {
            const spent = categoryBreakdown[cat.id] || 0;
            const catBudget = budget.categoryBudgets?.[cat.id] || 0;
            const catPercent = catBudget > 0 ? Math.min(Math.round((spent / catBudget) * 100), 100) : 0;
            const catRemaining = catBudget - spent;

            return (
              <div key={cat.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="font-bold text-slate-800 dark:text-slate-100 truncate">{cat.name}</span>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className="font-bold text-slate-800 dark:text-slate-100">¥{spent.toLocaleString()}</span>
                    {catBudget > 0 && <span className="text-xs text-slate-400 ml-1.5">/ ¥{catBudget.toLocaleString()}</span>}
                  </div>
                </div>
                {catBudget > 0 && (
                  <>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${catPercent >= 100 ? 'bg-rose-500' : catPercent >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${catPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>消化率 {catPercent}%</span>
                      <span className={catRemaining < 0 ? 'text-rose-500 font-bold' : ''}>
                        残り: ¥{catRemaining.toLocaleString()}
                      </span>
                    </div>
                  </>
                )}
                {isEditing && catBudget === 0 && (
                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      予算を設定（円）
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="例: 10000"
                      value={categoryBudgets[cat.id] || ''}
                      onChange={(e) => handleCategoryBudgetChange(cat.id, e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-4">月間総予算を変更</h3>
            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">総予算額（円）</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1000"
                  value={totalAmountInput}
                  onChange={(e) => setTotalAmountInput(e.target.value)}
                  className="w-full px-3 py-2 text-lg font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsEditing(false); setTotalAmountInput(budget.totalAmount.toString()); setCategoryBudgets(budget.categoryBudgets || {}); }}
                  className="flex-1 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl"
                >
                  キャンセル
                </button>
                <button type="submit" className="flex-1 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md">
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
