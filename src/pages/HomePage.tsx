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
  Target,
  Wallet,
  CreditCard,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const HomePage: React.FC = () => {
  const {
    monthlyCashFlow,
    financialSummary,
    budget,
    transactions,
    plannedExpenses,
    savingsGoals,
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

  // Current month planned expenses
  const currentMonthPlanned = plannedExpenses.filter((p) => p.dueDate.startsWith(selectedYearMonth));
  const plannedTotal = currentMonthPlanned.reduce((sum, p) => sum + p.amount, 0);

  // Active savings goals
  const activeGoals = savingsGoals.filter((g) => g.targetAmount > 0);

  return (
    <div className="space-y-5 animate-fadeIn px-1 sm:px-0">
      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-900 border-emerald-100 dark:border-emerald-900/50 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                今月の収入
              </p>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-1 truncate">
                ¥{monthlyCashFlow.income.toLocaleString()}
              </h2>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/30 dark:to-slate-900 border-rose-100 dark:border-rose-900/50 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                今月の支出
              </p>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-1 truncate">
                ¥{monthlyCashFlow.expense.toLocaleString()}
              </h2>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-900 border-blue-100 dark:border-blue-900/50 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                今月の収支差額
              </p>
              <h2
                className={`text-xl sm:text-2xl font-extrabold mt-1 truncate ${
                  monthlyCashFlow.netSavings >= 0
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {monthlyCashFlow.netSavings >= 0 ? '+' : ''}
                ¥{monthlyCashFlow.netSavings.toLocaleString()}
              </h2>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <PiggyBank className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Assets & Budget Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
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
          <div className="grid grid-cols-3 gap-3 sm:gap-4 text-center py-1">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <span className="text-xs text-slate-500 dark:text-slate-400">総資産</span>
              <p className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 mt-1">
                ¥{financialSummary.totalAssets.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <span className="text-xs text-slate-500 dark:text-slate-400">負債</span>
              <p className="text-base sm:text-lg font-bold text-rose-500 mt-1">
                -¥{financialSummary.totalLiabilities.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">純資産</span>
              <p className="text-base sm:text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
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
            
            {/* Monthly spending forecast */}
            {plannedTotal > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  予定支出込み予測: <span className="font-bold text-slate-800 dark:text-slate-100">¥{(monthlyCashFlow.expense + plannedTotal).toLocaleString()}</span>
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  予算残: <span className={`font-bold ${budget.totalAmount - monthlyCashFlow.expense - plannedTotal >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>¥{(budget.totalAmount - monthlyCashFlow.expense - plannedTotal).toLocaleString()}</span>
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Savings Goals & Planned Expenses Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Savings Goals */}
        <Card
          title="貯金目標"
          action={
            activeGoals.length > 0 ? (
              <Link
                to="/goals"
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                すべて見る
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Target className="w-3.5 h-3.5" />
                目標を設定
              </span>
            )
          }
        >
          {activeGoals.length === 0 ? (
            <div className="py-8 text-center">
              <Target className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400">貯金目標が設定されていません</p>
              <Link to="/goals" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline mt-2 inline-block">
                目標を作成する
              </Link>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {activeGoals.slice(0, 3).map((goal) => {
                const percent =
                  goal.targetAmount > 0
                    ? Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100)
                    : 0;
                const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);

                return (
                  <div key={goal.id} className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <Target className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                            {goal.title}
                          </h4>
                          {goal.deadlineDate && (
                            <p className="text-[11px] text-slate-400">期日: {goal.deadlineDate}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-extrabold px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 shrink-0">
                        {percent}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>¥{goal.currentAmount.toLocaleString()} / ¥{goal.targetAmount.toLocaleString()}</span>
                      <span>残り ¥{remaining.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
              {activeGoals.length > 3 && (
                <p className="text-xs text-slate-400 text-center pt-1">
                  他 {activeGoals.length - 3} 件の目標
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Planned Expenses */}
        <Card
          title="今月の支出予定"
          action={
            currentMonthPlanned.length > 0 ? (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                期日順
              </span>
            ) : (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                予定なし
              </span>
            )
          }
        >
          {currentMonthPlanned.length === 0 ? (
            <div className="py-8 text-center">
              <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400">今月の支出予定はありません</p>
            </div>
          ) : (
            <div className="space-y-2">
              {currentMonthPlanned
                .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                .slice(0, 5)
                .map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                        {p.description}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">期日: {p.dueDate}</p>
                    </div>
                    <span className="font-bold text-sm text-slate-700 dark:text-slate-200 shrink-0 ml-2">
                      ¥{p.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              {currentMonthPlanned.length > 5 && (
                <p className="text-xs text-slate-400 text-center pt-1">
                  他 {currentMonthPlanned.length - 5} 件の予定
                </p>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Transactions */}
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
                  <div className="flex items-center gap-3 min-w-0">
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
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                        {tx.description}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {tx.date} • {cat?.name || 'カテゴリなし'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`font-bold text-sm sm:text-base shrink-0 ml-2 ${
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
    </div>
  );
};
