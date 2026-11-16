import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card } from '@/components/common/Card';
import { calculateMonthlyCashFlow } from '@/services/calculation/balanceEngine';
import { calculateCardBillingSummary, getTodayDateString } from '@/services/calculation/cardBilling';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Calendar,
  PiggyBank,
  Target,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Landmark,
  BarChart3,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';

type DashboardCardId = 'assets' | 'forecast' | 'comparison' | 'budget';

const DEFAULT_CARD_ORDER: DashboardCardId[] = ['assets', 'forecast', 'comparison', 'budget'];

const CARD_LABELS: Record<DashboardCardId, string> = {
  assets: '総資産・PayPay銀行残高',
  forecast: '支払い予測・月末着地予測',
  comparison: '先月比較',
  budget: '予算ステータス',
};

const ORDER_STORAGE_KEY = 'kakeibo_dashboard_card_order_v1';
const HIDDEN_STORAGE_KEY = 'kakeibo_dashboard_hidden_cards_v1';

function getPreviousYearMonth(yearMonth: string): string {
  const [yStr, mStr] = yearMonth.split('-');
  let y = parseInt(yStr, 10);
  let m = parseInt(mStr, 10) - 1;
  if (m < 1) {
    m = 12;
    y -= 1;
  }
  return `${y}-${String(m).padStart(2, '0')}`;
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

  const [cardOrder, setCardOrder] = useState<DashboardCardId[]>(() => {
    try {
      const saved = localStorage.getItem(ORDER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as DashboardCardId[];
        const valid = parsed.filter((id) => DEFAULT_CARD_ORDER.includes(id));
        const missing = DEFAULT_CARD_ORDER.filter((id) => !valid.includes(id));
        return [...valid, ...missing];
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_CARD_ORDER;
  });

  const [hiddenCards, setHiddenCards] = useState<DashboardCardId[]>(() => {
    try {
      const saved = localStorage.getItem(HIDDEN_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as DashboardCardId[];
        return parsed.filter((id) => DEFAULT_CARD_ORDER.includes(id));
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });

  // 完全平行FLIPアニメーション用のDOM参照と前回のY座標
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const prevTopsRef = useRef<Record<string, number>>({});

  const capturePositions = () => {
    const tops: Record<string, number> = {};
    for (const id of cardOrder) {
      const el = cardRefs.current[id];
      if (el) {
        tops[id] = el.getBoundingClientRect().top;
      }
    }
    prevTopsRef.current = tops;
  };

  useLayoutEffect(() => {
    const prevTops = prevTopsRef.current;
    if (Object.keys(prevTops).length === 0) return;

    const elementsToAnimate: Array<{ el: HTMLDivElement; deltaY: number }> = [];
    for (const id of cardOrder) {
      const el = cardRefs.current[id];
      if (!el || prevTops[id] === undefined) continue;
      const nextTop = el.getBoundingClientRect().top;
      const deltaY = prevTops[id] - nextTop;
      if (Math.abs(deltaY) > 0.5) {
        // 傾き・横ズレなしの完全平行移動（Y軸のみ）
        el.style.transition = 'none';
        el.style.transform = `translate3d(0, ${deltaY}px, 0)`;
        elementsToAnimate.push({ el, deltaY });
      }
    }

    if (elementsToAnimate.length > 0) {
      // 強制リフロー後に物理演算風イージングで平行移動
      document.body.getBoundingClientRect();
      requestAnimationFrame(() => {
        for (const { el } of elementsToAnimate) {
          el.style.transition = 'transform 460ms cubic-bezier(0.22, 1, 0.36, 1)';
          el.style.transform = 'translate3d(0, 0, 0)';
        }
      });
    }

    prevTopsRef.current = {};
  }, [cardOrder, hiddenCards]);

  const moveCard = (id: DashboardCardId, direction: -1 | 1) => {
    const visibleOrder = cardOrder.filter((c) => !hiddenCards.includes(c));
    const visIdx = visibleOrder.indexOf(id);
    const targetVisIdx = visIdx + direction;
    if (visIdx === -1 || targetVisIdx < 0 || targetVisIdx >= visibleOrder.length) return;

    const swapTargetId = visibleOrder[targetVisIdx];
    const idxA = cardOrder.indexOf(id);
    const idxB = cardOrder.indexOf(swapTargetId);

    capturePositions();
    const next = [...cardOrder];
    [next[idxA], next[idxB]] = [next[idxB], next[idxA]];
    setCardOrder(next);
    localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(next));
  };

  const toggleCardVisibility = (id: DashboardCardId) => {
    capturePositions();
    setHiddenCards((prev) => {
      const next = prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id];
      localStorage.setItem(HIDDEN_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const categoryNameMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const recentTransactions = transactions
    .filter((tx) => tx.date.startsWith(selectedYearMonth))
    .slice(0, 5);

  const budgetProgress =
    budget.totalAmount > 0
      ? Math.min(Math.round((monthlyCashFlow.expense / budget.totalAmount) * 100), 100)
      : 0;

  const remainingBudget = budget.totalAmount - monthlyCashFlow.expense;

  // 今月の予定（未完了の支出・収入）
  const currentMonthPlanned = plannedExpenses.filter((p) => p.dueDate.startsWith(selectedYearMonth));
  const pendingPlannedExpenses = currentMonthPlanned.filter((p) => !p.isCompleted && p.kind !== 'income');
  const pendingPlannedIncomes = currentMonthPlanned.filter((p) => !p.isCompleted && p.kind === 'income');
  const plannedTotal = pendingPlannedExpenses.reduce((sum, p) => sum + p.amount, 0);
  const plannedIncomeTotal = pendingPlannedIncomes.reduce((sum, p) => sum + p.amount, 0);

  // PayPay銀行とカード引き落とし予定の計算
  const paypayBank = accounts.find((a) => a.name.trim() === 'PayPay銀行');
  const paypayBalance = paypayBank ? (accountBalances[paypayBank.id] ?? 0) : 0;

  const todayStr = getTodayDateString();
  const cardAccounts = accounts.filter((a) => a.type === 'credit_card' && a.isActive);
  let totalUnpaidCardAmount = 0;
  let nextCardDebitAmount = 0;
  let nextCardDebitDate: string | null = null;

  for (const card of cardAccounts) {
    const summary = calculateCardBillingSummary(card, transactions, todayStr, categoryNameMap);
    totalUnpaidCardAmount += summary.unpaidTotal;
    if (summary.nextDebitDate) {
      if (!nextCardDebitDate || summary.nextDebitDate < nextCardDebitDate) {
        nextCardDebitDate = summary.nextDebitDate;
        nextCardDebitAmount = summary.nextDebitAmount;
      } else if (summary.nextDebitDate === nextCardDebitDate) {
        nextCardDebitAmount += summary.nextDebitAmount;
      }
    }
  }

  // 月末着地予測
  const projectedMonthExpense = monthlyCashFlow.expense + plannedTotal;
  const projectedBudgetRemaining = budget.totalAmount - projectedMonthExpense;
  const projectedPayPayBalance = paypayBalance + plannedIncomeTotal - plannedTotal - nextCardDebitAmount;
  const projectedNetAssets = financialSummary.netAssets + plannedIncomeTotal - plannedTotal;

  // 先月比較
  const prevYearMonth = getPreviousYearMonth(selectedYearMonth);
  const prevCashFlow = useMemo(
    () => calculateMonthlyCashFlow(transactions, prevYearMonth, categoryNameMap),
    [transactions, prevYearMonth, categoryNameMap]
  );
  const expenseDiff = monthlyCashFlow.expense - prevCashFlow.expense;
  const incomeDiff = monthlyCashFlow.income - prevCashFlow.income;
  const expenseDiffRate =
    prevCashFlow.expense > 0 ? Math.round((expenseDiff / prevCashFlow.expense) * 100) : null;

  const activeGoals = savingsGoals.filter((g) => g.targetAmount > 0);
  const visibleCards = cardOrder.filter((id) => !hiddenCards.includes(id));

  const renderCardActions = (id: DashboardCardId, linkTo?: string, linkLabel?: string) => {
    const visIdx = visibleCards.indexOf(id);
    return (
      <div className="flex items-center gap-1">
        {linkTo && linkLabel && (
          <Link
            to={linkTo}
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 mr-1.5"
          >
            {linkLabel}
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        )}
        <button
          type="button"
          onClick={() => moveCard(id, -1)}
          disabled={visIdx <= 0}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
          aria-label={`${CARD_LABELS[id]}を上に移動`}
          title="上に移動"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => moveCard(id, 1)}
          disabled={visIdx === visibleCards.length - 1}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
          aria-label={`${CARD_LABELS[id]}を下に移動`}
          title="下に移動"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => toggleCardVisibility(id)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label={`${CARD_LABELS[id]}を非表示`}
          title="非表示にする"
        >
          <EyeOff className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  const renderDashboardCard = (id: DashboardCardId) => {
    switch (id) {
      case 'assets':
        return (
          <Card
            title="総資産・PayPay銀行残高"
            action={renderCardActions('assets', '/accounts', '口座一覧')}
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-center py-1">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex flex-col items-center justify-center min-w-0">
                <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">総資産</span>
                <p className="text-sm sm:text-base md:text-lg font-bold text-slate-800 dark:text-slate-100 mt-1 whitespace-nowrap">
                  ¥{financialSummary.totalAssets.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-sky-50/80 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 rounded-xl flex flex-col items-center justify-center min-w-0">
                <span className="text-[11px] sm:text-xs text-sky-600 dark:text-sky-400 font-semibold flex items-center gap-1 whitespace-nowrap">
                  <Landmark className="w-3 h-3" />
                  PayPay銀行
                </span>
                <p className="text-sm sm:text-base md:text-lg font-extrabold text-sky-700 dark:text-sky-300 mt-1 whitespace-nowrap">
                  ¥{paypayBalance.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex flex-col items-center justify-center min-w-0">
                <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">負債（カード等）</span>
                <p className="text-sm sm:text-base md:text-lg font-bold text-rose-500 mt-1 whitespace-nowrap">
                  -¥{financialSummary.totalLiabilities.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-xl flex flex-col items-center justify-center min-w-0">
                <span className="text-[11px] sm:text-xs text-emerald-700 dark:text-emerald-400 font-bold whitespace-nowrap">純資産</span>
                <p className="text-sm sm:text-base md:text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 whitespace-nowrap">
                  ¥{financialSummary.netAssets.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
        );

      case 'forecast':
        return (
          <Card
            title="支払い予測・月末着地予測"
            action={renderCardActions('forecast')}
          >
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
                    <Wallet className="w-3.5 h-3.5 text-indigo-500" />
                    月末着地予測（純資産）
                  </p>
                  <p className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-slate-100 mt-1">
                    ¥{projectedNetAssets.toLocaleString()}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    予定収入 +¥{plannedIncomeTotal.toLocaleString()} / 予定支出 -¥{plannedTotal.toLocaleString()}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                    次回カード引落後の銀行残高予測
                  </p>
                  <p
                    className={`text-base sm:text-lg font-extrabold mt-1 ${
                      projectedPayPayBalance >= 0
                        ? 'text-sky-600 dark:text-sky-400'
                        : 'text-rose-500'
                    }`}
                  >
                    ¥{projectedPayPayBalance.toLocaleString()}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {nextCardDebitDate
                      ? `${nextCardDebitDate} 引落予定: ¥${nextCardDebitAmount.toLocaleString()}`
                      : `カード未払い合計: ¥${totalUnpaidCardAmount.toLocaleString()}`}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                    月末支出着地予測
                  </p>
                  <p className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-slate-100 mt-1">
                    ¥{projectedMonthExpense.toLocaleString()}
                  </p>
                  {budget.totalAmount > 0 && (
                    <p
                      className={`text-[11px] font-bold mt-0.5 ${
                        projectedBudgetRemaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                      }`}
                    >
                      {projectedBudgetRemaining >= 0
                        ? `予算内（残り ¥${projectedBudgetRemaining.toLocaleString()}）`
                        : `予算超過見込（+¥${Math.abs(projectedBudgetRemaining).toLocaleString()}）`}
                    </p>
                  )}
                </div>
              </div>

              {budget.totalAmount > 0 && projectedBudgetRemaining < 0 && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    確定支出と予定支出の合計（¥{projectedMonthExpense.toLocaleString()}）が今月の予算（¥{budget.totalAmount.toLocaleString()}）を ¥{Math.abs(projectedBudgetRemaining).toLocaleString()} 超過する見込みです。
                  </span>
                </div>
              )}
            </div>
          </Card>
        );

      case 'comparison':
        return (
          <Card
            title={`先月比較（${prevYearMonth} 対比）`}
            action={renderCardActions('comparison', '/analytics', '詳細分析')}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">支出の前月比</p>
                  <p className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-1">
                    今月 ¥{monthlyCashFlow.expense.toLocaleString()}
                    <span className="text-xs font-normal text-slate-400 ml-1.5">
                      / 先月 ¥{prevCashFlow.expense.toLocaleString()}
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                      expenseDiff <= 0
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                    }`}
                  >
                    <BarChart3 className="w-3 h-3" />
                    {expenseDiff > 0 ? '+' : ''}¥{expenseDiff.toLocaleString()}
                    {expenseDiffRate !== null ? ` (${expenseDiff > 0 ? '+' : ''}${expenseDiffRate}%)` : ''}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">収入の前月比</p>
                  <p className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-1">
                    今月 ¥{monthlyCashFlow.income.toLocaleString()}
                    <span className="text-xs font-normal text-slate-400 ml-1.5">
                      / 先月 ¥{prevCashFlow.income.toLocaleString()}
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                      incomeDiff >= 0
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}
                  >
                    {incomeDiff >= 0 ? '+' : ''}¥{incomeDiff.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        );

      case 'budget':
        return (
          <Card
            title="今月の予算消化状況"
            action={renderCardActions('budget', '/budgets', '予算を編集')}
          >
            <div className="space-y-3 py-1">
              <div className="flex justify-between items-baseline text-sm">
                <span className="text-slate-500 dark:text-slate-400">
                  予算: ¥{budget.totalAmount.toLocaleString()}
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  残り: ¥{remainingBudget.toLocaleString()}
                </span>
              </div>

              <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    budgetProgress >= 90
                      ? 'bg-rose-500'
                      : budgetProgress >= 70
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${budgetProgress}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>消化率 {budgetProgress}%</span>
                {remainingBudget < 0 && (
                  <span className="text-rose-500 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    予算オーバー
                  </span>
                )}
              </div>

              {plannedTotal > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-x-4 gap-y-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    予定支出込み予測: <span className="font-bold text-slate-800 dark:text-slate-100">¥{projectedMonthExpense.toLocaleString()}</span>
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    予算残: <span className={`font-bold ${projectedBudgetRemaining >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>¥{projectedBudgetRemaining.toLocaleString()}</span>
                  </p>
                </div>
              )}
            </div>
          </Card>
        );
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn px-1 sm:px-0">
      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-900 border-emerald-100 dark:border-emerald-900/50 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                今月の収入
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
                今月の支出
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
                今月の収支差額
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

      {/* Hidden cards restore bar */}
      {hiddenCards.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-1">
          <span className="text-xs font-semibold text-slate-400">非表示中のカード:</span>
          {hiddenCards.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => toggleCardVisibility(id)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 transition"
            >
              <Eye className="w-3 h-3" />
              {CARD_LABELS[id]}
            </button>
          ))}
        </div>
      )}

      {/* 完全平行デザイン・垂直FLIPアニメーション対応カード群 */}
      <div className="flex flex-col gap-4 sm:gap-5">
        {visibleCards.map((id) => (
          <div
            key={id}
            ref={(el) => {
              cardRefs.current[id] = el;
            }}
            className="will-change-transform"
          >
            {renderDashboardCard(id)}
          </div>
        ))}
      </div>

      {/* Savings Goals & Planned Expenses Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Savings Goals */}
        <Card
          title="貯金目標"
          action={
            activeGoals.length > 0 ? (
              <Link
                to="/goals"
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                すべて見る
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Target className="w-3.5 h-3.5" />
                目標を設定
              </span>
            )
          }
        >
          {activeGoals.length === 0 ? (
            <div className="py-8 text-center">
              <Target className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400">貯金目標が設定されていません</p>
              <Link to="/goals" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline mt-2 inline-block">
                目標を作成する
              </Link>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {activeGoals.slice(0, 3).map((goal) => {
                const percent =
                  goal.targetAmount > 0
                    ? Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100)
                    : 0;
                const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);

                return (
                  <div key={goal.id} className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <Target className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                            {goal.title}
                          </h4>
                          {goal.deadlineDate && (
                            <p className="text-[11px] text-slate-400">期日: {goal.deadlineDate}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-extrabold px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 shrink-0">
                        {percent}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>¥{goal.currentAmount.toLocaleString()} / ¥{goal.targetAmount.toLocaleString()}</span>
                      <span>残り ¥{remaining.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
              {activeGoals.length > 3 && (
                <p className="text-xs text-slate-400 text-center pt-1">
                  他 {activeGoals.length - 3} 件の目標
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Planned Expenses */}
        <Card
          title="今月の支出予定"
          action={
            currentMonthPlanned.length > 0 ? (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                期日順
              </span>
            ) : (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                予定なし
              </span>
            )
          }
        >
          {currentMonthPlanned.length === 0 ? (
            <div className="py-8 text-center">
              <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400">今月の支出予定はありません</p>
            </div>
          ) : (
            <div className="space-y-2">
              {currentMonthPlanned
                .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                .slice(0, 5)
                .map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                        {p.description}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">期日: {p.dueDate}</p>
                    </div>
                    <span className="font-bold text-sm text-slate-700 dark:text-slate-200 shrink-0 ml-2">
                      ¥{p.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              {currentMonthPlanned.length > 5 && (
                <p className="text-xs text-slate-400 text-center pt-1">
                  他 {currentMonthPlanned.length - 5} 件の予定
                </p>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card
        title="最近の取引"
        action={
          <Link
            to="/transactions"
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            すべて見る
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        }
      >
        {recentTransactions.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">今月の取引履歴はまだありません</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentTransactions.map((tx) => {
              const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : undefined;
              return (
                <div key={tx.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: cat?.color || '#94a3b8' }}
                    >
                      {tx.type === 'income' ? (
                        <ArrowUpRight className="w-5 h-5" />
                      ) : (
                        <ArrowDownRight className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                        {tx.description}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {tx.date} • {cat?.name || 'カテゴリなし'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`font-bold text-sm sm:text-base shrink-0 ml-2 ${
                      tx.type === 'income'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'}¥{tx.amount.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
