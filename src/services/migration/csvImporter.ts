import { Transaction } from '@/types';

export interface ImportResult<T> {
  success: boolean;
  data: T[];
  errors: string[];
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
  const result: ImportResult<Transaction> = { success: true, data: [], errors: [] };
  const rows = parseCSVLines(csvText);

  if (rows.length < 2) {
    result.success = false;
    result.errors.push('CSVデータが空かヘッダーのみです');
    return result;
  }

  const header = rows[0].map((h) => h.replace(/^"|"$/g, '').toLowerCase());
  const dateIdx = header.indexOf('date');
  const amountIdx = header.indexOf('amount');
  const typeIdx = header.indexOf('type');
  const accountIdx = header.indexOf('account_name');
  const catIdx = header.indexOf('category_name');
  const descIdx = header.indexOf('description');
  const idIdx = header.indexOf('id');

  if (dateIdx === -1 || amountIdx === -1) {
    result.success = false;
    result.errors.push('必須カラム（date, amount）が見つかりません');
    return result;
  }

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    try {
      const date = row[dateIdx]?.replace(/^"|"$/g, '') || '';
      const amountStr = row[amountIdx]?.replace(/^"|"$/g, '') || '0';
      const amount = Math.round(Number(amountStr));
      const typeStr = (row[typeIdx]?.replace(/^"|"$/g, '') || '').trim();
      const accountName = row[accountIdx]?.replace(/^"|"$/g, '') || '';
      const categoryName = row[catIdx]?.replace(/^"|"$/g, '') || '';
      const description = row[descIdx]?.replace(/^"|"$/g, '') || '';
      const id = row[idIdx]?.replace(/^"|"$/g, '') || `imported-tx-${Date.now()}-${i}`;

      if (!date || isNaN(amount)) {
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
      }

      const accountId = accountMap.get(accountName) || 'acc-1';
      const categoryId = categoryMap.get(categoryName);

      result.data.push({
        id,
        date,
        type,
        amount: Math.abs(amount),
        accountId,
        categoryId,
        description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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