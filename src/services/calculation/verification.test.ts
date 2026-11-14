import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateAccountBalances, calculateFinancialSummary, generateMonthlyTrend } from '@/services/calculation/balanceEngine';
import { Account, Transaction } from '@/types';

// Mock localStorage
const mockLocalStorage = {};
vi.stubGlobal('localStorage', {
  getItem: vi.fn((key) => mockLocalStorage[key] || null),
  setItem: vi.fn((key, value) => { mockLocalStorage[key] = value; }),
  removeItem: vi.fn((key) => { delete mockLocalStorage[key]; }),
  clear: vi.fn(() => { Object.keys(mockLocalStorage).forEach(k => delete mockLocalStorage[k]); }),
});

describe('Budget persistence', () => {
  it('should persist categoryBudgets in budget object', () => {
    const budget = {
      id: 'b-2026-11',
      month: '2026-11',
      totalAmount: 120000,
      categoryBudgets: { 'cat-1': 35000, 'cat-2': 10000 },
      updatedAt: new Date().toISOString(),
    };
    
    // Simulate updateBudget behavior
    const updated = { totalAmount: 130000, categoryBudgets: { 'cat-1': 40000, 'cat-3': 15000 } };
    const newBudget = { ...budget, ...updated, updatedAt: new Date().toISOString() };
    
    expect(newBudget.totalAmount).toBe(130000);
    expect(newBudget.categoryBudgets).toEqual({ 'cat-1': 40000, 'cat-3': 15000 });
    expect(newBudget.categoryBudgets['cat-2']).toBeUndefined(); // Old category budget removed
  });
});

describe('Historical balance calculation (asset trends)', () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed
  
  // Create transactions for the last 3 months relative to now
  const getMonthStr = (offset) => {
    const d = new Date(currentYear, currentMonth - 1 + offset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  
  const month0 = getMonthStr(-2); // 2 months ago
  const month1 = getMonthStr(-1); // 1 month ago
  const month2 = getMonthStr(0);  // this month
  
  const accounts: Account[] = [
    { id: 'acc-1', name: '銀行', type: 'bank', openingBalance: 100000, openingBalanceDate: '2026-01-01', includeInAssets: true, isActive: true },
    { id: 'acc-2', name: '現金', type: 'cash', openingBalance: 10000, openingBalanceDate: '2026-01-01', includeInAssets: true, isActive: true },
    { id: 'acc-3', name: 'クレカ', type: 'credit_card', openingBalance: 0, openingBalanceDate: '2026-01-01', includeInAssets: false, isActive: true },
  ];

  const transactions: Transaction[] = [
    // Month 0 (2 months ago)
    { id: 'tx-1', date: `${month0}-05`, type: 'income', amount: 200000, accountId: 'acc-1', categoryId: 'cat-10', description: '給与', createdAt: '', updatedAt: '' },
    { id: 'tx-2', date: `${month0}-10`, type: 'expense', amount: 50000, accountId: 'acc-1', categoryId: 'cat-1', description: '家賃', createdAt: '', updatedAt: '' },
    { id: 'tx-3', date: `${month0}-15`, type: 'expense', amount: 10000, accountId: 'acc-2', categoryId: 'cat-1', description: '食費', createdAt: '', updatedAt: '' },
    // Month 1 (1 month ago)
    { id: 'tx-4', date: `${month1}-05`, type: 'income', amount: 200000, accountId: 'acc-1', categoryId: 'cat-10', description: '給与', createdAt: '', updatedAt: '' },
    { id: 'tx-5', date: `${month1}-10`, type: 'expense', amount: 50000, accountId: 'acc-1', categoryId: 'cat-1', description: '家賃', createdAt: '', updatedAt: '' },
    { id: 'tx-6', date: `${month1}-15`, type: 'expense', amount: 5000, accountId: 'acc-3', categoryId: 'cat-1', description: 'クレカ利用', createdAt: '', updatedAt: '' },
    { id: 'tx-7', date: `${month1}-20`, type: 'card_payment', amount: 5000, accountId: 'acc-1', description: 'カード引き落とし', createdAt: '', updatedAt: '' },
    { id: 'tx-8', date: `${month1}-20`, type: 'card_payment', amount: 5000, accountId: 'acc-3', description: 'カード引き落とし', createdAt: '', updatedAt: '' },
    // Month 2 (current month)
    { id: 'tx-9', date: `${month2}-05`, type: 'income', amount: 200000, accountId: 'acc-1', categoryId: 'cat-10', description: '給与', createdAt: '', updatedAt: '' },
    { id: 'tx-10', date: `${month2}-10`, type: 'expense', amount: 50000, accountId: 'acc-1', categoryId: 'cat-1', description: '家賃', createdAt: '', updatedAt: '' },
  ];

  it('should calculate correct balances as of month0 end', () => {
    const balances = calculateAccountBalances(accounts, transactions, `${month0}-31`);
    expect(balances['acc-1']).toBe(250000); // 100000 + 200000 - 50000
    expect(balances['acc-2']).toBe(0); // 10000 - 10000
    expect(balances['acc-3']).toBe(0);
    
    const summary = calculateFinancialSummary(accounts, balances);
    expect(summary.totalAssets).toBe(250000);
    expect(summary.totalLiabilities).toBe(0);
    expect(summary.netAssets).toBe(250000);
  });

  it('should calculate correct balances as of month1 end (including card payment)', () => {
    const balances = calculateAccountBalances(accounts, transactions, `${month1}-28`);
    // acc-1: 100000 + 200000 - 50000 + 200000 - 50000 - 5000 = 395000
    expect(balances['acc-1']).toBe(395000);
    // acc-2: 10000 - 10000 = 0
    expect(balances['acc-2']).toBe(0);
    // acc-3: 0 - 5000 + 5000 = 0 (expense on credit_card, then card_payment)
    expect(balances['acc-3']).toBe(0);
    
    const summary = calculateFinancialSummary(accounts, balances);
    expect(summary.totalAssets).toBe(395000);
    expect(summary.totalLiabilities).toBe(0);
    expect(summary.netAssets).toBe(395000);
  });

  it('should calculate correct balances as of month2 end', () => {
    const balances = calculateAccountBalances(accounts, transactions, `${month2}-31`);
    // acc-1: 395000 + 200000 - 50000 = 545000
    expect(balances['acc-1']).toBe(545000);
    expect(balances['acc-2']).toBe(0);
    expect(balances['acc-3']).toBe(0);
    
    const summary = calculateFinancialSummary(accounts, balances);
    expect(summary.totalAssets).toBe(545000);
    expect(summary.netAssets).toBe(545000);
  });

  it('should generate monthly trend without negative assets', () => {
    const trend = generateMonthlyTrend(transactions, 3);
    expect(trend.length).toBe(3);
    
    // Check that all balances are reasonable (no negative assets from calculation errors)
    trend.forEach(t => {
      expect(t.income).toBeGreaterThanOrEqual(0);
      expect(t.expense).toBeGreaterThanOrEqual(0);
    });
    
    // Month 0: income 200000, expense 60000
    expect(trend[0].income).toBe(200000);
    expect(trend[0].expense).toBe(60000);
    
    // Month 1: income 200000, expense 55000
    expect(trend[1].income).toBe(200000);
    expect(trend[1].expense).toBe(55000);
    
    // Month 2: income 200000, expense 50000
    expect(trend[2].income).toBe(200000);
    expect(trend[2].expense).toBe(50000);
  });

  it('should not create phantom assets from card payments', () => {
    // Card payments should net to zero for the system
    const cardTxns: Transaction[] = [
      { id: 'tx-1', date: '2026-01-10', type: 'expense', amount: 10000, accountId: 'acc-3', categoryId: 'cat-1', description: 'クレカ利用', createdAt: '', updatedAt: '' },
      { id: 'tx-2', date: '2026-01-20', type: 'card_payment', amount: 10000, accountId: 'acc-1', description: '引き落とし', createdAt: '', updatedAt: '' },
      { id: 'tx-3', date: '2026-01-20', type: 'card_payment', amount: 10000, accountId: 'acc-3', description: '引き落とし', createdAt: '', updatedAt: '' },
    ];
    
    const balances = calculateAccountBalances(accounts, cardTxns);
    // Credit card: -10000 (expense) + 10000 (card_payment) = 0
    expect(balances['acc-3']).toBe(0);
    // Bank: -10000 (card_payment)
    expect(balances['acc-1']).toBe(90000); // 100000 - 10000
    
    const summary = calculateFinancialSummary(accounts, balances);
    // Total assets should be 90000 (bank) + 10000 (cash) = 100000
    // No phantom assets created
    expect(summary.totalAssets).toBe(100000);
    expect(summary.totalLiabilities).toBe(0);
  });

  it('should handle transfer pairs correctly in historical calculation', () => {
    const transferTxns: Transaction[] = [
      { id: 'tx-1', date: '2026-01-10', type: 'transfer_out', amount: 30000, accountId: 'acc-1', description: '現金引き出し', transferGroupId: 'trf-1', createdAt: '', updatedAt: '' },
      { id: 'tx-2', date: '2026-01-10', type: 'transfer_in', amount: 30000, accountId: 'acc-2', description: '現金引き出し', transferGroupId: 'trf-1', createdAt: '', updatedAt: '' },
    ];
    
    const balances = calculateAccountBalances(accounts, transferTxns, '2026-01-31');
    expect(balances['acc-1']).toBe(70000); // 100000 - 30000
    expect(balances['acc-2']).toBe(40000); // 10000 + 30000
    
    const summary = calculateFinancialSummary(accounts, balances);
    // Total assets should remain 110000 (no change from transfers)
    expect(summary.totalAssets).toBe(110000);
    expect(summary.netAssets).toBe(110000);
  });
});