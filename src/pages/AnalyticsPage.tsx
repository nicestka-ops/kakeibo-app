import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import { calculateMonthlyCashFlow } from '@/services/calculation/balanceEngine';
import { getNextYearMonth, getPreviousYearMonth } from '@/services/calculation/forecast';
import { MonthlySummaryView } from './analytics/MonthlySummaryView';
import { CategoryAnalysisView } from './analytics/CategoryAnalysisView';
import { CashflowTrendView } from './analytics/CashflowTrendView';
import { AssetAnalysisView } from './analytics/AssetAnalysisView';
import {
  ChevronLeft,
  ChevronRight,
  BarChart3,
  PieChart,
  TrendingUp,
  Wallet,
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const { tab } = useParams<{ tab?: string }>();
  const {
    transactions,
    categories,
    budget,
    monthlyCashFlow,
    selectedYearMonth,
    setSelectedYearMonth,
  } = useApp();
  const { customColors } = useTheme();

  if (tab === 'monthly') return <MonthlySummaryView />;
  if (tab === 'categories') return <CategoryAnalysisView />;
  if (tab === 'trend') return <CashflowTrendView />;
  if (tab === 'assets') return <AssetAnalysisView />;

  const categoryNameMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const [yearStr, monthStr] = selectedYearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const prevYm = getPreviousYearMonth(selectedYearMonth);
  const prevFlow = useMemo(
    () => calculateMonthlyCashFlow(transactions, prevYm, categoryNameMap),
    [transactions, prevYm, categoryNameMap]
  );

  const budgetTotal = budget.totalAmount || 0;
  const budgetPct = budgetTotal > 0 ? Math.round((monthlyCashFlow.expense / budgetTotal) * 100) : 0;
  const budgetRemaining = budgetTotal - monthlyCashFlow.expense;
  const expenseDiffFromPrev = monthlyCashFlow.expense - prevFlow.expense;

  const menuItems = [
    {
      to: '/analytics/monthly',
      title: '月間サマリー',
      subtitle: '予算達成状況・前月との比較',
      icon: BarChart3,
      bg: 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400',
    },
    {
      to: '/analytics/categories',
      title: 'カテゴリ分析',
      subtitle: '構成比・ランキング・月別推移',
      icon: PieChart,
      bg: 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400',
    },
    {
      to: '/analytics/trend',
      title: '収支推移',
      subtitle: '月別・日別の収入と支出の流れ',
      icon: TrendingUp,
      bg: 'bg-pink-50 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400',
    },
    {
      to: '/analytics/assets',
      title: '口座・資産分析',
      subtitle: '残高・資産構成・口座ごとの入出金',
      icon: Wallet,
      bg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400',
    },
  ];

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="pt-1">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
          分析
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          {year}年{month}月の状況を確認して、詳しい分析へ進めます
        </p>
      </div>

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
          onClick={() => setSelectedYearMonth(getNextYearMonth(selectedYearMonth))}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="翌月"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 3 KPI Cards */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-2xl p-3 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
          <p className="text-[11px] font-bold text-slate-500">収入</p>
          <p
            className="text-base font-extrabold tabular-nums mt-0.5"
            style={{ color: customColors.income }}
          >
            {monthlyCashFlow.income.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl p-3 bg-pink-50/80 dark:bg-pink-950/30 border border-pink-100 dark:border-pink-900/40">
          <p className="text-[11px] font-bold text-slate-500">支出</p>
          <p
            className="text-base font-extrabold tabular-nums mt-0.5"
            style={{ color: customColors.expense }}
          >
            {monthlyCashFlow.expense.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl p-3 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
          <p className="text-[11px] font-bold text-slate-500">収支</p>
          <p
            className="text-base font-extrabold tabular-nums mt-0.5"
            style={{ color: customColors.summary }}
          >
            {monthlyCashFlow.netSavings.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Budget Progress */}
      <div className="rounded-3xl p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
            予算達成状況
          </span>
          <span
            className={`text-xs font-extrabold tabular-nums ${
              budgetPct > 100 ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            消化率 {budgetPct}%
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
        <div className="flex items-center justify-between text-[11px] text-slate-400 tabular-nums">
          <span>支出 {monthlyCashFlow.expense.toLocaleString()} 円</span>
          <span>
            {budgetTotal <= 0
              ? '予算未設定'
              : budgetRemaining >= 0
              ? `残り ${budgetRemaining.toLocaleString()} 円`
              : `超過 ${Math.abs(budgetRemaining).toLocaleString()} 円`}
          </span>
        </div>
      </div>

      {/* Diff from Last Month */}
      <div className="rounded-2xl px-4 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500">前月との支出差</span>
        <span
          className={`text-sm font-extrabold tabular-nums ${
            expenseDiffFromPrev > 0 ? 'text-rose-500' : 'text-emerald-600'
          }`}
        >
          {expenseDiffFromPrev > 0
            ? `+${expenseDiffFromPrev.toLocaleString()} 円`
            : `${expenseDiffFromPrev.toLocaleString()} 円`}
        </span>
      </div>

      {/* Detailed Analysis Menu */}
      <div className="space-y-2.5 pt-1">
        <h2 className="text-xs font-bold text-slate-400 px-1">詳しい分析</h2>
        <div className="space-y-2.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center justify-between p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:border-slate-200 dark:hover:border-slate-700 active:scale-[0.99] transition"
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${item.bg}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{item.subtitle}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};
