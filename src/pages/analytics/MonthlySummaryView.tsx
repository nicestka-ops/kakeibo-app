import React, { useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import { SubPageHeader } from '@/components/common/SubPageHeader';
import { calculateMonthlyCashFlow, generateMonthlyTrend } from '@/services/calculation/balanceEngine';
import { getNextYearMonth, getPreviousYearMonth } from '@/services/calculation/forecast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const MonthlySummaryView: React.FC = () => {
  const { transactions, categories, budget, selectedYearMonth, setSelectedYearMonth } = useApp();
  const { customColors } = useTheme();

  const categoryNameMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const [yearStr, monthStr] = selectedYearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const prevYm = getPreviousYearMonth(selectedYearMonth);
  const curFlow = useMemo(
    () => calculateMonthlyCashFlow(transactions, selectedYearMonth, categoryNameMap),
    [transactions, selectedYearMonth, categoryNameMap]
  );
  const prevFlow = useMemo(
    () => calculateMonthlyCashFlow(transactions, prevYm, categoryNameMap),
    [transactions, prevYm, categoryNameMap]
  );

  const trendData = useMemo(
    () =>
      generateMonthlyTrend(transactions, 6, categoryNameMap).map((d) => ({
        ...d,
        label: `${parseInt(d.month.slice(5), 10)}月`,
      })),
    [transactions, categoryNameMap]
  );

  const budgetTotal = budget.totalAmount || 0;
  const budgetPct = budgetTotal > 0 ? Math.round((curFlow.expense / budgetTotal) * 100) : 0;
  const budgetDiff = budgetTotal - curFlow.expense;

  const incomeDiff = curFlow.income - prevFlow.income;
  const expenseDiff = curFlow.expense - prevFlow.expense;
  const netDiff = curFlow.netSavings - prevFlow.netSavings;

  return (
    <div className="space-y-4 animate-fadeIn">
      <SubPageHeader
        title="月間サマリー"
        subtitle="収入・支出・予算達成状況と前月比較"
        backTo="/analytics"
      />

      <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
        <button
          type="button"
          onClick={() => setSelectedYearMonth(prevYm)}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
          {year}年{month}月
        </span>
        <button
          type="button"
          onClick={() => setSelectedYearMonth(getNextYearMonth(selectedYearMonth))}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Blue Summary Card */}
      <div
        className="rounded-3xl p-5 text-white shadow-lg"
        style={{
          background: `linear-gradient(135deg, ${customColors.summary} 0%, #2563EB 100%)`,
        }}
      >
        <p className="text-xs font-bold text-white/80">収支</p>
        <p className="text-3xl font-extrabold tabular-nums mt-0.5 mb-4">
          {curFlow.netSavings < 0
            ? `-¥${Math.abs(curFlow.netSavings).toLocaleString()}`
            : `+¥${curFlow.netSavings.toLocaleString()}`}
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl bg-white/15 px-3.5 py-2.5">
            <p className="text-[11px] text-white/80">収入</p>
            <p className="text-base font-extrabold tabular-nums">
              ¥{curFlow.income.toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl bg-white/15 px-3.5 py-2.5">
            <p className="text-[11px] text-white/80">支出</p>
            <p className="text-base font-extrabold tabular-nums">
              ¥{curFlow.expense.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Budget Progress */}
      <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
            予算達成状況
          </h2>
          <span
            className={`text-sm font-extrabold tabular-nums ${
              budgetPct > 100 ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            {budgetPct}%
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
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>総予算 {budgetTotal.toLocaleString()} 円</span>
          <span>
            {budgetDiff >= 0
              ? `残り ${budgetDiff.toLocaleString()} 円`
              : `超過 ${Math.abs(budgetDiff).toLocaleString()} 円`}
          </span>
        </div>
      </div>

      {/* Comparison with Last Month */}
      <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
            前月との比較
          </h2>
          <p className="text-[11px] text-slate-400">
            {prevYm.replace('-', '年')}月の確定値との差
          </p>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {[
            { label: '収入', val: curFlow.income, diff: incomeDiff, positiveGood: true },
            { label: '支出', val: curFlow.expense, diff: expenseDiff, positiveGood: false },
            { label: '収支', val: curFlow.netSavings, diff: netDiff, positiveGood: true },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between py-2.5">
              <span className="text-slate-500">{row.label}</span>
              <div className="flex items-center gap-2 tabular-nums">
                <span className="font-extrabold text-slate-900 dark:text-slate-100">
                  {row.val.toLocaleString()} 円
                </span>
                <span
                  className={`text-[11px] font-bold ${
                    row.diff === 0
                      ? 'text-slate-400'
                      : (row.positiveGood ? row.diff > 0 : row.diff < 0)
                      ? 'text-emerald-600'
                      : 'text-rose-500'
                  }`}
                >
                  {row.diff >= 0 ? '↗' : '↘'} {Math.abs(row.diff).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6 Months Bar Chart */}
      <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
        <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
          直近6ヶ月の収入・支出
        </h2>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v: number) => `${v.toLocaleString()} 円`}
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
              />
              <Bar dataKey="income" name="収入" fill={customColors.income} radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="支出" fill={customColors.expense} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
