import { Account, Transaction } from '@/types';
import { calculateAccountBalances, calculateCategoryBreakdown, calculateMonthlyCashFlow } from './balanceEngine';
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

  it('両替・調整・経費は月間収支・カテゴリ支出に含めず、経費のみクレジットカード支払いには含める', () => {
    const categoryNameMap = new Map<string, string>([
      ['cat-food', '食費'],
      ['cat-exchange', '両替'],
      ['cat-adjust', '調整'],
      ['cat-expense', '経費'],
    ]);

    const mixedTransactions: Transaction[] = [
      {
        id: 'tx-food',
        date: '2026-11-05',
        type: 'expense',
        amount: 3000,
        accountId: 'acc-card',
        categoryId: 'cat-food',
        description: 'ランチ',
        createdAt: '2026-11-05T10:00:00Z',
        updatedAt: '2026-11-05T10:00:00Z',
      },
      {
        id: 'tx-keihi',
        date: '2026-11-06',
        type: 'expense',
        amount: 8000,
        accountId: 'acc-card',
        categoryId: 'cat-expense',
        description: '備品立替',
        createdAt: '2026-11-06T10:00:00Z',
        updatedAt: '2026-11-06T10:00:00Z',
      },
      {
        id: 'tx-exchange',
        date: '2026-11-07',
        type: 'expense',
        amount: 5000,
        accountId: 'acc-bank',
        categoryId: 'cat-exchange',
        description: '両替',
        createdAt: '2026-11-07T10:00:00Z',
        updatedAt: '2026-11-07T10:00:00Z',
      },
      {
        id: 'tx-adjust',
        date: '2026-11-08',
        type: 'income',
        amount: 2000,
        accountId: 'acc-bank',
        categoryId: 'cat-adjust',
        description: '残高調整',
        createdAt: '2026-11-08T10:00:00Z',
        updatedAt: '2026-11-08T10:00:00Z',
      },
    ];

    const flow = calculateMonthlyCashFlow(mixedTransactions, '2026-11', categoryNameMap);
    expect(flow.income).toBe(0);
    expect(flow.expense).toBe(3000); // 両替・調整・経費は除外され、食費のみ

    const breakdown = calculateCategoryBreakdown(mixedTransactions, '2026-11', categoryNameMap);
    expect(breakdown['cat-food']).toBe(3000);
    expect(breakdown['cat-expense']).toBeUndefined();
    expect(breakdown['cat-exchange']).toBeUndefined();

    // クレジットカードの未払いには「経費(8000)」が含まれる（3000 + 8000 = 11000）
    const cardSummary = calculateCardBillingSummary(
      cardAccount,
      mixedTransactions,
      '2026-11-15',
      categoryNameMap
    );
    expect(cardSummary.unpaidTotal).toBe(11000);

    // 口座残高には両替(-5000)・調整(+2000)・経費(-8000)のすべてが増減反映される
    const balances = calculateAccountBalances(
      [bankAccount, cardAccount],
      mixedTransactions,
      '2026-11-15',
      categoryNameMap
    );
    expect(balances['acc-bank']).toBe(97000); // 100000 - 5000(両替) + 2000(調整)
    expect(balances['acc-card']).toBe(-11000); // -3000(食費) - 8000(経費)
  });
});
