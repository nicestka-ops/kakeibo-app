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
  ArrowUpDown,
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

type HeroCardId = 'summary' | 'battle';

export const HomePage: React.FC = () => {
  const {
    monthlyCashFlow,
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

  // 2カード（「今月の収支」「先月対決」）を8〜9割重ねて上下入れ替え
  const [activeHero, setActiveHero] = useState<HeroCardId>('summary');

  const [battleMetric, setBattleMetric] = useState<'expense' | 'net'>('expense');
  const [summaryTab, setSummaryTab] = useState<'actual' | 'forecast'>('actual');
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);
  const [isForecastExpanded, setIsForecastExpanded] = useState(false);
  const [isCardPaymentExpanded, setIsCardPaymentExpanded] = useState(false);

  const handleSwapHeroCards = () => {
    setActiveHero((prev) => (prev === 'summary' ? 'battle' : 'summary'));
  };

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

  const assetAccounts = useMemo(
    () =>
      accounts
        .filter((a) => a.isActive && a.type !== 'credit_card')
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [accounts]
  );

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
    const linkedCard = activeCards.find((c) => c.paymentAccountId === primaryBankId);
    const closingLabel =
      (linkedCard?.closingDay ?? 31) >= 29 ? '月末締め' : `${linkedCard?.closingDay}日締め`;
    const paymentDayLabel = `翌月${linkedCard?.paymentDay ?? 26}日引き落とし`;

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

  const recentTransactions = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
        .slice(0, 6),
    [transactions]
  );

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
  const battleIsWinning = battleMetric === 'expense' ? battleDiff <= 0 : battleDiff >= 0;

  const isSummaryFront = activeHero === 'summary';

  return (
    <div className="space-y-4">
      {/* 2枚を8〜9割重ねたスタックカード（「今月の収支」＆「先月対決」タップで上下入替） */}
      <div className="pt-10 grid grid-cols-1 items-start">
        {/* カード1: 今月の収支 */}
        <div
          onClick={handleSwapHeroCards}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handleSwapHeroCards();
          }}
          style={{
            gridArea: '1 / 1',
            background: `linear-gradient(135deg, ${customColors.summary} 0%, #2563EB 100%)`,
          }}
          className={`rounded-3xl p-4 sm:p-5 text-white cursor-pointer select-none relative overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isSummaryFront
              ? 'z-20 translate-y-0 scale-100 shadow-xl opacity-100'
              : 'z-10 -translate-y-10 scale-[0.95] shadow-md opacity-95 hover:-translate-y-11'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white/85">
                {summaryTab === 'actual' ? '今月の収支' : '今月の予測収支'}
              </span>
              <ArrowUpDown className="w-3 h-3 text-white/60" />
            </div>
            <div
              className="inline-flex p-0.5 rounded-full bg-white/20 backdrop-blur-sm"
              onClick={(e) => e.stopPropagation()}
            >
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

          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums mb-3">
            {(summaryTab === 'actual' ? monthlyCashFlow.netSavings : forecastNetWithPlanned) < 0
              ? `-¥${Math.abs(
                  summaryTab === 'actual' ? monthlyCashFlow.netSavings : forecastNetWithPlanned
                ).toLocaleString()}`
              : `¥${(
                  summaryTab === 'actual' ? monthlyCashFlow.netSavings : forecastNetWithPlanned
                ).toLocaleString()}`}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-white/15 backdrop-blur-sm px-3 py-2">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-white/85">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
                <span>収入</span>
              </div>
              <p className="text-sm sm:text-base font-extrabold tabular-nums mt-0.5">
                ¥{monthlyCashFlow.income.toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl bg-white/15 backdrop-blur-sm px-3 py-2">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-white/85">
                <TrendingDown className="w-3.5 h-3.5 text-pink-300" />
                <span>{summaryTab === 'actual' ? '支出' : '支出 (予測)'}</span>
              </div>
              <p className="text-sm sm:text-base font-extrabold tabular-nums mt-0.5">
                ¥
                {(summaryTab === 'actual'
                  ? monthlyCashFlow.expense
                  : forecastExpenseWithPlanned
                ).toLocaleString()}
              </p>
            </div>
          </div>

          {summaryTab === 'forecast' ? (
            <div className="mt-3 pt-2.5 border-t border-white/15 text-[11px] text-white/90 space-y-1">
              <p className="font-semibold">
                実績支出 ¥{monthlyCashFlow.expense.toLocaleString()} ＋ 未完了の予定{' '}
                {plannedSummary.items.length}件 ¥{plannedSummary.total.toLocaleString()}
              </p>
              {plannedSummary.items.slice(0, 2).map((item) => (
                <p key={item.id} className="text-white/80 truncate">
                  ・{item.dueDate.slice(5).replace('-', '/')} {item.description} ¥
                  {item.amount.toLocaleString()}
                </p>
              ))}
            </div>
          ) : (
            <p className="mt-2.5 text-[10px] text-white/75 text-center">
              確定した取引のみで集計（調整・両替・経費・貯金は除外）・タップで切替
            </p>
          )}
        </div>

        {/* カード2: 先月対決 */}
        <div
          onClick={handleSwapHeroCards}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handleSwapHeroCards();
          }}
          style={{ gridArea: '1 / 1' }}
          className={`rounded-3xl p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 cursor-pointer select-none space-y-3 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            !isSummaryFront
              ? 'z-20 translate-y-0 scale-100 shadow-xl opacity-100'
              : 'z-10 -translate-y-10 scale-[0.95] shadow-md opacity-95 hover:-translate-y-11'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                先月対決 🥊
              </span>
              <ArrowUpDown className="w-3 h-3 text-slate-400" />
            </div>
            <div
              className="inline-flex p-0.5 rounded-full bg-slate-100 dark:bg-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setBattleMetric('expense')}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition ${
                  battleMetric === 'expense'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                支出
              </button>
              <button
                type="button"
                onClick={() => setBattleMetric('net')}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition ${
                  battleMetric === 'net'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                収支
              </button>
            </div>
          </div>

          <div
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${
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

          <div className="space-y-2.5">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-bold text-slate-600 dark:text-slate-300">
                  今月（1日〜今日）
                </span>
                <span className="font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                  {battleCurrentVal.toLocaleString()} 円
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
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
              <div className="flex justify-between text-xs mb-1">
                <span className="font-bold text-slate-400">先月（同日まで）</span>
                <span className="font-bold text-slate-500 tabular-nums">
                  {battlePrevVal.toLocaleString()} 円
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
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
            支出は「少ないほど勝ち」、収支は「多いほど勝ち」・タップで切替
          </p>
        </div>
      </div>

      {/* コンパクトサマリー：月末支出予測（タップで詳細展開） */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setIsForecastExpanded((prev) => !prev)}
          className="w-full p-4 flex items-center justify-between gap-2 text-left hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0"
              style={{ backgroundColor: customColors.expense }}
            >
              <TrendingDown className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">月末支出予測</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-lg font-extrabold text-slate-900 dark:text-slate-50 tabular-nums">
                  ¥{forecast.estimatedExpense.toLocaleString()}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-50 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400">
                  {forecast.isFinalized ? '確定' : '推定'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {budgetDiff !== null && (
              <span
                className={`text-xs font-extrabold tabular-nums ${
                  budgetDiff < 0 ? 'text-rose-500' : 'text-emerald-600'
                }`}
              >
                {budgetDiff < 0
                  ? `超過 ${Math.abs(budgetDiff).toLocaleString()}円`
                  : `残 ${budgetDiff.toLocaleString()}円`}
              </span>
            )}
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                isForecastExpanded ? 'rotate-180 text-primary-600' : ''
              }`}
            />
          </div>
        </button>

        {isForecastExpanded && (
          <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5 animate-fadeIn">
            <p className="text-[11px] text-slate-400">
              実績 ¥{forecast.actualExpense.toLocaleString()} ÷ {forecast.elapsedDays}日 ×{' '}
              {forecast.daysInMonth}日（1日平均 ¥{forecast.dailyAvg.toLocaleString()}）
            </p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">予定込み支出（実績＋未完了予定）</span>
              <span className="font-extrabold text-amber-600 tabular-nums">
                ¥{forecastExpenseWithPlanned.toLocaleString()}
              </span>
            </div>
            <Link
              to="/forecast"
              className="inline-flex items-center gap-1 text-xs font-bold text-pink-500 hover:text-pink-600"
            >
              <span>詳しい支出予測を見る</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* コンパクトサマリー：今月支払い予定額（タップで詳細展開） */}
      {primaryCardBankInfo && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setIsCardPaymentExpanded((prev) => !prev)}
              className="flex-1 flex items-center justify-between gap-2 text-left"
            >
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  今月支払い予定額（カード）
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs tabular-nums">
                  <span className="font-extrabold text-amber-600">
                    ● 確定 ¥{primaryCardBankInfo.confirmed.toLocaleString()}
                  </span>
                  <span className="font-bold text-amber-500">
                    ● 速報 ¥{primaryCardBankInfo.preliminary.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <p className="text-[10px] text-slate-400">支払後残高</p>
                  <p className="text-sm font-extrabold text-emerald-600 tabular-nums">
                    ¥{primaryCardBankInfo.afterConfirmed.toLocaleString()}
                  </p>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    isCardPaymentExpanded ? 'rotate-180 text-primary-600' : ''
                  }`}
                />
              </div>
            </button>

            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('kakeibo:open-planned-modal'))}
              className="w-7 h-7 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center shrink-0"
              aria-label="支出予定を追加"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {isCardPaymentExpanded && (
            <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs animate-fadeIn">
              <div className="flex justify-between text-slate-500">
                <span>引落スケジュール</span>
                <span>{primaryCardBankInfo.scheduleLabel}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>{primaryCardBankInfo.bankAcc.name} 現在残高</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                  ¥{primaryCardBankInfo.bankBal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>来月支払い後見込み（確定＋速報控除）</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                  ¥{primaryCardBankInfo.afterNextMonth.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 口座残高（2列＋タップでアコーディオン詳細） */}
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
          </div>
        </div>

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
                className={`rounded-2xl p-3 bg-white dark:bg-slate-900 border text-left transition active:scale-[0.98] ${
                  isExpanded
                    ? 'border-primary-500 ring-2 ring-primary-500/20 shadow-md'
                    : 'border-slate-100 dark:border-slate-800 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
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
                <p
                  className="text-base font-extrabold tabular-nums"
                  style={{ color: customColors.assets }}
                >
                  ¥{available.toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-400 tabular-nums mt-0.5">
                  現在 {currentBal.toLocaleString()}
                  {deduction > 0 ? ` / 控除 -${deduction.toLocaleString()}` : ''}
                </p>
              </button>
            );
          })}
        </div>

        {expandedAccountId && accountMap.get(expandedAccountId) && (() => {
          const acc = accountMap.get(expandedAccountId)!;
          const detail = accountDeductionMap.get(expandedAccountId);
          const currentBal = accountBalances[expandedAccountId] ?? 0;
          if (!detail) return null;

          return (
            <div className="rounded-3xl p-4 bg-white dark:bg-slate-900 border border-primary-200 dark:border-primary-800/60 shadow-md animate-fadeIn space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
                  {acc.name} の詳細
                </h3>
                <button
                  type="button"
                  onClick={() => setExpandedAccountId(null)}
                  className="p-1 text-slate-400"
                >
                  <ChevronDown className="w-4 h-4 rotate-180" />
                </button>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">現在残高</span>
                  <span className="font-bold tabular-nums">¥{currentBal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">支払い予定控除</span>
                  <span className="font-bold text-amber-600 tabular-nums">
                    -¥{detail.totalDeduction.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="font-bold">利用可能残高</span>
                  <span
                    className="font-extrabold tabular-nums"
                    style={{ color: customColors.assets }}
                  >
                    ¥{detail.availableBalance.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* イベント貯金 */}
      {enrichedSavingsGoals.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
              イベント貯金
            </h2>
            <Link
              to="/goals"
              className="inline-flex items-center gap-0.5 text-xs font-bold text-primary-600"
            >
              <span>すべて見る</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {enrichedSavingsGoals.slice(0, 1).map((goal) => (
            <Link
              key={goal.id}
              to="/goals"
              className="block rounded-3xl p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-pink-50 dark:bg-pink-950/50 text-pink-500 flex items-center justify-center">
                    <PiggyBank className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {goal.title}
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-500">達成率 {goal.pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                  style={{ width: `${goal.pct}%` }}
                />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 最近の取引 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
            最近の取引
          </h2>
          <Link to="/transactions" className="text-xs font-bold text-primary-600">
            すべて見る
          </Link>
        </div>

        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
          {recentTransactions.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">まだ取引がありません</p>
          ) : (
            recentTransactions.map((tx) => {
              const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : undefined;
              const acc = accountMap.get(tx.accountId);
              const isPositive = tx.type === 'income' || tx.type === 'transfer_in';
              return (
                <div key={tx.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat?.color || '#94a3b8' }}
                    />
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
                      isPositive ? 'text-emerald-600' : 'text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    {isPositive ? '+' : '-'}
                    {Math.round(Math.abs(tx.amount)).toLocaleString()} 円
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
