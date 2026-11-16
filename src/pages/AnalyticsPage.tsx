import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card } from '@/components/common/Card';
import {
  generateMonthlyTrend,
  generateAssetTrend,
  isExcludedFromCashFlow,
  isExchangeCategory,
} from '@/services/calculation/balanceEngine';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, PiggyBank, ChevronRight, ArrowLeft, Layers } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const {
    transactions,
    categories,
    categoryBreakdown,
    monthlyCashFlow,
    financialSummary,
    accounts,
    accountBalances,
    selectedYearMonth,
  } = useApp();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedCategoryId(null);
    setSelectedAccountId(null);
  }, [selectedYearMonth]);

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const categoryNameMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const pieData = useMemo(
    () =>
      Object.entries(categoryBreakdown)
        .map(([catId, amount]) => {
          const cat = categoryMap.get(catId);
          return {
            id: catId,
            name: cat?.name || 'その他',
            value: amount,
            color: cat?.color || '#94a3b8',
          };
        })
        .sort((a, b) => b.value - a.value),
    [categoryBreakdown, categoryMap]
  );

  // カテゴリ別支出(棒) + 累計支出推移(折れ線) の複合グラフデータ
  const composedCategoryData = useMemo(() => {
    let cumulative = 0;
    return pieData.map((item) => {
      cumulative += item.value;
      return {
        name: item.name,
        amount: item.value,
        cumulative,
        color: item.color,
      };
    });
  }, [pieData]);

  // ドリルダウン対象となる選択月の取引一覧（調整・経費は除外）
  const monthlyDrilldownTxs = useMemo(() => {
    return transactions
      .filter((tx) => {
        if (!tx.date.startsWith(selectedYearMonth)) return false;
        if (isExcludedFromCashFlow(tx, categoryNameMap)) return false;
        const isExchange = isExchangeCategory(tx, categoryNameMap);
        return tx.type === 'expense' || (isExchange && tx.type === 'income');
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, selectedYearMonth, categoryNameMap]);

  // Level 1: カテゴリー別集計
  const categoryDrilldownList = useMemo(() => {
    const map = new Map<string, { catId: string; name: string; color: string; amount: number; count: number }>();
    for (const tx of monthlyDrilldownTxs) {
      const catId = tx.categoryId || 'uncategorized';
      const cat = categoryMap.get(catId);
      const isExchangeIncome = isExchangeCategory(tx, categoryNameMap) && tx.type === 'income';
      const signed = isExchangeIncome ? -Math.round(Math.abs(tx.amount)) : Math.round(Math.abs(tx.amount));
      const existing = map.get(catId) || {
        catId,
        name: cat?.name || 'カテゴリなし',
        color: cat?.color || '#94a3b8',
        amount: 0,
        count: 0,
      };
      existing.amount += signed;
      existing.count += 1;
      map.set(catId, existing);
    }
    return Array.from(map.values())
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [monthlyDrilldownTxs, categoryMap, categoryNameMap]);

  // Level 2: 選択中カテゴリーの決済手段別集計
  const selectedCategoryTxs = useMemo(() => {
    if (!selectedCategoryId) return [];
    return monthlyDrilldownTxs.filter(
      (tx) => (tx.categoryId || 'uncategorized') === selectedCategoryId
    );
  }, [monthlyDrilldownTxs, selectedCategoryId]);

  const accountDrilldownList = useMemo(() => {
    const map = new Map<string, { accountId: string; name: string; amount: number; count: number }>();
    for (const tx of selectedCategoryTxs) {
      const acc = accountMap.get(tx.accountId);
      const isExchangeIncome = isExchangeCategory(tx, categoryNameMap) && tx.type === 'income';
      const signed = isExchangeIncome ? -Math.round(Math.abs(tx.amount)) : Math.round(Math.abs(tx.amount));
      const existing = map.get(tx.accountId) || {
        accountId: tx.accountId,
        name: acc?.name || '不明な口座',
        amount: 0,
        count: 0,
      };
      existing.amount += signed;
      existing.count += 1;
      map.set(tx.accountId, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [selectedCategoryTxs, accountMap, categoryNameMap]);

  // Level 3: 選択中カテゴリー × 決済手段の明細一覧
  const detailTxs = useMemo(() => {
    if (!selectedAccountId) return selectedCategoryTxs;
    return selectedCategoryTxs.filter((tx) => tx.accountId === selectedAccountId);
  }, [selectedCategoryTxs, selectedAccountId]);

  const cashFlowData = generateMonthlyTrend(transactions, 6, categoryNameMap);
  const assetTrendData = generateAssetTrend(accounts, transactions, 6, categoryNameMap);

  const accountData = accounts
    .filter((a) => a.isActive && a.includeInAssets)
    .map((acc) => {
      const balance = accountBalances[acc.id] ?? 0;
      return {
        name: acc.name,
        value: Math.max(balance, 0),
        type: acc.type,
      };
    })
    .filter((a) => a.value > 0)
    .sort((a, b) => b.value - a.value);

  const ACCOUNT_COLORS: Record<string, string> = {
    bank: '#3b82f6',
    cash: '#22c55e',
    credit_card: '#8b5cf6',
    wallet: '#f59e0b',
    gift_card: '#ec4899',
    other: '#64748b',
  };

  const selectedCategoryName = selectedCategoryId
    ? categoryMap.get(selectedCategoryId)?.name || 'カテゴリなし'
    : null;
  const selectedAccountName = selectedAccountId
    ? accountMap.get(selectedAccountId)?.name || '不明な口座'
    : null;

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

      {/* 複合グラフ: カテゴリー別支出(棒) + 累計支出推移(折れ線) */}
      <Card title="カテゴリー別支出・累計推移（複合グラフ）">
        {composedCategoryData.length === 0 ? (
          <div className="h-64 sm:h-72 flex items-center justify-center text-sm text-slate-400">
            今月の支出データがありません
          </div>
        ) : (
          <div className="h-72 sm:h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={composedCategoryData} margin={{ top: 10, right: 16, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} interval={0} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(v) => `¥${Number(v).toLocaleString()}`}
                />
                <Tooltip
                  formatter={(val: number, name: string) => [
                    `¥${Number(val).toLocaleString()}`,
                    name,
                  ]}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar dataKey="amount" name="カテゴリー支出" radius={[6, 6, 0, 0]} maxBarSize={44}>
                  {composedCategoryData.map((entry, idx) => (
                    <Cell key={`bar-${idx}`} fill={entry.color} />
                  ))}
                </Bar>
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  name="累計支出推移"
                  stroke="#0f172a"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#10b981', strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* 階層ドリルダウン: 全体サマリー → カテゴリー別 → 決済手段別・明細一覧 */}
      <Card
        title="支出ドリルダウン分析"
        action={
          selectedCategoryId ? (
            <button
              type="button"
              onClick={() => {
                if (selectedAccountId) setSelectedAccountId(null);
                else setSelectedCategoryId(null);
              }}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              戻る
            </button>
          ) : (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              タップして詳細へ
            </span>
          )
        }
      >
        {/* Breadcrumbs */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setSelectedCategoryId(null);
              setSelectedAccountId(null);
            }}
            className={`font-bold px-2 py-1 rounded-lg transition ${
              !selectedCategoryId
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            全体サマリー
          </button>
          {selectedCategoryName && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <button
                type="button"
                onClick={() => setSelectedAccountId(null)}
                className={`font-bold px-2 py-1 rounded-lg transition ${
                  selectedCategoryId && !selectedAccountId
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {selectedCategoryName}
              </button>
            </>
          )}
          {selectedAccountName && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-bold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                {selectedAccountName}
              </span>
            </>
          )}
        </div>

        {/* Level 1: Category Summary */}
        {!selectedCategoryId && (
          categoryDrilldownList.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">今月の支出データがありません</div>
          ) : (
            <div className="space-y-2.5">
              {categoryDrilldownList.map((item) => {
                const percent =
                  monthlyCashFlow.expense > 0
                    ? Math.round((item.amount / monthlyCashFlow.expense) * 100)
                    : 0;
                return (
                  <button
                    key={item.catId}
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId(item.catId);
                      setSelectedAccountId(null);
                    }}
                    className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 transition space-y-1.5"
                  >
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="font-bold text-slate-800 dark:text-slate-100 truncate">{item.name}</span>
                        <span className="text-[11px] text-slate-400">({item.count}件)</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-slate-400">{percent}%</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">¥{item.amount.toLocaleString()}</span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, percent))}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )
        )}

        {/* Level 2: Payment Method Breakdown inside selected category */}
        {selectedCategoryId && !selectedAccountId && (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                決済手段別の内訳（タップで明細を絞り込み）
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {accountDrilldownList.map((accItem) => (
                  <button
                    key={accItem.accountId}
                    type="button"
                    onClick={() => setSelectedAccountId(accItem.accountId)}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 flex items-center justify-between transition text-left"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{accItem.name}</p>
                      <p className="text-[11px] text-slate-400">{accItem.count}件の取引</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                        ¥{accItem.amount.toLocaleString()}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                {selectedCategoryName} の全明細（{selectedCategoryTxs.length}件）
              </h4>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto pr-1">
                {selectedCategoryTxs.map((tx) => {
                  const acc = accountMap.get(tx.accountId);
                  const isExchangeIncome = isExchangeCategory(tx, categoryNameMap) && tx.type === 'income';
                  return (
                    <div key={tx.id} className="py-2.5 flex items-center justify-between text-sm">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{tx.description || '無題'}</p>
                        <p className="text-xs text-slate-400">
                          {tx.date} • {acc?.name || '不明な口座'}
                        </p>
                      </div>
                      <span className={`font-bold shrink-0 ml-3 ${isExchangeIncome ? 'text-emerald-600' : 'text-slate-800 dark:text-slate-100'}`}>
                        {isExchangeIncome ? '+' : '-'}¥{tx.amount.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Level 3: Filtered Transactions by Category + Account */}
        {selectedCategoryId && selectedAccountId && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto pr-1">
            {detailTxs.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">該当する明細がありません</p>
            ) : (
              detailTxs.map((tx) => {
                const isExchangeIncome = isExchangeCategory(tx, categoryNameMap) && tx.type === 'income';
                return (
                  <div key={tx.id} className="py-3 flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{tx.description || '無題'}</p>
                      <p className="text-xs text-slate-400">{tx.date}</p>
                    </div>
                    <span className={`font-bold shrink-0 ml-3 ${isExchangeIncome ? 'text-emerald-600' : 'text-slate-800 dark:text-slate-100'}`}>
                      {isExchangeIncome ? '+' : '-'}¥{tx.amount.toLocaleString()}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}
      </Card>

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

        {/* Account Distribution */}
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
      </div>

      {/* Monthly Trend & Asset Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
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
