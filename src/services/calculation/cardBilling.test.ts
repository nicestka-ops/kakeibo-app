import { Account, Transaction } from '@/types';
import { calculateAccountBalances } from './balanceEngine';
import { calculateCardBillingSummary } from './cardBilling';

describe('cardBilling', () => {
  const bankAccount: Account = {
    id: 'acc-bank',
    name: 'PayPay銀行',
    type: 'bank',
    openingBalance: 100000,
    openingBalanceDate: '2026-01-01',
    includeInAssets: true,
    sortOrder: 1,
    isActive: true,
  };

  const cardAccount: Account = {
    id: 'acc-card',
    name: 'Amazon Prime Mastercard',
    type: 'credit_card',
    openingBalance: 0,
    openingBalanceDate: '2026-01-01',
    includeInAssets: false,
    paymentAccountId: 'acc-bank',
    closingDay: 31, // 末日締め
    paymentDay: 28, // 28日引き落とし
    paymentMonthOffset: 1, // 翌月
    autoDebitEnabled: true,
    sortOrder: 2,
    isActive: true,
  };

  const transactions: Transaction[] = [
    {
      id: 'tx-sep',
      date: '2026-09-15',
      type: 'expense',
      amount: 10000,
      accountId: 'acc-card',
      description: '9月利用分',
      createdAt: '2026-09-15T10:00:00Z',
      updatedAt: '2026-09-15T10:00:00Z',
    },
    {
      id: 'tx-oct',
      date: '2026-10-20',
      type: 'expense',
      amount: 25000,
      accountId: 'acc-card',
      description: '10月利用分',
      createdAt: '2026-10-20T10:00:00Z',
      updatedAt: '2026-10-20T10:00:00Z',
    },
    {
      id: 'tx-nov',
      date: '2026-11-10',
      type: 'expense',
      amount: 15000,
      accountId: 'acc-card',
      description: '11月利用分',
      createdAt: '2026-11-10T10:00:00Z',
      updatedAt: '2026-11-10T10:00:00Z',
    },
  ];

  it('28日より前（例: 11月15日）は先月分(10月)と今月分(11月)が未払いになり、9月分は引き落とし済みになる', () => {
    const summary = calculateCardBillingSummary(cardAccount, transactions, '2026-11-15');
    expect(summary.debitedTotal).toBe(10000);
    expect(summary.unpaidTotal).toBe(40000); // 10月(25000) + 11月(15000)
    expect(summary.nextDebitDate).toBe('2026-11-28');
    expect(summary.nextDebitAmount).toBe(25000);

    const balances = calculateAccountBalances([bankAccount, cardAccount], transactions, '2026-11-15');
    expect(balances['acc-bank']).toBe(90000); // 100000 - 10000
    expect(balances['acc-card']).toBe(-40000); // 未払い総額
  });

  it('28日以降（例: 11月28日）は先月分(10月)が引き落とし済みになり、未払いは今月分(11月)のみになる', () => {
    const summary = calculateCardBillingSummary(cardAccount, transactions, '2026-11-28');
    expect(summary.debitedTotal).toBe(35000); // 9月(10000) + 10月(25000)
    expect(summary.unpaidTotal).toBe(15000); // 11月(15000)のみ
    expect(summary.nextDebitDate).toBe('2026-12-28');
    expect(summary.nextDebitAmount).toBe(15000);

    const balances = calculateAccountBalances([bankAccount, cardAccount], transactions, '2026-11-28');
    expect(balances['acc-bank']).toBe(65000); // 100000 - 35000
    expect(balances['acc-card']).toBe(-15000); // 今月分のみ未払い
  });

  it('引き落とし日を10日に変更すると、11月15日時点で10月分が引き落とし済みになる', () => {
    const customCard: Account = { ...cardAccount, paymentDay: 10 };
    const summary = calculateCardBillingSummary(customCard, transactions, '2026-11-15');
    expect(summary.debitedTotal).toBe(35000);
    expect(summary.unpaidTotal).toBe(15000);
    expect(summary.nextDebitDate).toBe('2026-12-10');
  });
});
