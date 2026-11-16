import { describe, it, expect } from 'vitest';
import {
  buildTransactionDuplicateKey,
  exportTransactionsCSV,
  importTransactionsCSV,
} from './csvImporter';
import { Transaction } from '@/types';

describe('csvImporter', () => {
  it('Googleフォーム互換の7列フォーマットでエクスポート・再インポートできる', () => {
    const accountMap = new Map<string, string>([
      ['acc-bank', 'PayPay銀行'],
      ['acc-cash', '現金'],
    ]);
    const categoryMap = new Map<string, string>([
      ['cat-food', '食費'],
      ['cat-salary', '給料'],
    ]);

    const txs: Transaction[] = [
      {
        id: 'tx-1',
        date: '2026-11-15',
        timestamp: '2026-11-15T10:00:00.000Z',
        type: 'income',
        amount: 9200,
        accountId: 'acc-cash',
        categoryId: 'cat-salary',
        description: '英検バイト',
        createdAt: '2026-11-15T10:00:00.000Z',
        updatedAt: '2026-11-15T10:00:00.000Z',
      },
      {
        id: 'tx-2',
        date: '2026-11-15',
        timestamp: '2026-11-15T11:00:00.000Z',
        type: 'card_payment',
        amount: 16119,
        accountId: 'acc-bank',
        description: 'カード引き落とし（自動）',
        createdAt: '2026-11-15T11:00:00.000Z',
        updatedAt: '2026-11-15T11:00:00.000Z',
      },
    ];

    const csv = exportTransactionsCSV(txs, accountMap, categoryMap);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('タイムスタンプ,金額,タイプ,決済手段,カテゴリー,利用日,内容');
    expect(lines).toHaveLength(3);

    const accReverseMap = new Map<string, string>([
      ['PayPay銀行', 'acc-bank'],
      ['現金', 'acc-cash'],
    ]);
    const catReverseMap = new Map<string, string>([
      ['食費', 'cat-food'],
      ['給料', 'cat-salary'],
    ]);

    const imported = importTransactionsCSV(csv, accReverseMap, catReverseMap);
    expect(imported.success).toBe(true);
    expect(imported.errors).toHaveLength(0);
    expect(imported.data).toHaveLength(2);
    expect(imported.data[0].type).toBe('income');
    expect(imported.data[0].amount).toBe(9200);
    expect(imported.data[0].date).toBe('2026-11-15');
    expect(imported.data[1].type).toBe('card_payment');
    expect(imported.data[1].accountId).toBe('acc-bank');
  });

  it('重複判定キーは同一データの重複インポートを検出できる', () => {
    const txA: Transaction = {
      id: 'tx-1',
      date: '2026-11-15',
      timestamp: '2026-11-15T10:00:00.000Z',
      type: 'expense',
      amount: 1200,
      accountId: 'acc-cash',
      description: 'ランチ',
      createdAt: '',
      updatedAt: '',
    };
    const txSame: Transaction = { ...txA, id: 'tx-999' };
    const txDifferentTs: Transaction = { ...txA, id: 'tx-2', timestamp: '2026-11-15T12:00:00.000Z' };

    expect(buildTransactionDuplicateKey(txA)).toBe(buildTransactionDuplicateKey(txSame));
    expect(buildTransactionDuplicateKey(txA)).not.toBe(buildTransactionDuplicateKey(txDifferentTs));
  });
});
