import { Account, Transaction } from '@/types';
import {
  calculateAccountBalances,
  calculateFinancialSummary,
  calculateMonthlyCashFlow,
  calculateCategoryBreakdown,
  generateMonthlyTrend,
  generateAssetTrend,
  FinancialSummary,
  MonthlyCashFlow,
  AccountBalanceMap,
  AssetTrendPoint,
} from './balanceEngine';

const createAccount = (overrides: Partial<Account> = {}): Account => ({
  id: 'acc-1',
  name: 'Test Bank',
  type: 'bank',
  openingBalance: 100000,
  openingBalanceDate: '2026-01-01',
  includeInAssets: true,
  sortOrder: 1,
  isActive: true,
  ...overrides,
});

const createTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 'tx-1',
  date: '2026-01-15',
  type: 'expense',
  amount: 5000,
  accountId: 'acc-1',
  description: 'Test expense',
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-01-15T10:00:00Z',
  ...overrides,
});

describe('balanceEngine', () => {
  describe('calculateAccountBalances', () => {
    it('should calculate balance from opening balance and transactions', () => {
      const accounts = [createAccount({ openingBalance: 100000 })];
      const transactions = [
        createTransaction({ id: 'tx-1', type: 'income', amount: 50000 }),
        createTransaction({ id: 'tx-2', type: 'expense', amount: 30000 }),
      ];

      const balances = calculateAccountBalances(accounts, transactions);
      expect(balances['acc-1']).toBe(120000); // 100000 + 50000 - 30000
    });

    it('should handle transfer_out and transfer_in correctly', () => {
      const accounts = [
        createAccount({ id: 'acc-1', name: 'Bank A', openingBalance: 100000 }),
        createAccount({ id: 'acc-2', name: 'Bank B', openingBalance: 50000 }),
      ];
      const transactions = [
        createTransaction({
          id: 'tx-1',
          type: 'transfer_out',
          amount: 20000,
          accountId: 'acc-1',
          transferGroupId: 'trf-1',
        }),
        createTransaction({
          id: 'tx-2',
          type: 'transfer_in',
          amount: 20000,
          accountId: 'acc-2',
          transferGroupId: 'trf-1',
        }),
      ];

      const balances = calculateAccountBalances(accounts, transactions);
      expect(balances['acc-1']).toBe(80000);  // 100000 - 20000
      expect(balances['acc-2']).toBe(70000);  // 50000 + 20000
    });

    it('should not change total assets with transfers', () => {
      const accounts = [
        createAccount({ id: 'acc-1', openingBalance: 100000 }),
        createAccount({ id: 'acc-2', openingBalance: 50000 }),
      ];
      const transactions = [
        createTransaction({ id: 'tx-1', type: 'transfer_out', amount: 20000, accountId: 'acc-1', transferGroupId: 'trf-1' }),
        createTransaction({ id: 'tx-2', type: 'transfer_in', amount: 20000, accountId: 'acc-2', transferGroupId: 'trf-1' }),
      ];

      const balances = calculateAccountBalances(accounts, transactions);
      const totalBefore = 100000 + 50000;
      const totalAfter = balances['acc-1'] + balances['acc-2'];
      expect(totalAfter).toBe(totalBefore);
    });

    it('should handle credit card payments correctly', () => {
      const accounts = [
        createAccount({ id: 'acc-1', name: 'Bank', type: 'bank', openingBalance: 100000 }),
        createAccount({ id: 'acc-2', name: 'Credit Card', type: 'credit_card', openingBalance: 0, includeInAssets: false }),
      ];
      const transactions = [
        createTransaction({ id: 'tx-1', type: 'expense', amount: 10000, accountId: 'acc-2' }), // Card usage
        createTransaction({ id: 'tx-2', type: 'card_payment', amount: 10000, accountId: 'acc-1' }), // Payment from bank
        createTransaction({ id: 'tx-3', type: 'card_payment', amount: 10000, accountId: 'acc-2' }), // Payment to card
      ];

      const balances = calculateAccountBalances(accounts, transactions);
      expect(balances['acc-1']).toBe(90000);  // 100000 - 10000 (payment)
      expect(balances['acc-2']).toBe(0);      // 0 + 10000 (usage) - 10000 (payment)
    });

    it('should respect asOfDate filter', () => {
      const accounts = [createAccount({ openingBalance: 100000, openingBalanceDate: '2026-01-01' })];
      const transactions = [
        createTransaction({ id: 'tx-1', date: '2026-01-10', type: 'expense', amount: 10000 }),
        createTransaction({ id: 'tx-2', date: '2026-01-20', type: 'expense', amount: 20000 }),
      ];

      const balances = calculateAccountBalances(accounts, transactions, '2026-01-15');
      expect(balances['acc-1']).toBe(90000); // Only first transaction counted
    });

    it('should not apply opening balance if openingBalanceDate is after asOfDate', () => {
      const accounts = [createAccount({ openingBalance: 100000, openingBalanceDate: '2026-02-01' })];
      const transactions = [
        createTransaction({ id: 'tx-1', date: '2026-01-15', type: 'income', amount: 50000 }),
      ];

      const balances = calculateAccountBalances(accounts, transactions, '2026-01-20');
      expect(balances['acc-1']).toBe(50000); // Opening balance not applied, only transaction
    });

    it('should prevent duplicate transaction IDs from being counted twice', () => {
      const accounts = [createAccount({ openingBalance: 100000 })];
      const transactions = [
        createTransaction({ id: 'tx-1', type: 'expense', amount: 10000 }),
        createTransaction({ id: 'tx-1', type: 'expense', amount: 10000 }), // Duplicate ID
      ];

      const balances = calculateAccountBalances(accounts, transactions);
      expect(balances['acc-1']).toBe(90000); // Only counted once
    });

    it('should handle adjustment type as income', () => {
      const accounts = [createAccount({ openingBalance: 100000 })];
      const transactions = [
        createTransaction({ id: 'tx-1', type: 'adjustment', amount: 5000 }),
      ];

      const balances = calculateAccountBalances(accounts, transactions);
      expect(balances['acc-1']).toBe(105000);
    });

    it('should handle old transfer type (single entry)', () => {
      const accounts = [createAccount({ openingBalance: 100000 })];
      const transactions = [
        createTransaction({ id: 'tx-1', type: 'transfer', amount: 10000 }),
      ];

      const balances = calculateAccountBalances(accounts, transactions);
      expect(balances['acc-1']).toBe(90000);
    });

    it('should initialize balance to 0 for unknown accounts', () => {
      const accounts = [createAccount({ id: 'acc-1', openingBalance: 100000 })];
      const transactions = [
        createTransaction({ id: 'tx-1', type: 'expense', amount: 5000, accountId: 'unknown-acc' }),
      ];

      const balances = calculateAccountBalances(accounts, transactions);
      expect(balances['unknown-acc']).toBe(-5000);
    });
  });

  describe('calculateFinancialSummary', () => {
    it('should calculate total assets, liabilities, and net assets', () => {
      const accounts = [
        createAccount({ id: 'acc-1', type: 'bank', includeInAssets: true }),
        createAccount({ id: 'acc-2', type: 'credit_card', includeInAssets: false }),
        createAccount({ id: 'acc-3', type: 'cash', includeInAssets: true }),
      ];
      const balances: AccountBalanceMap = {
        'acc-1': 100000,
        'acc-2': -50000, // Credit card debt
        'acc-3': 30000,
      };

      const summary = calculateFinancialSummary(accounts, balances);
      expect(summary.totalAssets).toBe(130000); // 100000 + 30000
      expect(summary.totalLiabilities).toBe(50000); // Credit card debt
      expect(summary.netAssets).toBe(80000); // 130000 - 50000
    });

    it('should treat negative non-credit-card balances as liabilities', () => {
      const accounts = [
        createAccount({ id: 'acc-1', type: 'bank', includeInAssets: true }),
      ];
      const balances: AccountBalanceMap = {
        'acc-1': -10000, // Overdraft
      };

      const summary = calculateFinancialSummary(accounts, balances);
      expect(summary.totalAssets).toBe(0);
      expect(summary.totalLiabilities).toBe(10000);
      expect(summary.netAssets).toBe(-10000);
    });

    it('should exclude inactive accounts', () => {
      const accounts = [
        createAccount({ id: 'acc-1', isActive: true }),
        createAccount({ id: 'acc-2', isActive: false }),
      ];
      const balances: AccountBalanceMap = {
        'acc-1': 100000,
        'acc-2': 50000,
      };

      const summary = calculateFinancialSummary(accounts, balances);
      expect(summary.totalAssets).toBe(100000);
    });

    it('should exclude accounts with includeInAssets=false (except credit cards)', () => {
      const accounts = [
        createAccount({ id: 'acc-1', type: 'bank', includeInAssets: true }),
        createAccount({ id: 'acc-2', type: 'bank', includeInAssets: false }),
        createAccount({ id: 'acc-3', type: 'credit_card', includeInAssets: false }),
      ];
      const balances: AccountBalanceMap = {
        'acc-1': 100000,
        'acc-2': 50000,
        'acc-3': -20000,
      };

      const summary = calculateFinancialSummary(accounts, balances);
      expect(summary.totalAssets).toBe(100000);
      expect(summary.totalLiabilities).toBe(20000); // Credit card debt still counted
      expect(summary.netAssets).toBe(80000);
    });

    it('should handle positive credit card balance as asset if includeInAssets=true', () => {
      const accounts = [
        createAccount({ id: 'acc-1', type: 'credit_card', includeInAssets: true }),
      ];
      const balances: AccountBalanceMap = {
        'acc-1': 10000, // Prepaid/credit balance
      };

      const summary = calculateFinancialSummary(accounts, balances);
      expect(summary.totalAssets).toBe(10000);
      expect(summary.totalLiabilities).toBe(0);
    });
  });

  describe('calculateMonthlyCashFlow', () => {
    it('should calculate income and expense for a month', () => {
      const transactions = [
        createTransaction({ id: 'tx-1', date: '2026-01-10', type: 'income', amount: 200000 }),
        createTransaction({ id: 'tx-2', date: '2026-01-15', type: 'expense', amount: 50000 }),
        createTransaction({ id: 'tx-3', date: '2026-01-20', type: 'expense', amount: 30000 }),
        createTransaction({ id: 'tx-4', date: '2026-02-01', type: 'expense', amount: 10000 }), // Different month
      ];

      const cashFlow = calculateMonthlyCashFlow(transactions, '2026-01');
      expect(cashFlow.income).toBe(200000);
      expect(cashFlow.expense).toBe(80000);
      expect(cashFlow.netSavings).toBe(120000);
    });

    it('should exclude transfers from cash flow', () => {
      const transactions = [
        createTransaction({ id: 'tx-1', date: '2026-01-10', type: 'transfer_out', amount: 50000 }),
        createTransaction({ id: 'tx-2', date: '2026-01-10', type: 'transfer_in', amount: 50000 }),
        createTransaction({ id: 'tx-3', date: '2026-01-15', type: 'expense', amount: 30000 }),
      ];

      const cashFlow = calculateMonthlyCashFlow(transactions, '2026-01');
      expect(cashFlow.income).toBe(0);
      expect(cashFlow.expense).toBe(30000);
    });

    it('should exclude card_payment from cash flow', () => {
      const transactions = [
        createTransaction({ id: 'tx-1', date: '2026-01-10', type: 'card_payment', amount: 50000 }),
        createTransaction({ id: 'tx-2', date: '2026-01-15', type: 'expense', amount: 30000 }),
      ];

      const cashFlow = calculateMonthlyCashFlow(transactions, '2026-01');
      expect(cashFlow.expense).toBe(30000);
    });

    it('should return zeros for month with no transactions', () => {
      const transactions = [
        createTransaction({ id: 'tx-1', date: '2026-02-10', type: 'expense', amount: 50000 }),
      ];

      const cashFlow = calculateMonthlyCashFlow(transactions, '2026-01');
      expect(cashFlow.income).toBe(0);
      expect(cashFlow.expense).toBe(0);
      expect(cashFlow.netSavings).toBe(0);
    });
  });

  describe('calculateCategoryBreakdown', () => {
    it('should group expenses by category', () => {
      const transactions = [
        createTransaction({ id: 'tx-1', date: '2026-01-10', type: 'expense', amount: 5000, categoryId: 'cat-1' }),
        createTransaction({ id: 'tx-2', date: '2026-01-15', type: 'expense', amount: 3000, categoryId: 'cat-1' }),
        createTransaction({ id: 'tx-3', date: '2026-01-20', type: 'expense', amount: 10000, categoryId: 'cat-2' }),
        createTransaction({ id: 'tx-4', date: '2026-01-25', type: 'income', amount: 50000, categoryId: 'cat-3' }), // Income not counted
      ];

      const breakdown = calculateCategoryBreakdown(transactions, '2026-01');
      expect(breakdown['cat-1']).toBe(8000);
      expect(breakdown['cat-2']).toBe(10000);
      expect(breakdown['cat-3']).toBeUndefined();
    });

    it('should group uncategorized expenses under "uncategorized"', () => {
      const transactions = [
        createTransaction({ id: 'tx-1', date: '2026-01-10', type: 'expense', amount: 5000 }),
      ];

      const breakdown = calculateCategoryBreakdown(transactions, '2026-01');
      expect(breakdown['uncategorized']).toBe(5000);
    });
  });

  describe('generateMonthlyTrend', () => {
    it('should generate trend data for specified months', () => {
      const transactions = [
        createTransaction({ id: 'tx-1', date: '2026-01-10', type: 'income', amount: 200000 }),
        createTransaction({ id: 'tx-2', date: '2026-01-15', type: 'expense', amount: 80000 }),
        createTransaction({ id: 'tx-3', date: '2026-02-10', type: 'income', amount: 200000 }),
        createTransaction({ id: 'tx-4', date: '2026-02-15', type: 'expense', amount: 90000 }),
      ];

      const trend = generateMonthlyTrend(transactions, 3);
      expect(trend).toHaveLength(3);
      expect(trend[0].month).toMatch(/^\d{4}-\d{2}$/);
      expect(typeof trend[0].income).toBe('number');
      expect(typeof trend[0].expense).toBe('number');
      expect(typeof trend[0].balance).toBe('number');
    });
  });

  describe('Edge cases and data integrity', () => {
    it('should handle empty transactions array', () => {
      const accounts = [createAccount({ openingBalance: 100000 })];
      const transactions: Transaction[] = [];

      const balances = calculateAccountBalances(accounts, transactions);
      expect(balances['acc-1']).toBe(100000);
    });

    it('should handle empty accounts array', () => {
      const accounts: Account[] = [];
      const transactions = [createTransaction({ amount: 5000 })];

      const balances = calculateAccountBalances(accounts, transactions);
      expect(balances['acc-1']).toBe(-5000);
    });

    it('should round amounts to integers', () => {
      const accounts = [createAccount({ openingBalance: 100000 })];
      const transactions = [
        createTransaction({ id: 'tx-1', type: 'expense', amount: 3333.33 }),
        createTransaction({ id: 'tx-2', type: 'income', amount: 1000.99 }),
      ];

      const balances = calculateAccountBalances(accounts, transactions);
      // 100000 - 3333 (rounds to 3333) + 1001 (rounds to 1001) = 97668
      expect(balances['acc-1']).toBe(97668);
    });

    it('should handle large numbers without overflow', () => {
      const accounts = [createAccount({ openingBalance: 1_000_000_000 })];
      const transactions = [
        createTransaction({ id: 'tx-1', type: 'expense', amount: 999_999_999 }),
      ];

      const balances = calculateAccountBalances(accounts, transactions);
      expect(balances['acc-1']).toBe(1);
    });
  });

  describe('generateAssetTrend', () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    const getMonthStr = (offset: number) => {
      const d = new Date(currentYear, currentMonth - 1 + offset, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };
    
    const month0 = getMonthStr(-2);
    const month1 = getMonthStr(-1);
    const month2 = getMonthStr(0);

    const accounts: Account[] = [
      createAccount({ id: 'acc-1', name: '銀行', type: 'bank', openingBalance: 100000, openingBalanceDate: '2026-01-01' }),
      createAccount({ id: 'acc-2', name: '現金', type: 'cash', openingBalance: 10000, openingBalanceDate: '2026-01-01' }),
      createAccount({ id: 'acc-3', name: 'クレカ', type: 'credit_card', openingBalance: 0, openingBalanceDate: '2026-01-01', includeInAssets: false }),
    ];

    const transactions: Transaction[] = [
      { id: 'tx-1', date: `${month0}-05`, type: 'income', amount: 200000, accountId: 'acc-1', categoryId: 'cat-10', description: '給与', createdAt: '', updatedAt: '' },
      { id: 'tx-2', date: `${month0}-10`, type: 'expense', amount: 50000, accountId: 'acc-1', categoryId: 'cat-1', description: '家賃', createdAt: '', updatedAt: '' },
      { id: 'tx-3', date: `${month0}-15`, type: 'expense', amount: 10000, accountId: 'acc-2', categoryId: 'cat-1', description: '食費', createdAt: '', updatedAt: '' },
      { id: 'tx-4', date: `${month1}-05`, type: 'income', amount: 200000, accountId: 'acc-1', categoryId: 'cat-10', description: '給与', createdAt: '', updatedAt: '' },
      { id: 'tx-5', date: `${month1}-10`, type: 'expense', amount: 50000, accountId: 'acc-1', categoryId: 'cat-1', description: '家賃', createdAt: '', updatedAt: '' },
      { id: 'tx-6', date: `${month1}-15`, type: 'expense', amount: 5000, accountId: 'acc-3', categoryId: 'cat-1', description: 'クレカ利用', createdAt: '', updatedAt: '' },
      { id: 'tx-7', date: `${month1}-20`, type: 'card_payment', amount: 5000, accountId: 'acc-1', description: 'カード引き落とし', createdAt: '', updatedAt: '' },
      { id: 'tx-8', date: `${month1}-20`, type: 'card_payment', amount: 5000, accountId: 'acc-3', description: 'カード引き落とし', createdAt: '', updatedAt: '' },
      { id: 'tx-9', date: `${month2}-05`, type: 'income', amount: 200000, accountId: 'acc-1', categoryId: 'cat-10', description: '給与', createdAt: '', updatedAt: '' },
      { id: 'tx-10', date: `${month2}-10`, type: 'expense', amount: 50000, accountId: 'acc-1', categoryId: 'cat-1', description: '家賃', createdAt: '', updatedAt: '' },
    ];

    it('should generate asset trend with correct structure', () => {
      const trend = generateAssetTrend(accounts, transactions, 3);
      expect(trend).toHaveLength(3);
      expect(trend[0]).toHaveProperty('month');
      expect(trend[0]).toHaveProperty('totalAssets');
      expect(trend[0]).toHaveProperty('totalLiabilities');
      expect(trend[0]).toHaveProperty('netAssets');
    });

    it('should calculate correct assets at month0 end', () => {
      const trend = generateAssetTrend(accounts, transactions, 3);
      // Month 0: Bank 100000 + 200000 - 50000 = 250000, Cash 10000 - 10000 = 0
      // Total Assets = 250000, Liabilities = 0, Net = 250000
      expect(trend[0].totalAssets).toBe(250000);
      expect(trend[0].totalLiabilities).toBe(0);
      expect(trend[0].netAssets).toBe(250000);
    });

    it('should calculate correct assets at month1 end (with card payment)', () => {
      const trend = generateAssetTrend(accounts, transactions, 3);
      // Month 1: Bank 250000 + 200000 - 50000 - 5000 = 395000, Cash 0, Card 0 (5000 expense - 5000 payment)
      // Total Assets = 395000, Liabilities = 0, Net = 395000
      expect(trend[1].totalAssets).toBe(395000);
      expect(trend[1].totalLiabilities).toBe(0);
      expect(trend[1].netAssets).toBe(395000);
    });

    it('should calculate correct assets at month2 end', () => {
      const trend = generateAssetTrend(accounts, transactions, 3);
      // Month 2: Bank 395000 + 200000 - 50000 = 545000
      // Total Assets = 545000, Net = 545000
      expect(trend[2].totalAssets).toBe(545000);
      expect(trend[2].netAssets).toBe(545000);
    });

    it('should handle account added mid-period (openingBalanceDate after start)', () => {
      const newAccounts = [
        ...accounts,
        createAccount({ id: 'acc-4', name: '新口座', type: 'bank', openingBalance: 50000, openingBalanceDate: `${month1}-01` }),
      ];
      const trend = generateAssetTrend(newAccounts, transactions, 3);
      // Month 0: acc-4 not yet opened, so not included
      expect(trend[0].totalAssets).toBe(250000);
      // Month 1: acc-4 opened, adds 50000
      expect(trend[1].totalAssets).toBe(445000); // 395000 + 50000
    });

    it('should handle past transfers correctly', () => {
      const transferTxns: Transaction[] = [
        { id: 'tx-1', date: `${month0}-10`, type: 'transfer_out', amount: 30000, accountId: 'acc-1', description: '現金引き出し', transferGroupId: 'trf-1', createdAt: '', updatedAt: '' },
        { id: 'tx-2', date: `${month0}-10`, type: 'transfer_in', amount: 30000, accountId: 'acc-2', description: '現金引き出し', transferGroupId: 'trf-1', createdAt: '', updatedAt: '' },
      ];
      const trend = generateAssetTrend(accounts, transferTxns, 3);
      // Transfers don't change total assets
      expect(trend[0].totalAssets).toBe(110000); // 100000 + 10000
      expect(trend[0].netAssets).toBe(110000);
    });

    it('should handle credit card debt increasing liabilities', () => {
      const ccTxns: Transaction[] = [
        { id: 'tx-1', date: `${month0}-10`, type: 'expense', amount: 20000, accountId: 'acc-3', categoryId: 'cat-1', description: 'クレカ利用', createdAt: '', updatedAt: '' },
        // No card payment yet - liability should increase
      ];
      const trend = generateAssetTrend(accounts, ccTxns, 3);
      // Credit card balance: -20000 (liability)
      expect(trend[0].totalAssets).toBe(110000); // Bank 100000 + Cash 10000
      expect(trend[0].totalLiabilities).toBe(20000);
      expect(trend[0].netAssets).toBe(90000);
    });

    it('should handle card payment reducing liabilities', () => {
      const ccTxns: Transaction[] = [
        { id: 'tx-1', date: `${month0}-10`, type: 'expense', amount: 20000, accountId: 'acc-3', categoryId: 'cat-1', description: 'クレカ利用', createdAt: '', updatedAt: '' },
        { id: 'tx-2', date: `${month0}-20`, type: 'card_payment', amount: 20000, accountId: 'acc-1', description: '引き落とし', createdAt: '', updatedAt: '' },
        { id: 'tx-3', date: `${month0}-20`, type: 'card_payment', amount: 20000, accountId: 'acc-3', description: '引き落とし', createdAt: '', updatedAt: '' },
      ];
      const trend = generateAssetTrend(accounts, ccTxns, 3);
      // Card payment: bank -20000, card +20000 (back to 0)
      expect(trend[0].totalAssets).toBe(90000); // Bank 80000 + Cash 10000
      expect(trend[0].totalLiabilities).toBe(0);
      expect(trend[0].netAssets).toBe(90000);
    });

    it('should return zeros for month with no transactions', () => {
      const emptyTxns: Transaction[] = [];
      const trend = generateAssetTrend(accounts, emptyTxns, 1);
      // Only opening balances
      expect(trend[0].totalAssets).toBe(110000);
      expect(trend[0].totalLiabilities).toBe(0);
      expect(trend[0].netAssets).toBe(110000);
    });

    it('should not include future transactions in past months', () => {
      const futureTxns: Transaction[] = [
        { id: 'tx-1', date: `${month2}-15`, type: 'income', amount: 100000, accountId: 'acc-1', categoryId: 'cat-10', description: '未来の収入', createdAt: '', updatedAt: '' },
      ];
      const trend = generateAssetTrend(accounts, futureTxns, 3);
      // Month 0 and 1 should not include month2's transaction
      expect(trend[0].totalAssets).toBe(110000);
      expect(trend[1].totalAssets).toBe(110000);
      // Month 2 should include it
      expect(trend[2].totalAssets).toBe(210000);
    });

    it('should handle adjustment transactions', () => {
      const adjTxns: Transaction[] = [
        { id: 'tx-1', date: `${month0}-10`, type: 'adjustment', amount: 5000, accountId: 'acc-1', description: '調整', createdAt: '', updatedAt: '' },
      ];
      const trend = generateAssetTrend(accounts, adjTxns, 3);
      expect(trend[0].totalAssets).toBe(115000); // 110000 + 5000
      expect(trend[0].netAssets).toBe(115000);
    });

    it('should exclude includeInAssets=false accounts from assets', () => {
      const specialAccounts = [
        createAccount({ id: 'acc-1', type: 'bank', openingBalance: 100000, includeInAssets: true }),
        createAccount({ id: 'acc-2', type: 'bank', openingBalance: 50000, includeInAssets: false }),
        createAccount({ id: 'acc-3', type: 'credit_card', openingBalance: -20000, includeInAssets: false }),
      ];
      const trend = generateAssetTrend(specialAccounts, [], 1);
      expect(trend[0].totalAssets).toBe(100000); // Only acc-1
      expect(trend[0].totalLiabilities).toBe(20000); // Credit card debt still counted
      expect(trend[0].netAssets).toBe(80000);
    });
  });
});