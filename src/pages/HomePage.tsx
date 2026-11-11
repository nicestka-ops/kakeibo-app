import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card } from '@/components/common/Card';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Calendar,
  PiggyBank,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const HomePage: React.FC = () => {
  const {
    monthlyCashFlow,
    financialSummary,
    budget,
    transactions,
    plannedExpenses,
    categories,
    selectedYearMonth,
  } = useApp();

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const recentTransactions = transactions
    .filter((tx) => tx.date.startsWith(selectedYearMonth))
    .slice(0, 5);

  const budgetProgress =
    budget.totalAmount > 0
      ? Math.min(Math.round((monthlyCashFlow.expense / budget.totalAmount) * 100), 100)
      : 0;

  const remainingBudget = budget.totalAmount - monthlyCashFlow.expense;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-900 border-emerald-100 dark:border-emerald-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                今月の収入
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 mt-1">
                ¥{monthlyCashFlow.income.toLocaleString()}
              </h2>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/30 dark:to-slate-900 border-rose-100 dark:border-rose-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                今月の支出
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 mt-1">
                ¥{monthlyCashFlow.expense.toLocaleString()}
              </h2>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-900 border-blue-100 dark:border-blue-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                今月の収支差額
              </p>
              <h2
                className={`text-2xl sm:text-3xl font-extrabold mt-1 ${
                  monthlyCashFlow.netSavings >= 0
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {monthlyCashFlow.netSavings >= 0 ? '+' : ''}
                ¥{monthlyCashFlow.netSavings.toLocaleString()}
              </h2>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <PiggyBank className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="資産状況"
          action={
            <Link
              to="/accounts"
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              口座一覧を見る
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          }
        >
          <div className="grid grid-cols-3 gap-4 text-center py-2">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <span className="text-xs text-slate-500 dark:text-slate-400">総資産</span>
              <p className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                ¥{financialSummary.totalAssets.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <span className="text-xs text-slate-500 dark:text-slate-400">カード未払・負債</span>
              <p className="text-lg sm:text-xl font-bold text-rose-500 mt-1">
                -¥{financialSummary.totalLiabilities.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">純資産</span>
              <p className="text-lg sm:text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                ¥{financialSummary.netAssets.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card
          title="今月の予算消化状況"
          action={
            <Link
              to="/budgets"
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              予算を編集
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          }
        >
          <div className="space-y-3 py-1">
            <div className="flex justify-between items-baseline text-sm">
              <span className="text-slate-500 dark:text-slate-400">
                予算: ¥{budget.totalAmount.toLocaleString()}
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-100">
                残り: ¥{remainingBudget.toLocaleString()}
              </span>
            </div>

            <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  budgetProgress >= 90
                    ? 'bg-rose-500'
                    : budgetProgress >= 70
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${budgetProgress}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>消化率 {budgetProgress}%</span>
              {remainingBudget < 0 && (
                <span className="text-rose-500 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  予算オーバー
                </span>
              )}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="最近の取引"
          action={
            <Link
              to="/transactions"
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              すべて見る
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          }
        >
          {recentTransactions.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">今月の取引履歴はまだありません</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentTransactions.map((tx) => {
                const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : undefined;
                return (
                  <div key={tx.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: cat?.color || '#94a3b8' }}
                      >
                        {tx.type === 'income' ? (
                          <ArrowUpRight className="w-5 h-5" />
                        ) : (
                          <ArrowDownRight className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-100">
                          {tx.description}
                        </p>
                        <p className="text-xs text-slate-400">
                          {tx.date} • {cat?.name || 'カテゴリなし'}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-bold text-sm sm:text-base ${
                        tx.type === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}¥{tx.amount.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card
          title="今月の支出予定"
          action={
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              期日順
            </span>
          }
        >
          {plannedExpenses.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">今月の支出予定はありません</p>
          ) : (
            <div className="space-y-3">
              {plannedExpenses.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                >
                  <div>
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-100">
                      {p.description}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">期日: {p.dueDate}</p>
                  </div>
                  <span className="font-bold text-sm text-slate-700 dark:text-slate-200">
                    ¥{p.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
