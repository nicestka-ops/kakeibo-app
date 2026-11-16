import React, { useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import { SubPageHeader } from '@/components/common/SubPageHeader';
import {
  generateMonthlyTrend,
  isExcludedFromCashFlow,
  isExchangeCategory,
} from '@/services/calculation/balanceEngine';
import { getDaysInYearMonth, getNextYearMonth, getPreviousYearMonth } from '@/services/calculation/forecast';
import {
  BarChart,
  Bar,
  Cell,
  ComposedChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const CashflowTrendView: React.FC = () => {
  const { transactions, categories, selectedYearMonth, setSelectedYearMonth } = useApp();
  const { customColors } = useTheme();

  const categoryNameMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const [yearStr, monthStr] = selectedYearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const trend12 = useMemo(
    () =>
      generateMonthlyTrend(transactions, 12, categoryNameMap).map((d) => ({
        ...d,
        label: `${parseInt(d.month.slice(5), 10)}月`,
      })),
    [transactions, categoryNameMap]
  );

  // 選択月の日別支出・累積・収支
  const dailyTrendData = useMemo(() => {
    const days = getDaysInYearMonth(selectedYearMonth);
    const rows = Array.from({ length: days }, (_, i) => ({
      day: i + 1,
      expense: 0,
      income: 0,
      cumulativeExpense: 0,
      cumulativeNet: 0,
    }));

    for (const tx of transactions) {
      if (!tx.date.startsWith(selectedYearMonth)) continue;
      if (isExcludedFromCashFlow(tx, categoryNameMap)) continue;
      const dIdx = parseInt(tx.date.slice(8, 10), 10) - 1;
      if (!rows[dIdx]) continue;
      const amt = Math.round(Math.abs(tx.amount));
      const isExchange = isExchangeCategory(tx, categoryNameMap);

      if (tx.type === 'expense') {
        rows[dIdx].expense += amt;
      } else if (tx.type === 'income') {
        if (isExchange) rows[dIdx].expense -= amt;
        else rows[dIdx].income += amt;
      }
    }

    let cumExp = 0;
    let cumNet = 0;
    return rows.map((r) => {
      cumExp += r.expense;
      cumNet += r.income - r.expense;
      return {
        ...r,
        cumulativeExpense: cumExp,
        cumulativeNet: cumNet,
      };
    });
  }, [transactions, selectedYearMonth, categoryNameMap]);

  return (
    <div className="space-y-4 animate-fadeIn">
      <SubPageHeader
        title="収支推移"
        subtitle="月別・日別の収入と支出の流れ"
        backTo="/analytics"
      />

      <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
        <button
          type="button"
          onClick={() => setSelectedYearMonth(getPreviousYearMonth(selectedYearMonth))}
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

      {/* 12ヶ月 収入・支出 */}
      <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
        <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
          月別の収入・支出（12ヶ月）
        </h2>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend12} margin={{ top: 5, right: 5, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => `${v.toLocaleString()} 円`} />
              <Bar dataKey="income" name="収入" fill={customColors.income} radius={[3, 3, 0, 0]} />
              <Bar dataKey="expense" name="支出" fill={customColors.expense} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 月別収支 */}
      <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
        <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">月別収支</h2>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend12} margin={{ top: 5, right: 5, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => `${v.toLocaleString()} 円`} />
              <Bar dataKey="balance" name="収支" radius={[3, 3, 0, 0]}>
                {trend12.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={entry.balance >= 0 ? customColors.income : customColors.expense}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 日別支出と累積 */}
      <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
        <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
          {year}年{month}月の日別支出と累積
        </h2>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={dailyTrendData} margin={{ top: 5, right: 5, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => `${v.toLocaleString()} 円`} />
              <Line
                type="monotone"
                dataKey="expense"
                name="日別支出"
                stroke={customColors.expense}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="cumulativeExpense"
                name="利用累積"
                stroke={customColors.assets}
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 日別の収支（プラス/マイナス） */}
      <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
        <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
          日別の収支（プラス/マイナス）
        </h2>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyTrendData} margin={{ top: 5, right: 5, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => `${v.toLocaleString()} 円`} />
              <Area
                type="monotone"
                dataKey="cumulativeNet"
                name="累計収支"
                stroke={customColors.summary}
                fill={`${customColors.summary}25`}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
