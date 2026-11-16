import React, { useMemo, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import { SubPageHeader } from '@/components/common/SubPageHeader';
import { calculateMonthlyCashFlow } from '@/services/calculation/balanceEngine';
import {
  calculateLinkedCardBillingForBank,
  getMonthlyPlannedExpenses,
  getNextYearMonth,
  getPreviousYearMonth,
} from '@/services/calculation/forecast';
import { getTodayDateString } from '@/services/calculation/cardBilling';
import {
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChevronLeft, ChevronRight, Landmark, Banknote, Smartphone, Ticket, ShoppingBag, Wallet } from 'lucide-react';

const ASSET_COLORS = ['#7047FF', '#06B6D4', '#10B981', '#F59E0B', '#EC4899', '#3B82F6'];

function getAccIcon(type: string, name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('amazon')) return ShoppingBag;
  if (lower.includes('商品券') || type === 'gift_card') return Ticket;
  if (lower.includes('アプリ') || type === 'wallet') return Smartphone;
  if (type === 'cash' || name.includes('現金')) return Banknote;
  if (type === 'bank' || name.includes('銀行')) return Landmark;
  return Wallet;
}

export const AssetAnalysisView: React.FC = () => {
  const {
    accounts,
    transactions,
    plannedExpenses,
    categories,
    accountBalances,
    selectedYearMonth,
    setSelectedYearMonth,
  } = useApp();
  const { customColors } = useTheme();
  const [trendRange, setTrendRange] = useState<3 | 6 | 9>(6);

  const categoryNameMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const todayStr = getTodayDateString();
  const [yearStr, monthStr] = selectedYearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const assetAccounts = useMemo(
    () =>
      accounts
        .filter((a) => a.isActive && a.type !== 'credit_card')
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [accounts]
  );

  const totalAssets = useMemo(
    () => assetAccounts.reduce((s, a) => s + (accountBalances[a.id] ?? 0), 0),
    [assetAccounts, accountBalances]
  );

  const unpaidLiabilities = useMemo(() => {
    const plannedSum = getMonthlyPlannedExpenses(plannedExpenses, selectedYearMonth).total;
    let cardSum = 0;
    for (const acc of assetAccounts) {
      const cb = calculateLinkedCardBillingForBank(
        acc.id,
        accounts,
        transactions,
        categoryNameMap,
        todayStr
      );
      cardSum += cb.confirmedAmount + cb.preliminaryAmount;
    }
    return plannedSum + cardSum;
  }, [assetAccounts, accounts, transactions, plannedExpenses, selectedYearMonth, categoryNameMap, todayStr]);

  const netAssets = totalAssets - unpaidLiabilities;

  const pieData = useMemo(
    () =>
      assetAccounts
        .map((acc, idx) => ({
          id: acc.id,
          name: acc.name,
          value: Math.max(0, accountBalances[acc.id] ?? 0),
          color: ASSET_COLORS[idx % ASSET_COLORS.length],
        }))
        .filter((d) => d.value > 0),
    [assetAccounts, accountBalances]
  );

  // 口座別入出金（選択月）
  const accountFlowList = useMemo(() => {
    return assetAccounts.map((acc) => {
      let inAmt = 0;
      let outAmt = 0;
      for (const tx of transactions) {
        if (!tx.date.startsWith(selectedYearMonth) || tx.accountId !== acc.id) continue;
        const amt = Math.round(Math.abs(tx.amount));
        if (tx.type === 'income' || tx.type === 'transfer_in' || tx.type === 'adjustment') {
          inAmt += amt;
        } else {
          outAmt += amt;
        }
      }
      return { acc, inAmt, outAmt };
    });
  }, [assetAccounts, transactions, selectedYearMonth]);

  // 現在の確定総資産から月次収支を逆算して推移を算出（過去の「調整」によるズレを防止）
  const assetTrend = useMemo(() => {
    const months: string[] = [];
    let cur = selectedYearMonth;
    for (let i = 0; i < trendRange; i++) {
      months.unshift(cur);
      cur = getPreviousYearMonth(cur);
    }

    const points: Array<{
      month: string;
      label: string;
      totalAssets: number;
      netAssets: number;
    }> = new Array(months.length);

    let runningTotal = totalAssets;
    for (let i = months.length - 1; i >= 0; i--) {
      const ym = months[i];
      const liability = i === months.length - 1 ? unpaidLiabilities : 0;
      points[i] = {
        month: ym,
        label: `${parseInt(ym.slice(5), 10)}月`,
        totalAssets: runningTotal,
        netAssets: runningTotal - liability,
      };
      const flow = calculateMonthlyCashFlow(transactions, ym, categoryNameMap);
      runningTotal -= flow.netSavings;
    }
    return points;
  }, [selectedYearMonth, trendRange, totalAssets, unpaidLiabilities, transactions, categoryNameMap]);

  return (
    <div className="space-y-4 animate-fadeIn">
      <SubPageHeader
        title="口座・資産分析"
        subtitle="残高・資産構成・口座ごとの入出金"
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

      {/* Purple Gradient Asset Card */}
      <div
        className="rounded-3xl p-5 text-white shadow-lg"
        style={{
          background: `linear-gradient(135deg, ${customColors.assets} 0%, #9333EA 100%)`,
        }}
      >
        <p className="text-xs font-bold text-white/80">総資産（カード口座を含む）</p>
        <p className="text-3xl font-extrabold tabular-nums mt-0.5 mb-3">
          ¥{totalAssets.toLocaleString()}
        </p>
        <div className="flex items-center justify-between text-xs border-t border-white/15 pt-2.5">
          <span className="text-white/80">
            未払い負債 -¥{unpaidLiabilities.toLocaleString()}
          </span>
          <span className="font-extrabold">純資産 ¥{netAssets.toLocaleString()}</span>
        </div>
      </div>

      {/* 口座別残高 */}
      <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
        <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">口座別残高</h2>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {assetAccounts.map((acc) => {
            const Icon = getAccIcon(acc.type, acc.name);
            const bal = accountBalances[acc.id] ?? 0;
            return (
              <div key={acc.id} className="flex items-center justify-between py-2.5 text-xs">
                <span className="inline-flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
                  <Icon className="w-4 h-4 text-slate-400" />
                  {acc.name}
                </span>
                <span className="font-extrabold text-slate-900 dark:text-slate-50 tabular-nums">
                  ¥{bal.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 資産構成 */}
      <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
        <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">資産構成</h2>
        {pieData.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">資産データがありません</p>
        ) : (
          <>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={78}
                    paddingAngle={2}
                  >
                    {pieData.map((d) => (
                      <Cell key={d.id} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `¥${v.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              {pieData.map((d) => (
                <div key={d.id} className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 truncate">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="truncate">{d.name}</span>
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                    {d.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 口座別入出金 */}
      <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
        <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
          {year}年{month}月の口座別入出金
        </h2>
        <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {accountFlowList.map(({ acc, inAmt, outAmt }) => (
            <div key={acc.id} className="flex items-center justify-between py-2.5">
              <span className="font-bold text-slate-700 dark:text-slate-200">{acc.name}</span>
              <div className="flex items-center gap-3 tabular-nums font-bold">
                <span className="text-emerald-600">+{inAmt.toLocaleString()}</span>
                <span className="text-rose-500">-{outAmt.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 総資産の推移 */}
      <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
              総資産の推移
            </h2>
            <p className="text-[10px] text-slate-400">
              現在の確定残高から月次収支で逆算（調整によるズレを補正）
            </p>
          </div>
          <div className="inline-flex p-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
            {([3, 6, 9] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setTrendRange(n)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition ${
                  trendRange === n
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                {n}ヶ月
              </button>
            ))}
          </div>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={assetTrend} margin={{ top: 5, right: 5, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => `¥${v.toLocaleString()}`} />
              <Bar dataKey="totalAssets" name="総資産" fill={customColors.assets} radius={[4, 4, 0, 0]} />
              <Line
                type="monotone"
                dataKey="netAssets"
                name="純資産"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
