import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card } from '@/components/common/Card';
import { generateMonthlyTrend, generateAssetTrend } from '@/services/calculation/balanceEngine';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const { transactions, categories, categoryBreakdown, monthlyCashFlow, financialSummary, accounts, accountBalances, selectedYearMonth } = useApp();
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const pieData = Object.entries(categoryBreakdown)
    .map(([catId, amount]) => {
      const cat = categoryMap.get(catId);
      return {
        name: cat?.name || 'その他',
        value: amount,
        color: cat?.color || '#94a3b8',
      };
    })
    .sort((a, b) => b.value - a.value);

  const cashFlowData = generateMonthlyTrend(transactions, 6);
  const assetTrendData = generateAssetTrend(accounts, transactions, 6);

  // Account balance distribution
  const accountData = accounts
    .filter(a => a.isActive && a.includeInAssets)
    .map((acc) => {
      const balance = accountBalances[acc.id] ?? 0;
      return {
        name: acc.name,
        value: Math.max(balance, 0),
        type: acc.type,
      };
    })
    .filter(a => a.value > 0)
    .sort((a, b) => b.value - a.value);

  const ACCOUNT_COLORS: Record<string, string> = {
    bank: '#3b82f6',
    cash: '#22c55e',
    credit_card: '#8b5cf6',
    wallet: '#f59e0b',
    gift_card: '#ec4899',
    other: '#64748b',
  };

  return (
    <div className="space-y-5 animate-fadeIn px-1 sm:px-0">
      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-900 border-emerald-100 dark:border-emerald-900/50 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                {selectedYearMonth} 収入
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
                {selectedYearMonth} 支出
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
                {selectedYearMonth} 収支
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Category Pie Chart */}
        <Card title="カテゴリー別支出割合">
          {pieData.length === 0 ? (
            <div className="h-64 sm:h-72 flex items-center justify-center text-sm text-slate-400">
              今月の支出データがありません
            </div>
          ) : (
            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => [`¥${Number(val).toLocaleString()}`, '金額']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Category Breakdown List */}
        <Card title="カテゴリー別内訳一覧">
          {pieData.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">データがありません</div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {pieData.map((item) => {
                const percent =
                  monthlyCashFlow.expense > 0
                    ? Math.round((item.value / monthlyCashFlow.expense) * 100)
                    : 0;

                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-slate-400">{percent}%</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">
                          ¥{item.value.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${percent}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Account Distribution & Monthly Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <Card title="口座別資産構成">
          {accountData.length === 0 ? (
            <div className="h-64 sm:h-72 flex items-center justify-center text-sm text-slate-400">
              資産データがありません
            </div>
          ) : (
            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={accountData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                    labelLine={false}
                  >
                    {accountData.map((entry, index) => (
                      <Cell key={`acc-${index}`} fill={ACCOUNT_COLORS[entry.type] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => [`¥${Number(val).toLocaleString()}`, '残高']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="収支推移（直近6ヶ月）">
          <div className="h-64 sm:h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlowData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(v) => `¥${Math.round(v / 10000)}万`}
                />
                <Tooltip
                  formatter={(val: number, name: string) => [`¥${Number(val).toLocaleString()}`, name === 'income' ? '収入' : '支出']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="income" name="収入" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expense" name="支出" fill="#f43f5e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Asset Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <Card title="総資産・総負債推移（直近6ヶ月）">
          <div className="h-64 sm:h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={assetTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(v) => `¥${Math.round(v / 10000)}万`}
                />
                <Tooltip
                  formatter={(val: number, name: string) => {
                    const label = name === 'totalAssets' ? '総資産' : name === 'totalLiabilities' ? '負債' : '純資産';
                    return [`¥${Number(val).toLocaleString()}`, label];
                  }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="totalAssets" name="総資産" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="totalLiabilities" name="負債" fill="#f43f5e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="純資産推移（直近6ヶ月）">
          <div className="h-64 sm:h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={assetTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(v) => `¥${Math.round(v / 10000)}万`}
                />
                <Tooltip
                  formatter={(val: number) => [`¥${Number(val).toLocaleString()}`, '純資産']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="netAssets" name="純資産" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Asset Summary */}
      <Card title="資産・負債サマリー">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">総資産</p>
            <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-1">
              ¥{financialSummary.totalAssets.toLocaleString()}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50">
            <p className="text-xs font-bold text-rose-600 dark:text-rose-400">負債</p>
            <p className="text-2xl font-extrabold text-rose-500 mt-1">
              -¥{financialSummary.totalLiabilities.toLocaleString()}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
            <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">純資産</p>
            <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
              ¥{financialSummary.netAssets.toLocaleString()}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
