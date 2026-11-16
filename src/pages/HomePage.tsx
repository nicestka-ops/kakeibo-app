import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  calculateEndOfMonthForecast,
  calculateLastMonthComparison,
  calculateLinkedCardBillingForBank,
  getMonthlyPlannedExpenses,
} from '@/services/calculation/forecast';
import { getTodayDateString } from '@/services/calculation/cardBilling';
import {
  Settings,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ChevronDown,
  Plus,
  Landmark,
  Banknote,
  Smartphone,
  Ticket,
  ShoppingBag,
  Wallet,
  PiggyBank,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

function getAccountIcon(type: string, name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('amazon')) return ShoppingBag;
  if (lower.includes('商品券') || type === 'gift_card') return Ticket;
  if (lower.includes('アプリ') || type === 'wallet') return Smartphone;
  if (type === 'cash' || name.includes('現金')) return Banknote;
  if (type === 'bank' || name.includes('銀行')) return Landmark;
  return Wallet;
}

export const HomePage: React.FC = () => {
  const {
    monthlyCashFlow,
    financialSummary,
    budget,
    transactions,
    plannedExpenses,
    savingsGoals,
    categories,
    accounts,
    accountBalances,
    selectedYearMonth,
  } = useApp();
  const { customColors } = useTheme();

  const [isBattleMode, setIsBattleMode] = useState(false);
  const [battleMetric, setBattleMetric] = useState<'expense' | 'net'>('expense');
  const [summaryTab, setSummaryTab] = useState<'actual' | 'forecast'>('actual');
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const categoryNameMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const todayStr = getTodayDateString();
  const plannedSummary = useMemo(
    () => getMonthlyPlannedExpenses(plannedExpenses, selectedYearMonth),
    [plannedExpenses, selectedYearMonth]
  );

  const forecast = useMemo(
    () => calculateEndOfMonthForecast(transactions, selectedYearMonth, categoryNameMap),
    [transactions, selectedYearMonth, categoryNameMap]
  );

  const comparison = useMemo(
    () => calculateLastMonthComparison(transactions, selectedYearMonth, categoryNameMap),
    [transactions, selectedYearMonth, categoryNameMap]
  );

  const forecastExpenseWithPlanned = monthlyCashFlow.expense + plannedSummary.total;
  const forecastNetWithPlanned = monthlyCashFlow.income - forecastExpenseWithPlanned;

  // 非クレジットカード口座一覧（ソート順）
  const assetAccounts = useMemo(
    () =>
      accounts
        .filter((a) => a.isActive && a.type !== 'credit_card')
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [accounts]
  );

  // 各口座の支払い予定控除額と内訳を計算
  const accountDeductionMap = useMemo(() => {
    const map = new Map<
      string,
      {
        plannedTotal: number;
        cardConfirmed: number;
        cardPreliminary: number;
        totalDeduction: number;
        availableBalance: number;
        plannedItems: typeof plannedSummary.items;
        cardBilling: ReturnType<typeof calculateLinkedCardBillingForBank>;
      }
    >();

    for (const acc of assetAccounts) {
      const currentBal = accountBalances[acc.id] ?? 0;
      const accPlanned = plannedExpenses.filter(
        (p) => !p.isCompleted && p.kind !== 'income' && p.accountId === acc.id
      );
      const plannedTotal = accPlanned.reduce((s, p) => s + Math.round(Math.abs(p.amount)), 0);
      const cardBilling = calculateLinkedCardBillingForBank(
        acc.id,
        accounts,
        transactions,
        categoryNameMap,
        todayStr
      );
      const totalDeduction =
        plannedTotal + cardBilling.confirmedAmount + cardBilling.preliminaryAmount;
      map.set(acc.id, {
        plannedTotal,
        cardConfirmed: cardBilling.confirmedAmount,
        cardPreliminary: cardBilling.preliminaryAmount,
        totalDeduction,
        availableBalance: currentBal - totalDeduction,
        plannedItems: accPlanned,
        cardBilling,
      });
    }
    return map;
  }, [assetAccounts, accountBalances, plannedExpenses, accounts, transactions, categoryNameMap, todayStr]);

  const totalAssets = useMemo(
    () => assetAccounts.reduce((sum, acc) => sum + (accountBalances[acc.id] ?? 0), 0),
    [assetAccounts, accountBalances]
  );

  const totalPlannedDeduction = useMemo(
    () =>
      assetAccounts.reduce(
        (sum, acc) => sum + (accountDeductionMap.get(acc.id)?.totalDeduction ?? 0),
        0
      ),
    [assetAccounts, accountDeductionMap]
  );

  const totalAvailable = totalAssets - totalPlannedDeduction;

  // カード引き落とし口座サマリー（主引き落とし銀行）
  const primaryCardBankInfo = useMemo(() => {
    const activeCards = accounts.filter((a) => a.isActive && a.type === 'credit_card');
    const primaryBankId =
      activeCards.find((c) => c.paymentAccountId)?.paymentAccountId ||
      assetAccounts.find((a) => a.type === 'bank')?.id;
    if (!primaryBankId) return null;
    const bankAcc = accountMap.get(primaryBankId);
    if (!bankAcc) return null;
    const detail = accountDeductionMap.get(primaryBankId);
    if (!detail) return null;
    const bankBal = accountBalances[primaryBankId] ?? 0;
    const afterConfirmed = bankBal - detail.cardConfirmed;
    const afterNextMonth = afterConfirmed - detail.cardPreliminary;
    const firstCard = detail.cardBilling.linkedCards[0];
    const closingLabel =
      (firstCard?.closingDay ?? 31) >= 29 ? '月末締め' : `${firstCard?.closingDay}日締め`;
    const paymentDayLabel = `翌月${firstCard?.paymentDay ?? 26}日引き落とし`;

    return {
      bankAcc,
      bankBal,
      confirmed: detail.cardConfirmed,
      preliminary: detail.cardPreliminary,
      afterConfirmed,
      afterNextMonth,
      scheduleLabel: `${closingLabel} / ${paymentDayLabel}`,
    };
  }, [accounts, assetAccounts, accountMap, accountDeductionMap, accountBalances]);

  // 最近の取引（上位8件）
  const recentTransactions = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
        .slice(0, 8),
    [transactions]
  );

  // イベント貯金の合計計算（既存の「積立 →」履歴も反映）
  const enrichedSavingsGoals = useMemo(() => {
    return savingsGoals.map((goal) => {
      const pct =
        goal.targetAmount > 0
          ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
          : 0;
      const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
      return { ...goal, pct, remaining };
    });
  }, [savingsGoals]);

  const budgetTarget = budget.totalAmount || 0;
  const budgetDiff = budgetTarget > 0 ? budgetTarget - forecast.estimatedExpense : null;

  const battleCurrentVal =
    battleMetric === 'expense' ? comparison.currentExpense : comparison.currentNet;
  const battlePrevVal =
    battleMetric === 'expense' ? comparison.prevExpense : comparison.prevNet;
  const battleMax = Math.max(Math.abs(battleCurrentVal), Math.abs(battlePrevVal), 1);

  const battleDiff = battleCurrentVal - battlePrevVal;
  const battleIsWinning =
    battleMetric === 'expense' ? battleDiff <= 0 : battleDiff >= 0;

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">家計簿</p>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
            今月のサマリー
          </h1>
        </div>
        <Link
          to="/settings"
          className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition"
          aria-label="設定"
        >
          <Settings className="w-5 h-5" />
        </Link>
      </div>

      {/* Top Controls: 先月対決チップ & 支出/収支ピル */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setIsBattleMode((prev) => !prev)}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition active:scale-95 ${
            isBattleMode
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-800 shadow-sm'
          }`}
        >
          <span>先月対決</span>
          <span>🥊</span>
        </button>

        {isBattleMode && (
          <div className="inline-flex p-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setBattleMetric('expense')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                battleMetric === 'expense'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              支出
            </button>
            <button
              type="button"
              onClick={() => setBattleMetric('net')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                battleMetric === 'net'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              収支
            </button>
          </div>
        )}
      </div>

      {/* Card 1: 今月の収支 or 先月対決 */}
      {!isBattleMode ? (
        <div
          key="summary-card"
          className="rounded-3xl p-5 text-white shadow-lg animate-cardSwitch relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${customColors.summary} 0%, #2563EB 100%)`,
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-white/85">
              {summaryTab === 'actual' ? '今月の収支' : '今月の予測収支'}
            </span>
            <div className="inline-flex p-0.5 rounded-full bg-white/20 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setSummaryTab('actual')}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition ${
                  summaryTab === 'actual'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-white/85 hover:text-white'
                }`}
              >
                実績
              </button>
              <button
                type="button"
                onClick={() => setSummaryTab('forecast')}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition ${
                  summaryTab === 'forecast'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-white/85 hover:text-white'
                }`}
              >
                予測
              </button>
            </div>
          </div>

          <div className="text-4xl font-extrabold tracking-tight tabular-nums mb-4">
            {(summaryTab === 'actual' ? monthlyCashFlow.netSavings : forecastNetWithPlanned) < 0
              ? `-¥${Math.abs(
                  summaryTab === 'actual' ? monthlyCashFlow.netSavings : forecastNetWithPlanned
                ).toLocaleString()}`
              : `¥${(
                  summaryTab === 'actual' ? monthlyCashFlow.netSavings : forecastNetWithPlanned
                ).toLocaleString()}`}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-white/15 backdrop-blur-sm px-3.5 py-2.5">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-white/85">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
                <span>収入</span>
              </div>
              <p className="text-base font-extrabold tabular-nums mt-0.5">
                ¥{monthlyCashFlow.income.toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl bg-white/15 backdrop-blur-sm px-3.5 py-2.5">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-white/85">
                <TrendingDown className="w-3.5 h-3.5 text-pink-300" />
                <span>{summaryTab === 'actual' ? '支出' : '支出 (予測)'}</span>
              </div>
              <p className="text-base font-extrabold tabular-nums mt-0.5">
                ¥
                {(summaryTab === 'actual'
                  ? monthlyCashFlow.expense
                  : forecastExpenseWithPlanned
                ).toLocaleString()}
              </p>
            </div>
          </div>

          {summaryTab === 'forecast' && (
            <div className="mt-3 pt-3 border-t border-white/15 text-[11px] text-white/90 space-y-1">
              <p className="font-semibold">
                実績支出 ¥{monthlyCashFlow.expense.toLocaleString()} ＋ 未完了の予定{' '}
                {plannedSummary.items.length}件 ¥{plannedSummary.total.toLocaleString()}
              </p>
              {plannedSummary.items.slice(0, 3).map((item) => (
                <p key={item.id} className="text-white/80 truncate">
                  ・{item.dueDate.slice(5).replace('-', '/')} {item.description} ¥
                  {item.amount.toLocaleString()}
                </p>
              ))}
            </div>
          )}

          {summaryTab === 'actual' && (
            <p className="mt-3 text-[10px] text-white/75 text-center">
              確定した取引のみで集計（調整・両替・経費・貯金は除外）
            </p>
          )}
        </div>
      ) : (
        <div
          key="battle-card"
          className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm animate-cardSwitch space-y-4"
        >
          <div
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${
              battleIsWinning
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
            }`}
          >
            {battleIsWinning ? (
              <Sparkles className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>
              {battleMetric === 'expense'
                ? battleDiff > 0
                  ? `先月より ${Math.abs(battleDiff).toLocaleString()} 円ペース早め`
                  : `先月より ${Math.abs(battleDiff).toLocaleString()} 円ペース抑えめ`
                : battleDiff < 0
                ? `先月より ${Math.abs(battleDiff).toLocaleString()} 円黒字が減少`
                : `先月より ${Math.abs(battleDiff).toLocaleString()} 円黒字が増加`}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-slate-600 dark:text-slate-300">
                  今月（1日〜今日）
                </span>
                <span className="font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                  {battleCurrentVal < 0
                    ? `-${Math.abs(battleCurrentVal).toLocaleString()} 円`
                    : `${battleCurrentVal.toLocaleString()} 円`}
                </span>
              </div>
              <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.round((Math.abs(battleCurrentVal) / battleMax) * 100))}%`,
                    backgroundColor:
                      battleMetric === 'expense' ? customColors.expense : customColors.summary,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-slate-500 dark:text-slate-400">
                  先月（同日まで）
                </span>
                <span className="font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                  {battlePrevVal < 0
                    ? `-${Math.abs(battlePrevVal).toLocaleString()} 円`
                    : `${battlePrevVal.toLocaleString()} 円`}
                </span>
              </div>
              <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-slate-300 dark:bg-slate-600 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.round((Math.abs(battlePrevVal) / battleMax) * 100))}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 text-center">
            支出は「少ないほど勝ち」、収支は「多いほど勝ち」で判定しています
          </p>
        </div>
      )}

      {/* Card 2: 月末支出予測 */}
      <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center text-white"
              style={{ backgroundColor: customColors.expense }}
            >
              <TrendingDown className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
              月末支出予測
            </h2>
          </div>
          <Link
            to="/forecast"
            className="inline-flex items-center gap-0.5 text-xs font-bold text-pink-500 hover:text-pink-600 transition"
          >
            <span>詳細</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-50 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400">
              {forecast.isFinalized ? '実績確定' : '推定'}
            </span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 tabular-nums">
              ¥{forecast.estimatedExpense.toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            実績 ¥{forecast.actualExpense.toLocaleString()} ÷ {forecast.elapsedDays}日 ×{' '}
            {forecast.daysInMonth}日 で推定（1日平均 ¥{forecast.dailyAvg.toLocaleString()}）
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-[11px] text-slate-400">実績支出</p>
            <p className="text-sm font-extrabold text-pink-600 dark:text-pink-400 tabular-nums mt-0.5">
              ¥{forecast.actualExpense.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400">
              {budgetDiff !== null
                ? budgetDiff < 0
                  ? '予算超過（推定）'
                  : '予算残（推定）'
                : '月間予算'}
            </p>
            <p
              className={`text-sm font-extrabold tabular-nums mt-0.5 ${
                budgetDiff === null
                  ? 'text-slate-400'
                  : budgetDiff < 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {budgetDiff !== null
                ? `${budgetDiff < 0 ? '-' : '+'}${Math.abs(budgetDiff).toLocaleString()} 円`
                : '未設定'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            予定込み支出（実績＋未完了の予定）
          </span>
          <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
            ¥{forecastExpenseWithPlanned.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Section 3: 口座残高 */}
      <div className="space-y-2.5">
        <div className="flex items-end justify-between px-0.5">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">口座残高</h2>
          <div className="text-right">
            <p className="text-[10px] text-slate-400 tabular-nums">
              総資産 {totalAssets.toLocaleString()}
            </p>
            <p
              className="text-lg font-extrabold tabular-nums leading-tight"
              style={{ color: customColors.assets }}
            >
              利用可能 ¥{totalAvailable.toLocaleString()}
            </p>
            {totalPlannedDeduction > 0 && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 tabular-nums">
                支払い予定 -{totalPlannedDeduction.toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {assetAccounts.length === 0 ? (
          <div className="rounded-2xl p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center text-xs text-slate-400">
            口座が登録されていません。設定の「口座・資産管理」から追加できます。
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {assetAccounts.map((acc) => {
              const Icon = getAccountIcon(acc.type, acc.name);
              const currentBal = accountBalances[acc.id] ?? 0;
              const detail = accountDeductionMap.get(acc.id);
              const isExpanded = expandedAccountId === acc.id;
              const deduction = detail?.totalDeduction ?? 0;
              const available = detail?.availableBalance ?? currentBal;

              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setExpandedAccountId(isExpanded ? null : acc.id)}
                  className={`rounded-2xl p-3.5 bg-white dark:bg-slate-900 border text-left transition active:scale-[0.98] ${
                    isExpanded
                      ? 'border-primary-500 ring-2 ring-primary-500/20 shadow-md'
                      : 'border-slate-100 dark:border-slate-800 shadow-sm hover:border-slate-200 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                        {acc.name}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
                        isExpanded ? 'rotate-180 text-primary-600' : ''
                      }`}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 tabular-nums">
                    現在 {currentBal.toLocaleString()} 円
                  </p>
                  <p
                    className="text-base font-extrabold tabular-nums mt-0.5"
                    style={{ color: customColors.assets }}
                  >
                    ¥{available.toLocaleString()}
                  </p>
                  <p
                    className={`text-[10px] tabular-nums mt-0.5 ${
                      deduction > 0
                        ? 'text-amber-600 dark:text-amber-400 font-semibold'
                        : 'text-slate-400'
                    }`}
                  >
                    {deduction > 0 ? `予定控除 -${deduction.toLocaleString()}` : '控除予定なし'}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* 口座アコーディオン詳細パネル */}
        {expandedAccountId && accountMap.get(expandedAccountId) && (() => {
          const acc = accountMap.get(expandedAccountId)!;
          const detail = accountDeductionMap.get(expandedAccountId);
          const currentBal = accountBalances[expandedAccountId] ?? 0;
          if (!detail) return null;

          return (
            <div className="rounded-3xl p-4 bg-white dark:bg-slate-900 border border-primary-200 dark:border-primary-800/60 shadow-md animate-fadeIn space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
                  {acc.name}
                </h3>
                <button
                  type="button"
                  onClick={() => setExpandedAccountId(null)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                  aria-label="閉じる"
                >
                  <ChevronDown className="w-4 h-4 rotate-180" />
                </button>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">現在残高</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                    ¥{currentBal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">支払い予定控除額</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                    -¥{detail.totalDeduction.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    控除後の利用可能残高
                  </span>
                  <span
                    className="text-base font-extrabold tabular-nums"
                    style={{ color: customColors.assets }}
                  >
                    ¥{detail.availableBalance.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <p className="text-[11px] font-bold text-slate-400">支払い予定の内訳</p>
                {detail.plannedItems.length === 0 &&
                detail.cardConfirmed === 0 &&
                detail.cardPreliminary === 0 ? (
                  <p className="text-xs text-slate-400 py-1">未払いの支払い予定はありません</p>
                ) : (
                  <div className="space-y-2">
                    {detail.plannedItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">
                            {item.dueDate.slice(5).replace('-', '/')} {item.description}
                          </p>
                          <p className="text-[10px] text-slate-400">支出予定・未払い</p>
                        </div>
                        <span className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                          {item.amount.toLocaleString()} 円
                        </span>
                      </div>
                    ))}
                    {detail.cardConfirmed > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">
                            カード引き落とし（確定）
                          </p>
                          <p className="text-[10px] text-amber-600">カード引き落とし・確定</p>
                        </div>
                        <span className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                          {detail.cardConfirmed.toLocaleString()} 円
                        </span>
                      </div>
                    )}
                    {detail.cardPreliminary > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">
                            カード利用分（来月引き落とし・速報）
                          </p>
                          <p className="text-[10px] text-amber-500">カード利用・未確定引き落とし</p>
                        </div>
                        <span className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                          {detail.cardPreliminary.toLocaleString()} 円
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Section 4: 今月支払い予定額 */}
      {primaryCardBankInfo && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
              今月支払い予定額
            </h2>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('kakeibo:open-planned-modal'))}
              className="w-7 h-7 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center hover:bg-amber-100 transition"
              aria-label="支出予定を追加"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="rounded-3xl p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                カード支払い
              </span>
              <span className="text-[10px] text-slate-400">
                {primaryCardBankInfo.scheduleLabel}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
                <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  ● 確定
                </p>
                <p className="text-lg font-extrabold text-amber-700 dark:text-amber-300 tabular-nums mt-0.5">
                  ¥{primaryCardBankInfo.confirmed.toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">先月利用分の確定額</p>
              </div>
              <div className="rounded-2xl p-3 bg-yellow-50/70 dark:bg-yellow-950/30 border border-yellow-100 dark:border-yellow-900/40">
                <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  ● 速報
                </p>
                <p className="text-lg font-extrabold text-amber-700 dark:text-amber-300 tabular-nums mt-0.5">
                  ¥{primaryCardBankInfo.preliminary.toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">今月利用分・変動あり</p>
              </div>
            </div>

            <div className="rounded-2xl p-3 bg-emerald-50/60 dark:bg-emerald-950/25 border border-emerald-100 dark:border-emerald-900/40">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                    支払い後残高
                  </p>
                  <p className="text-[10px] text-slate-400">{primaryCardBankInfo.bankAcc.name}</p>
                </div>
                <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  ¥{primaryCardBankInfo.afterConfirmed.toLocaleString()}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5">
                現在残高 - 確定額。速報は来月分のためここには含みません。
              </p>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>
                {primaryCardBankInfo.bankAcc.name}残高 ¥
                {primaryCardBankInfo.bankBal.toLocaleString()}
              </span>
              <span className="font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                来月支払い後 ¥{primaryCardBankInfo.afterNextMonth.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Section 5: イベント貯金 */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
            イベント貯金
          </h2>
          <Link
            to="/goals"
            className="inline-flex items-center gap-0.5 text-xs font-bold text-primary-600 dark:text-primary-400 hover:opacity-80 transition"
          >
            <span>すべて見る</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {enrichedSavingsGoals.length === 0 ? (
          <Link
            to="/goals"
            className="block rounded-3xl p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm text-center text-xs text-slate-400 hover:bg-slate-50 transition"
          >
            イベント貯金を追加して目標に向けて積立しよう
          </Link>
        ) : (
          <div className="space-y-2.5">
            {enrichedSavingsGoals.slice(0, 2).map((goal) => (
              <Link
                key={goal.id}
                to="/goals"
                className="block rounded-3xl p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-2.5 hover:border-slate-200 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-pink-50 dark:bg-pink-950/50 text-pink-500 flex items-center justify-center shrink-0">
                      <PiggyBank className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {goal.title}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {goal.deadlineDate ? `期限 ${goal.deadlineDate}・` : ''}現金（手元）
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    達成率 {goal.pct}%
                  </span>
                </div>

                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                    style={{ width: `${goal.pct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    目標 ¥{goal.targetAmount.toLocaleString()} まで あと{' '}
                    {goal.remaining.toLocaleString()} 円
                  </span>
                  <span className="font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                    積立済み ¥{goal.currentAmount.toLocaleString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Section 6: 最近の取引 */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
            最近の取引
          </h2>
          <Link
            to="/transactions"
            className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:opacity-80"
          >
            すべて見る
          </Link>
        </div>

        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
          {recentTransactions.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">まだ取引がありません</p>
          ) : (
            recentTransactions.map((tx) => {
              const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : undefined;
              const acc = accountMap.get(tx.accountId);
              const isPositive = tx.type === 'income' || tx.type === 'transfer_in';
              const signedAmount = isPositive
                ? `+${Math.round(Math.abs(tx.amount)).toLocaleString()} 円`
                : `-${Math.round(Math.abs(tx.amount)).toLocaleString()} 円`;

              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: `${cat?.color || '#94a3b8'}20`,
                        color: cat?.color || '#64748b',
                      }}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: cat?.color || '#94a3b8' }}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                        {tx.description}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {cat?.name || (tx.type === 'adjustment' ? '調整' : '未分類')}・
                        {acc?.name || '不明'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-extrabold tabular-nums shrink-0 ${
                      isPositive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    {signedAmount}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
