import React, { useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { SubPageHeader } from '@/components/common/SubPageHeader';
import {
  calculateEndOfMonthForecast,
  getMonthlyPlannedExpenses,
  getNextYearMonth,
  getPreviousYearMonth,
} from '@/services/calculation/forecast';
import { calculateMonthlyCashFlow } from '@/services/calculation/balanceEngine';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const ForecastPage: React.FC = () => {
  const {
    transactions,
    plannedExpenses,
    categories,
    budget,
    selectedYearMonth,
    setSelectedYearMonth,
  } = useApp();

  const categoryNameMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const [yearStr, monthStr] = selectedYearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const forecast = useMemo(
    () => calculateEndOfMonthForecast(transactions, selectedYearMonth, categoryNameMap),
    [transactions, selectedYearMonth, categoryNameMap]
  );

  const plannedSummary = useMemo(
    () => getMonthlyPlannedExpenses(plannedExpenses, selectedYearMonth),
    [plannedExpenses, selectedYearMonth]
  );

  const nextYm = getNextYearMonth(selectedYearMonth);
  const nextMonthPlanned = useMemo(
    () => getMonthlyPlannedExpenses(plannedExpenses, nextYm),
    [plannedExpenses, nextYm]
  );

  const prevYm = getPreviousYearMonth(selectedYearMonth);
  const prevCashFlow = useMemo(
    () => calculateMonthlyCashFlow(transactions, prevYm, categoryNameMap),
    [transactions, prevYm, categoryNameMap]
  );

  const plannedTotalExpense = forecast.actualExpense + plannedSummary.total;
  const budgetAmount = budget.totalAmount || 0;
  const budgetDiff = budgetAmount > 0 ? forecast.estimatedExpense - budgetAmount : 0;
  const budgetPct = budgetAmount > 0 ? Math.round((forecast.estimatedExpense / budgetAmount) * 100) : 0;
  const prevDiff = forecast.actualExpense - prevCashFlow.expense;

  return (
    <div className="space-y-4 animate-fadeIn">
      <SubPageHeader
        title="支出予測"
        subtitle="実績ベースの推定と、予定込みの見込み"
        backTo="/"
      />

      {/* Month Switcher */}
      <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
        <button
          type="button"
          onClick={() => setSelectedYearMonth(prevYm)}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="前月"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
          {year}年{month}月
        </span>
        <button
          type="button"
          onClick={() => setSelectedYearMonth(nextYm)}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="翌月"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Card A: 実績ベースの月末予測 */}
      <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
            A. 実績ベースの月末予測
          </h2>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-pink-50 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400">
            {forecast.isFinalized ? '実績確定' : '推定'}
          </span>
        </div>
        <p className="text-[11px] text-slate-400">
          {forecast.isFinalized
            ? '終了した月のため、予測ではなく確定した全支出を表示しています'
            : '当月の実績支出を経過日数で割り、月末まで続いた場合の金額を推定します'}
        </p>

        <div className="text-3xl font-extrabold text-pink-600 dark:text-pink-400 tabular-nums">
          ¥{forecast.estimatedExpense.toLocaleString()}
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs pt-1">
          <div className="flex justify-between py-2">
            <span className="text-slate-500">実績支出</span>
            <span className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">
              {forecast.actualExpense.toLocaleString()} 円
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-slate-500">経過日数（当日を含む）</span>
            <span className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">
              {forecast.elapsedDays} / {forecast.daysInMonth} 日
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-slate-500">1日あたりの平均支出</span>
            <span className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">
              {forecast.dailyAvg.toLocaleString()} 円
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {forecast.isFinalized ? '月末確定額' : '月末予測額'}
            </span>
            <span className="font-extrabold text-pink-600 dark:text-pink-400 tabular-nums">
              {forecast.estimatedExpense.toLocaleString()} 円
            </span>
          </div>
        </div>

        {!forecast.isFinalized && (
          <p className="text-[11px] text-slate-400 pt-1">
            {forecast.actualExpense.toLocaleString()} 円 ÷ {forecast.elapsedDays} 日 ×{' '}
            {forecast.daysInMonth} 日 ＝ {forecast.estimatedExpense.toLocaleString()} 円
          </p>
        )}
      </div>

      {/* Card B: 予定込み支出予測 */}
      <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
        <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
          B. 予定込み支出予測
        </h2>
        <p className="text-[11px] text-slate-400">
          実績支出に、まだ実現していない支出予定を足した見込み（日割り推定は含みません）
        </p>

        <div className="text-3xl font-extrabold text-amber-500 tabular-nums">
          ¥{plannedTotalExpense.toLocaleString()}
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          <div className="flex justify-between py-2">
            <span className="text-slate-500">実績支出</span>
            <span className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">
              {forecast.actualExpense.toLocaleString()} 円
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-slate-500">未完了の支出予定</span>
            <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">
              {plannedSummary.items.length > 0
                ? `${plannedSummary.total.toLocaleString()} 円（${plannedSummary.items.length}件）`
                : '—'}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="font-bold text-slate-700 dark:text-slate-200">合計</span>
            <span className="font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
              {plannedTotalExpense.toLocaleString()} 円
            </span>
          </div>
        </div>

        {plannedSummary.items.length > 0 && (
          <div className="pt-2 space-y-1.5 border-t border-slate-100 dark:border-slate-800">
            {plannedSummary.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-slate-400 tabular-nums shrink-0">
                    {item.dueDate.slice(5).replace('-', '/')}
                  </span>
                  <span className="text-slate-700 dark:text-slate-200 truncate">
                    {item.description}
                  </span>
                </div>
                <span className="font-bold text-slate-800 dark:text-slate-100 tabular-nums shrink-0">
                  {item.amount.toLocaleString()} 円
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Card 3: 月間予算との比較 */}
      <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
        <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
          月間予算との比較
        </h2>
        {budgetAmount <= 0 ? (
          <p className="text-xs text-slate-400">月間総予算が設定されていません</p>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">
                月間予算 {budgetAmount.toLocaleString()} 円
              </span>
              <span
                className={`font-extrabold tabular-nums ${
                  budgetDiff > 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {budgetDiff > 0
                  ? `予測超過 ${budgetDiff.toLocaleString()} 円`
                  : `余裕 ${Math.abs(budgetDiff).toLocaleString()} 円`}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  budgetPct > 100 ? 'bg-rose-600' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, budgetPct)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              {forecast.isFinalized ? '確定額' : '予測額'}は予算の {budgetPct}% 相当です
            </p>
          </>
        )}
      </div>

      {/* Card 4: 先月の実績との比較 */}
      <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-2.5">
        <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
          先月の実績との比較
        </h2>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">
            {prevYm.replace('-', '年')}月の実績支出
          </span>
          <span className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">
            {prevCashFlow.expense.toLocaleString()} 円
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">差額</span>
          <span
            className={`font-extrabold tabular-nums ${
              prevDiff > 0 ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            {prevDiff > 0
              ? `+${prevDiff.toLocaleString()} 円`
              : `${prevDiff.toLocaleString()} 円`}
          </span>
        </div>
        <p className="text-[11px] text-slate-400">
          差額は「当月（実績）− 先月（実績）」です
        </p>
      </div>

      {/* Card 5: 翌月の予定 */}
      <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
        <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
          {nextYm.replace('-', '年')}月の予定
        </h2>
        <p className="text-[11px] text-slate-400">
          登録済みの支出予定・定期予定のみで算出します（過去月からの日割り計算は作りません）
        </p>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-slate-500">
            未完了の予定 {nextMonthPlanned.items.length}件
          </span>
          <span className="text-base font-extrabold text-amber-500 tabular-nums">
            {nextMonthPlanned.total.toLocaleString()} 円
          </span>
        </div>
      </div>
    </div>
  );
};
