import { Account, Transaction } from '@/types';

export interface CardBillingCycle {
  closingYm: string;
  debitDate: string;
  amount: number;
}

export interface CardBillingSummary {
  debitedTotal: number;
  unpaidTotal: number;
  nextDebitDate: string | null;
  nextDebitAmount: number;
  unpaidCycles: CardBillingCycle[];
}

export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatYearMonthDay(year: number, month1To12: number, day: number): string {
  const lastDay = new Date(year, month1To12, 0).getDate();
  const clampedDay = Math.max(1, Math.min(day, lastDay));
  return `${year}-${String(month1To12).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}

export function getClosingPeriodForDate(
  txDate: string,
  closingDay: number = 31
): { year: number; month: number } {
  const [yStr, mStr, dStr] = txDate.split('-');
  let year = parseInt(yStr, 10);
  let month = parseInt(mStr, 10);
  const day = parseInt(dStr, 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }

  // closingDay >= 29 は「末日締め」（当月1日〜末日）として扱う
  if (closingDay < 29 && day > closingDay) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return { year, month };
}

export function getPaymentDateForClosing(
  closingYear: number,
  closingMonth: number,
  paymentDay: number = 28,
  paymentMonthOffset: number = 1
): string {
  const totalMonths = closingYear * 12 + (closingMonth - 1) + paymentMonthOffset;
  const payYear = Math.floor(totalMonths / 12);
  const payMonth = (totalMonths % 12) + 1;
  return formatYearMonthDay(payYear, payMonth, paymentDay);
}

export function calculateCardBillingSummary(
  cardAccount: Account,
  transactions: Transaction[],
  asOfDate: string = getTodayDateString(),
  _categoryNameMap?: Map<string, string>
): CardBillingSummary {
  const closingDay = cardAccount.closingDay ?? 31;
  const paymentDay = cardAccount.paymentDay ?? 28;
  const paymentMonthOffset = cardAccount.paymentMonthOffset ?? 1;

  const cycleAmounts = new Map<string, number>();
  const seenIds = new Set<string>();
  let manualPaymentTotal = 0;

  for (const tx of transactions) {
    if (tx.accountId !== cardAccount.id) continue;
    if (seenIds.has(tx.id)) continue;
    seenIds.add(tx.id);

    if (tx.date > asOfDate) continue;

    const amount = Math.round(Math.abs(tx.amount));
    if (tx.type === 'expense') {
      const { year, month } = getClosingPeriodForDate(tx.date, closingDay);
      const closingYm = `${year}-${String(month).padStart(2, '0')}`;
      cycleAmounts.set(closingYm, (cycleAmounts.get(closingYm) || 0) + amount);
    } else if (tx.type === 'income' || tx.type === 'adjustment') {
      const { year, month } = getClosingPeriodForDate(tx.date, closingDay);
      const closingYm = `${year}-${String(month).padStart(2, '0')}`;
      cycleAmounts.set(closingYm, (cycleAmounts.get(closingYm) || 0) - amount);
    } else if (tx.type === 'card_payment') {
      manualPaymentTotal += amount;
    }
  }

  let rawDebitedTotal = 0;
  let unpaidTotal = 0;
  const unpaidCycles: CardBillingCycle[] = [];

  for (const [closingYm, rawAmount] of cycleAmounts.entries()) {
    const amount = Math.max(0, rawAmount);
    if (amount === 0) continue;

    const [yStr, mStr] = closingYm.split('-');
    const debitDate = getPaymentDateForClosing(
      parseInt(yStr, 10),
      parseInt(mStr, 10),
      paymentDay,
      paymentMonthOffset
    );

    if (debitDate <= asOfDate) {
      rawDebitedTotal += amount;
    } else {
      unpaidTotal += amount;
      unpaidCycles.push({ closingYm, debitDate, amount });
    }
  }

  unpaidCycles.sort((a, b) => a.debitDate.localeCompare(b.debitDate));

  // 手動の card_payment が既に入力されている場合は二重引き落としを防止
  const debitedTotal = Math.max(0, rawDebitedTotal - manualPaymentTotal);

  return {
    debitedTotal,
    unpaidTotal,
    nextDebitDate: unpaidCycles[0]?.debitDate ?? null,
    nextDebitAmount: unpaidCycles[0]?.amount ?? 0,
    unpaidCycles,
  };
}
