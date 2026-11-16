import { Account, PlannedExpense, Transaction } from '@/types';
import { calculateMonthlyCashFlow } from './balanceEngine';
import { calculateCardBillingSummary, getClosingPeriodForDate, getTodayDateString } from './cardBilling';

export interface MonthlyPlannedSummary {
  items: PlannedExpense[];
  total: number;
}

export function getPreviousYearMonth(yearMonth: string): string {
  const [yStr, mStr] = yearMonth.split('-');
  let y = parseInt(yStr, 10);
  let m = parseInt(mStr, 10) - 1;
  if (m < 1) {
    m = 12;
    y -= 1;
  }
  return `${y}-${String(m).padStart(2, '0')}`;
}

export function getNextYearMonth(yearMonth: string): string {
  const [yStr, mStr] = yearMonth.split('-');
  let y = parseInt(yStr, 10);
  let m = parseInt(mStr, 10) + 1;
  if (m > 12) {
    m = 1;
    y += 1;
  }
  return `${y}-${String(m).padStart(2, '0')}`;
}

export function getDaysInYearMonth(yearMonth: string): number {
  const [yStr, mStr] = yearMonth.split('-');
  return new Date(parseInt(yStr, 10), parseInt(mStr, 10), 0).getDate();
}

export function getMonthlyPlannedExpenses(
  plannedExpenses: PlannedExpense[],
  yearMonth: string
): MonthlyPlannedSummary {
  const items = plannedExpenses
    .filter((p) => !p.isCompleted && p.kind !== 'income' && p.dueDate.startsWith(yearMonth))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const total = items.reduce((sum, p) => sum + Math.round(Math.abs(p.amount)), 0);
  return { items, total };
}

export interface EndOfMonthForecast {
  actualExpense: number;
  actualIncome: number;
  elapsedDays: number;
  daysInMonth: number;
  dailyAvg: number;
  estimatedExpense: number;
  isFinalized: boolean;
}

export function calculateEndOfMonthForecast(
  transactions: Transaction[],
  yearMonth: string,
  categoryNameMap?: Map<string, string>
): EndOfMonthForecast {
  const cashFlow = calculateMonthlyCashFlow(transactions, yearMonth, categoryNameMap);
  const daysInMonth = getDaysInYearMonth(yearMonth);
  const todayStr = getTodayDateString();
  const currentYm = todayStr.slice(0, 7);

  if (yearMonth < currentYm) {
    const dailyAvg = daysInMonth > 0 ? Math.floor(cashFlow.expense / daysInMonth) : 0;
    return {
      actualExpense: cashFlow.expense,
      actualIncome: cashFlow.income,
      elapsedDays: daysInMonth,
      daysInMonth,
      dailyAvg,
      estimatedExpense: cashFlow.expense,
      isFinalized: true,
    };
  }

  if (yearMonth > currentYm) {
    return {
      actualExpense: cashFlow.expense,
      actualIncome: cashFlow.income,
      elapsedDays: 0,
      daysInMonth,
      dailyAvg: 0,
      estimatedExpense: cashFlow.expense,
      isFinalized: false,
    };
  }

  const elapsedDays = Math.max(1, parseInt(todayStr.slice(8, 10), 10));
  const dailyAvg = Math.floor(cashFlow.expense / elapsedDays);
  const estimatedExpense = dailyAvg * daysInMonth;

  return {
    actualExpense: cashFlow.expense,
    actualIncome: cashFlow.income,
    elapsedDays,
    daysInMonth,
    dailyAvg,
    estimatedExpense,
    isFinalized: false,
  };
}

export interface LastMonthComparisonResult {
  currentExpense: number;
  prevExpense: number;
  expenseDiff: number;
  currentNet: number;
  prevNet: number;
  netDiff: number;
  cutoffDay: number;
}

export function calculateLastMonthComparison(
  transactions: Transaction[],
  yearMonth: string,
  categoryNameMap?: Map<string, string>
): LastMonthComparisonResult {
  const todayStr = getTodayDateString();
  const currentYm = todayStr.slice(0, 7);
  const prevYm = getPreviousYearMonth(yearMonth);

  const cutoffDay =
    yearMonth === currentYm
      ? parseInt(todayStr.slice(8, 10), 10)
      : getDaysInYearMonth(yearMonth);

  const curEnd = `${yearMonth}-${String(cutoffDay).padStart(2, '0')}`;
  const prevDays = getDaysInYearMonth(prevYm);
  const prevEnd = `${prevYm}-${String(Math.min(cutoffDay, prevDays)).padStart(2, '0')}`;

  const curTxs = transactions.filter((t) => t.date >= `${yearMonth}-01` && t.date <= curEnd);
  const prevTxs = transactions.filter((t) => t.date >= `${prevYm}-01` && t.date <= prevEnd);

  const curFlow = calculateMonthlyCashFlow(curTxs, yearMonth, categoryNameMap);
  const prevFlow = calculateMonthlyCashFlow(prevTxs, prevYm, categoryNameMap);

  return {
    currentExpense: curFlow.expense,
    prevExpense: prevFlow.expense,
    expenseDiff: curFlow.expense - prevFlow.expense,
    currentNet: curFlow.netSavings,
    prevNet: prevFlow.netSavings,
    netDiff: curFlow.netSavings - prevFlow.netSavings,
    cutoffDay,
  };
}

export interface CardBillingDetail {
  confirmedAmount: number;
  preliminaryAmount: number;
  nextDebitDate: string | null;
  followingMonthEstimate: number;
  linkedCards: Account[];
}

export function calculateLinkedCardBillingForBank(
  bankAccountId: string,
  accounts: Account[],
  transactions: Transaction[],
  categoryNameMap?: Map<string, string>,
  asOfDate: string = getTodayDateString()
): CardBillingDetail {
  const linkedCards = accounts.filter(
    (a) => a.type === 'credit_card' && a.isActive && a.paymentAccountId === bankAccountId
  );

  let confirmedAmount = 0;
  let preliminaryAmount = 0;
  let nextDebitDate: string | null = null;
  let followingMonthEstimate = 0;

  const currentYm = asOfDate.slice(0, 7);

  for (const card of linkedCards) {
    const summary = calculateCardBillingSummary(card, transactions, asOfDate, categoryNameMap);
    const closingDay = card.closingDay ?? 31;

    for (const cycle of summary.unpaidCycles) {
      // 当月締めより前の確定サイクル＝確定、当月以降のオープンサイクル＝速報
      const { year, month } = getClosingPeriodForDate(asOfDate, closingDay);
      const currentClosingYm = `${year}-${String(month).padStart(2, '0')}`;

      if (cycle.closingYm < currentClosingYm) {
        confirmedAmount += cycle.amount;
        if (!nextDebitDate || cycle.debitDate < nextDebitDate) {
          nextDebitDate = cycle.debitDate;
        }
      } else {
        preliminaryAmount += cycle.amount;
      }

      if (cycle.debitDate.slice(0, 7) > currentYm) {
        followingMonthEstimate += cycle.amount;
      }
    }
  }

  return {
    confirmedAmount,
    preliminaryAmount,
    nextDebitDate,
    followingMonthEstimate,
    linkedCards,
  };
}
