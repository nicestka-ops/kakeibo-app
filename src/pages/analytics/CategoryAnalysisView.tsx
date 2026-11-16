import React, { useMemo, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { SubPageHeader } from '@/components/common/SubPageHeader';
import { isExcludedFromCashFlow, isExchangeCategory } from '@/services/calculation/balanceEngine';
import { getDaysInYearMonth, getNextYearMonth, getPreviousYearMonth } from '@/services/calculation/forecast';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const CategoryAnalysisView: React.FC = () => {
  const { transactions, categories, selectedYearMonth, setSelectedYearMonth } = useApp();
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const [selectedCatId, setSelectedCatId] = useState<string>('');

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const categoryNameMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const [yearStr, monthStr] = selectedYearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  // 選択月のカテゴリ別集計
  const rankingData = useMemo(() => {
    const totals = new Map<string, number>();
    for (const tx of transactions) {
      if (!tx.date.startsWith(selectedYearMonth)) continue;
      if (isExcludedFromCashFlow(tx, categoryNameMap)) continue;
      const isExchange = isExchangeCategory(tx, categoryNameMap);

      if (kind === 'expense') {
        if (tx.type === 'expense') {
          const catId = tx.categoryId || 'uncategorized';
          totals.set(catId, (totals.get(catId) || 0) + Math.round(Math.abs(tx.amount)));
        } else if (tx.type === 'income' && isExchange) {
          const catId = tx.categoryId || 'uncategorized';
          totals.set(catId, (totals.get(catId) || 0) - Math.round(Math.abs(tx.amount)));
        }
      } else {
        if (tx.type === 'income' && !isExchange) {
          const catId = tx.categoryId || 'uncategorized';
          totals.set(catId, (totals.get(catId) || 0) + Math.round(Math.abs(tx.amount)));
        }
      }
    }

    const list = Array.from(totals.entries())
      .filter(([, amount]) => amount > 0)
      .map(([catId, amount]) => {
        const cat = categoryMap.get(catId);
        return {
          id: catId,
          name: cat?.name || 'その他',
          color: cat?.color || '#94a3b8',
          amount,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    const totalSum = list.reduce((s, i) => s + i.amount, 0);
    return {
      totalSum,
      items: list.map((item) => ({
        ...item,
        pct: totalSum > 0 ? Math.round((item.amount / totalSum) * 100) : 0,
      })),
    };
  }, [transactions, selectedYearMonth, kind, categoryMap, categoryNameMap]);

  const activeCatId =
    selectedCatId && rankingData.items.some((i) => i.id === selectedCatId)
      ? selectedCatId
      : rankingData.items[0]?.id || '';

  // 直近6ヶ月のカテゴリ別積み上げ棒グラフ
  const stackedMonthlyData = useMemo(() => {
    const months: string[] = [];
    let cur = selectedYearMonth;
    for (let i = 0; i < 6; i++) {
      months.unshift(cur);
      cur = getPreviousYearMonth(cur);
    }

    const topCats = rankingData.items.slice(0, 4);
    const topIds = new Set(topCats.map((c) => c.id));

    return {
      topCats,
      rows: months.map((ym) => {
        const row: Record<string, string | number> = {
          label: `${parseInt(ym.slice(5), 10)}月`,
          その他: 0,
        };
        for (const c of topCats) row[c.name] = 0;

        for (const tx of transactions) {
          if (!tx.date.startsWith(ym)) continue;
          if (isExcludedFromCashFlow(tx, categoryNameMap)) continue;
          if (kind === 'expense' && tx.type !== 'expense') continue;
          if (kind === 'income' && tx.type !== 'income') continue;
          const catId = tx.categoryId || 'uncategorized';
          const amt = Math.round(Math.abs(tx.amount));
          if (topIds.has(catId)) {
            const name = categoryMap.get(catId)?.name || 'その他';
            row[name] = (Number(row[name]) || 0) + amt;
          } else {
            row['その他'] = Number(row['その他']) + amt;
          }
        }
        return row;
      }),
    };
  }, [selectedYearMonth, rankingData.items, transactions, categoryNameMap, categoryMap, kind]);

  // 選択中カテゴリの日別推移・月別推移
  const selectedCategoryDetail = useMemo(() => {
    if (!activeCatId) return null;
    const cat = categoryMap.get(activeCatId);
    const days = getDaysInYearMonth(selectedYearMonth);
    const dailyTotals = Array.from({ length: days }, (_, i) => ({
      day: i + 1,
      amount: 0,
    }));

    let monthTotal = 0;
    let count = 0;
    for (const tx of transactions) {
      if (!tx.date.startsWith(selectedYearMonth)) continue;
      if ((tx.categoryId || 'uncategorized') !== activeCatId) continue;
      if (kind === 'expense' && tx.type !== 'expense') continue;
      if (kind === 'income' && tx.type !== 'income') continue;
      const amt = Math.round(Math.abs(tx.amount));
      const dIdx = parseInt(tx.date.slice(8, 10), 10) - 1;
      if (dailyTotals[dIdx]) dailyTotals[dIdx].amount += amt;
      monthTotal += amt;
      count += 1;
    }

    const months: string[] = [];
    let cur = selectedYearMonth;
    for (let i = 0; i < 6; i++) {
      months.unshift(cur);
      cur = getPreviousYearMonth(cur);
    }
    let sixMonthTotal = 0;
    const monthlySeries = months.map((ym) => {
      let sum = 0;
      for (const tx of transactions) {
        if (!tx.date.startsWith(ym)) continue;
        if ((tx.categoryId || 'uncategorized') !== activeCatId) continue;
        if (kind === 'expense' && tx.type !== 'expense') continue;
        if (kind === 'income' && tx.type !== 'income') continue;
        sum += Math.round(Math.abs(tx.amount));
      }
      sixMonthTotal += sum;
      return { label: `${parseInt(ym.slice(5), 10)}月`, amount: sum };
    });

    return {
      color: cat?.color || '#ec4899',
      monthTotal,
      count,
      sixMonthTotal,
      dailyTotals,
      monthlySeries,
    };
  }, [activeCatId, categoryMap, selectedYearMonth, transactions, kind]);

  return (
    <div className="space-y-4 animate-fadeIn">
      <SubPageHeader
        title="カテゴリ分析"
        subtitle="構成比・ランキング・月別推移"
        backTo="/analytics"
      />

      {/* Month Switcher */}
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

      {/* Kind Toggle */}
      <div className="grid grid-cols-2 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-full">
        <button
          type="button"
          onClick={() => setKind('expense')}
          className={`py-2 rounded-full text-xs font-bold transition ${
            kind === 'expense'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500'
          }`}
        >
          支出
        </button>
        <button
          type="button"
          onClick={() => setKind('income')}
          className={`py-2 rounded-full text-xs font-bold transition ${
            kind === 'income'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500'
          }`}
        >
          収入
        </button>
      </div>

      {/* Donut Chart */}
      <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
            カテゴリ別 {kind === 'expense' ? '支出割合' : '収入割合'}
          </h2>
          <span className="text-xs font-bold text-slate-500 tabular-nums">
            合計 {rankingData.totalSum.toLocaleString()} 円
          </span>
        </div>

        {rankingData.items.length === 0 ? (
          <p className="py-10 text-center text-xs text-slate-400">データがありません</p>
        ) : (
          <>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={rankingData.items}
                    dataKey="amount"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={2}
                  >
                    {rankingData.items.map((entry) => (
                      <Cell key={entry.id} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v.toLocaleString()} 円`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              {rankingData.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 truncate text-slate-600 dark:text-slate-300">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 tabular-nums shrink-0">
                    {item.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Ranking */}
      <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
        <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
          {year}年{month}月の{kind === 'expense' ? '支出' : '収入'}ランキング
        </h2>
        <div className="space-y-3">
          {rankingData.items.map((item, idx) => (
            <div key={item.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold w-4">{idx + 1}</span>
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${item.color}20` }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{item.name}</span>
                </div>
                <div className="text-right tabular-nums">
                  <span className="font-extrabold text-slate-900 dark:text-slate-50">
                    {item.amount.toLocaleString()} 円
                  </span>
                  <span className="ml-1.5 text-[10px] text-slate-400">{item.pct}%</span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden ml-6">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stacked Monthly */}
      <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
        <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
          カテゴリーごとの月別{kind === 'expense' ? '支出' : '収入'}
        </h2>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stackedMonthlyData.rows} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => `${v.toLocaleString()} 円`} />
              {stackedMonthlyData.topCats.map((c) => (
                <Bar key={c.id} dataKey={c.name} stackId="a" fill={c.color} />
              ))}
              <Bar dataKey="その他" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Detail Trend */}
      {selectedCategoryDetail && (
        <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
              カテゴリー別の推移
            </h2>
            <select
              value={activeCatId}
              onChange={(e) => setSelectedCatId(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
            >
              {rankingData.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
              <p className="text-[10px] text-slate-400">月合計</p>
              <p className="text-xs font-extrabold text-pink-600 tabular-nums mt-0.5">
                {selectedCategoryDetail.monthTotal.toLocaleString()} 円
              </p>
            </div>
            <div className="p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
              <p className="text-[10px] text-slate-400">利用回数</p>
              <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100 tabular-nums mt-0.5">
                {selectedCategoryDetail.count} 回
              </p>
            </div>
            <div className="p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
              <p className="text-[10px] text-slate-400">直近6ヶ月</p>
              <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100 tabular-nums mt-0.5">
                {selectedCategoryDetail.sixMonthTotal.toLocaleString()} 円
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-500 mb-2">
              {year}年{month}月の日別推移
            </p>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={selectedCategoryDetail.dailyTotals} margin={{ top: 5, right: 5, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => `${v.toLocaleString()} 円`} />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke={selectedCategoryDetail.color}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-500 mb-2">月別推移</p>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={selectedCategoryDetail.monthlySeries} margin={{ top: 5, right: 5, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => `${v.toLocaleString()} 円`} />
                  <Bar dataKey="amount" fill={selectedCategoryDetail.color} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
