import { Account, AccountType, Category, CategoryKind, Transaction } from '@/types';

export interface ImportResult<T> {
  success: boolean;
  data: T[];
  errors: string[];
  createdAccounts?: Account[];
  createdCategories?: Category[];
}

const CATEGORY_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
  '#f97316',
  '#6366f1',
];

function inferAccountType(name: string): AccountType {
  const lower = name.toLowerCase();
  if (name.includes('銀行') || lower.includes('bank')) return 'bank';
  if (name.includes('現金') || lower.includes('cash')) return 'cash';
  if (name.includes('商品券') || name.includes('ギフト') || lower.includes('gift')) return 'gift_card';
  if (
    name.includes('カード') ||
    name.includes('クレカ') ||
    lower.includes('card') ||
    lower.includes('mastercard') ||
    lower.includes('visa') ||
    lower.includes('jcb') ||
    lower.includes('amex')
  ) {
    return 'credit_card';
  }
  if (name.includes('アプリ') || name.includes('電子マネー') || lower.includes('pay') || lower.includes('wallet')) {
    return 'wallet';
  }
  return 'other';
}

function findHeaderIndex(header: string[], candidates: string[]): number {
  for (const candidate of candidates) {
    const idx = header.indexOf(candidate.toLowerCase());
    if (idx !== -1) return idx;
  }
  return -1;
}

export function parseCSVLines(csvText: string): string[][] {
  const lines: string[][] = [];
  const rows = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);

  for (const row of rows) {
    const cells: string[] = [];
    let currentCell = '';
    let insideQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') {
        if (insideQuotes && row[i + 1] === '"') {
          currentCell += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        cells.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    cells.push(currentCell.trim());
    lines.push(cells);
  }
  return lines;
}

export function importTransactionsCSV(
  csvText: string,
  accountMap: Map<string, string>,
  categoryMap: Map<string, string>
): ImportResult<Transaction> {
  const createdAccounts: Account[] = [];
  const createdCategories: Category[] = [];
  const result: ImportResult<Transaction> = {
    success: true,
    data: [],
    errors: [],
    createdAccounts,
    createdCategories,
  };
  const cleanText = csvText.replace(/^\uFEFF/, '');
  const rows = parseCSVLines(cleanText);

  if (rows.length < 2) {
    result.success = false;
    result.errors.push('CSVデータが空かヘッダーのみです');
    return result;
  }

  const header = rows[0].map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase());
  const dateIdx = findHeaderIndex(header, ['date', '利用日']);
  const timestampIdx = findHeaderIndex(header, ['timestamp', 'タイムスタンプ']);
  const amountIdx = findHeaderIndex(header, ['amount', '金額']);
  const typeIdx = findHeaderIndex(header, ['type', 'タイプ']);
  const accountIdx = findHeaderIndex(header, ['account_name', '決済手段', '口座']);
  const catIdx = findHeaderIndex(header, ['category_name', 'カテゴリー', 'カテゴリ']);
  const descIdx = findHeaderIndex(header, ['description', '内容', 'メモ']);
  const idIdx = findHeaderIndex(header, ['id']);

  if ((dateIdx === -1 && timestampIdx === -1) || amountIdx === -1) {
    result.success = false;
    result.errors.push('必須カラム（date/利用日, amount/金額）が見つかりません');
    return result;
  }

  const localAccountMap = new Map(accountMap);
  const localCategoryMap = new Map(categoryMap);
  const createdCategoryById = new Map<string, Category>();
  const nowIso = new Date().toISOString();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    try {
      const timestamp =
        timestampIdx !== -1 ? (row[timestampIdx]?.replace(/^"|"$/g, '').trim() || '') : '';
      let date = dateIdx !== -1 ? (row[dateIdx]?.replace(/^"|"$/g, '').trim() || '') : '';
      if (!date && timestamp) {
        date = timestamp.slice(0, 10);
      }

      const amountRaw = row[amountIdx]?.replace(/^"|"$/g, '').replace(/,/g, '').trim() || '';
      const amount = Math.round(Number(amountRaw));
      const typeStr = (typeIdx !== -1 ? row[typeIdx]?.replace(/^"|"$/g, '').trim() : '') || '';
      const accountName =
        (accountIdx !== -1 ? row[accountIdx]?.replace(/^"|"$/g, '').trim() : '') || '未分類';
      const categoryName = catIdx !== -1 ? (row[catIdx]?.replace(/^"|"$/g, '').trim() || '') : '';
      const description = descIdx !== -1 ? (row[descIdx]?.replace(/^"|"$/g, '') || '') : '';
      const id =
        (idIdx !== -1 ? row[idIdx]?.replace(/^"|"$/g, '').trim() : '') ||
        `imported-tx-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`;

      if (!date || amountRaw === '' || isNaN(amount)) {
        result.errors.push(`行 ${i + 1}: 日付または金額が無効です`);
        continue;
      }

      let type: Transaction['type'] = 'expense';
      if (typeStr === '収入' || typeStr === 'income') {
        type = 'income';
      } else if (typeStr === '振替' || typeStr === 'transfer') {
        type = 'transfer';
      } else if (typeStr === '引落' || typeStr === 'card_payment') {
        type = 'card_payment';
      } else if (typeStr === '調整' || typeStr === 'adjustment') {
        type = 'adjustment';
      }

      const effectiveAccountName =
        type === 'expense' && accountName === 'PayPay銀行'
          ? 'Amazon Prime Mastercard'
          : accountName;

      let accountId = localAccountMap.get(effectiveAccountName);
      if (!accountId) {
        accountId = `acc-imp-${Date.now()}-${createdAccounts.length + 1}-${Math.random().toString(36).slice(2, 6)}`;
        const accType = inferAccountType(effectiveAccountName);
        const payPayBankId =
          accType === 'credit_card' ? localAccountMap.get('PayPay銀行') : undefined;
        const newAcc: Account = {
          id: accountId,
          name: effectiveAccountName,
          type: accType,
          openingBalance: 0,
          openingBalanceDate: date,
          includeInAssets: accType !== 'credit_card',
          ...(accType === 'credit_card'
            ? {
                paymentAccountId: payPayBankId,
                closingDay: 31,
                paymentDay: 28,
                paymentMonthOffset: 1,
                autoDebitEnabled: true,
              }
            : {}),
          sortOrder: localAccountMap.size + 1,
          isActive: true,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        localAccountMap.set(effectiveAccountName, accountId);
        createdAccounts.push(newAcc);
      }

      let categoryId: string | undefined;
      if (categoryName) {
        categoryId = localCategoryMap.get(categoryName);
        const rowKind: CategoryKind = type === 'income' ? 'income' : 'expense';
        if (!categoryId) {
          categoryId = `cat-imp-${Date.now()}-${createdCategories.length + 1}-${Math.random().toString(36).slice(2, 6)}`;
          const newCat: Category = {
            id: categoryId,
            name: categoryName,
            kind: rowKind,
            icon: 'Tag',
            color: CATEGORY_COLORS[createdCategories.length % CATEGORY_COLORS.length],
            sortOrder: localCategoryMap.size + 1,
            isActive: true,
          };
          localCategoryMap.set(categoryName, categoryId);
          createdCategories.push(newCat);
          createdCategoryById.set(categoryId, newCat);
        } else {
          const createdCat = createdCategoryById.get(categoryId);
          if (createdCat && createdCat.kind !== 'both' && createdCat.kind !== rowKind) {
            createdCat.kind = 'both';
          }
        }
      }

      result.data.push({
        id,
        date,
        timestamp: timestamp || undefined,
        type,
        amount: Math.abs(amount),
        accountId,
        categoryId,
        description,
        createdAt: timestamp || nowIso,
        updatedAt: timestamp || nowIso,
      });
    } catch (err: unknown) {
      result.errors.push(`行 ${i + 1} の処理中にエラー: ${(err as Error).message}`);
    }
  }

  return result;
}

export function exportTransactionsCSV(
  transactions: Transaction[],
  accountMap: Map<string, string>,
  categoryMap: Map<string, string>
): string {
  const header = ['date', 'type', 'amount', 'account_name', 'category_name', 'description', 'id'];
  const lines = [header.join(',')];

  for (const tx of transactions) {
    const accName = accountMap.get(tx.accountId) || '';
    const catName = tx.categoryId ? categoryMap.get(tx.categoryId) || '' : '';
    const line = [
      `"${tx.date}"`,
      `"${tx.type}"`,
      tx.amount,
      `"${accName.replace(/"/g, '""')}"`,
      `"${catName.replace(/"/g, '""')}"`,
      `"${tx.description.replace(/"/g, '""')}"`,
      `"${tx.id}"`,
    ];
    lines.push(line.join(','));
  }

  return lines.join('\n');
}