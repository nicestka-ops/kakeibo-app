import { Account, Transaction } from '@/types';
import { calculateCardBillingSummary, getTodayDateString } from './cardBilling';

export interface AccountBalanceMap {
  [accountId: string]: number;
}

export interface FinancialSummary {
  totalAssets: number;
  totalLiabilities: number;
  netAssets: number;
}

export interface AssetTrendPoint {
  month: string;
  totalAssets: number;
  totalLiabilities: number;
  netAssets: number;
}

export interface MonthlyCashFlow {
  income: number;
  expense: number;
  netSavings: number;
}

/**
 * 全口座の残高を計算する。
 * - openingBalance を起点に、取引履歴を順に適用する
 * - asOfDate を指定すると、その日付以前の取引のみ対象
 * - transfer は transfer_out（引き落とし）/ transfer_in（入金）の2エントリ方式
 */
export const CASHFLOW_EXCLUDED_CATEGORY_NAMES = new Set(['両替', '調整', '経費']);

export function isExcludedFromCashFlow(
  tx: Transaction,
  categoryNameMap?: Map<string, string>
): boolean {
  if (!tx.categoryId || !categoryNameMap) return false;
  const catName = categoryNameMap.get(tx.categoryId)?.trim();
  return Boolean(catName && CASHFLOW_EXCLUDED_CATEGORY_NAMES.has(catName));
}

export function calculateAccountBalances(
  accounts: Account[],
  transactions: Transaction[],
  asOfDate?: string,
  categoryNameMap?: Map<string, string>
): AccountBalanceMap {
  const balances: AccountBalanceMap = {};

  // 初期残高のセット（口座の開設日が asOfDate より後なら0）
  for (const acc of accounts) {
    if (!asOfDate || acc.openingBalanceDate <= asOfDate) {
      balances[acc.id] = Math.round(acc.openingBalance);
    } else {
      balances[acc.id] = 0;
    }
  }

  // IDの重複を防ぐためセットで管理
  const seenIds = new Set<string>();

  for (const tx of transactions) {
    // 日付フィルタ
    if (asOfDate && tx.date > asOfDate) continue;

    // 同一IDの二重計上を防ぐ
    if (seenIds.has(tx.id)) continue;
    seenIds.add(tx.id);

    const amount = Math.round(Math.abs(tx.amount));
    if (!(tx.accountId in balances)) {
      balances[tx.accountId] = 0;
    }

    switch (tx.type) {
      case 'income':
      case 'adjustment':
      case 'transfer_in':
        balances[tx.accountId] += amount;
        break;

      case 'expense':
      case 'transfer_out':
        balances[tx.accountId] -= amount;
        break;

      // 旧方式 'transfer' は単一エントリ（移動元から引くのみ）。
      // 新規入力では transfer_out/transfer_in を使うため、
      // インポートデータとの後方互換のため残しておく。
      case 'transfer':
        balances[tx.accountId] -= amount;
        break;

      case 'card_payment': {
        // クレジットカード口座への card_payment は残高を増やす（負債を減らす）
        // 銀行口座への card_payment は残高を減らす（引き落とし）
        const acc = accounts.find((a) => a.id === tx.accountId);
        if (acc && acc.type === 'credit_card') {
          balances[tx.accountId] += amount;
        } else {
          balances[tx.accountId] -= amount;
        }
        break;
      }

      default:
        balances[tx.accountId] -= amount;
    }
  }

  // クレジットカードの自動引き落とし反映（引き落とし日到来分をカード負債から減らし、引き落とし先口座から減算）
  const debitReferenceDate = asOfDate || getTodayDateString();
  for (const acc of accounts) {
    if (acc.type !== 'credit_card') continue;
    if (acc.autoDebitEnabled === false || !acc.paymentAccountId) continue;

    const billing = calculateCardBillingSummary(acc, transactions, debitReferenceDate, categoryNameMap);
    if (billing.debitedTotal > 0) {
      balances[acc.id] = (balances[acc.id] ?? 0) + billing.debitedTotal;
      if (acc.paymentAccountId in balances) {
        balances[acc.paymentAccountId] -= billing.debitedTotal;
      }
    }
  }

  return balances;
}

/**
 * 総資産・総負債・純資産を計算する。
 * - クレジットカードの残高が負なら負債として計上
 * - includeInAssets=false の口座は計算対象外
 */
export function calculateFinancialSummary(
  accounts: Account[],
  balances: AccountBalanceMap
): FinancialSummary {
  let totalAssets = 0;
  let totalLiabilities = 0;

  for (const acc of accounts) {
    if (!acc.isActive) continue;
    const balance = balances[acc.id] ?? 0;

    if (acc.type === 'credit_card') {
      if (balance < 0) {
        totalLiabilities += Math.abs(balance);
      } else if (acc.includeInAssets) {
        totalAssets += balance;
      }
    } else {
      if (acc.includeInAssets) {
        if (balance >= 0) {
          totalAssets += balance;
        } else {
          totalLiabilities += Math.abs(balance);
        }
      }
    }
  }

  return {
    totalAssets,
    totalLiabilities,
    netAssets: totalAssets - totalLiabilities,
  };
}

/**
 * 指定月のキャッシュフローを計算する。
 * - transfer_in/out は収入・支出として計上しない（口座間移動）
 * - card_payment も収支に含めない（別途カテゴリ分析で扱う）
 */
export function calculateMonthlyCashFlow(
  transactions: Transaction[],
  yearMonth: string,
  categoryNameMap?: Map<string, string>
): MonthlyCashFlow {
  let income = 0;
  let expense = 0;

  for (const tx of transactions) {
    if (!tx.date.startsWith(yearMonth)) continue;
    if (isExcludedFromCashFlow(tx, categoryNameMap)) continue;
    const amount = Math.round(Math.abs(tx.amount));

    if (tx.type === 'income') {
      income += amount;
    } else if (tx.type === 'expense') {
      expense += amount;
    }
  }

  return {
    income,
    expense,
    netSavings: income - expense,
  };
}

/**
 * 指定月のカテゴリ別支出内訳を返す。
 */
export function calculateCategoryBreakdown(
  transactions: Transaction[],
  yearMonth: string,
  categoryNameMap?: Map<string, string>
): Record<string, number> {
  const breakdown: Record<string, number> = {};

  for (const tx of transactions) {
    if (!tx.date.startsWith(yearMonth) || tx.type !== 'expense') continue;
    if (isExcludedFromCashFlow(tx, categoryNameMap)) continue;
    const catId = tx.categoryId || 'uncategorized';
    const amount = Math.round(Math.abs(tx.amount));
    breakdown[catId] = (breakdown[catId] || 0) + amount;
  }

  return breakdown;
}

/**
 * 過去N ヶ月分の月別収支トレンドを返す。
 */
export function generateMonthlyTrend(
  transactions: Transaction[],
  monthsCount: number = 6,
  categoryNameMap?: Map<string, string>
): Array<{ month: string; income: number; expense: number; balance: number }> {
  const result: Array<{ month: string; income: number; expense: number; balance: number }> = [];
  const now = new Date();

  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const flow = calculateMonthlyCashFlow(transactions, ym, categoryNameMap);
    result.push({
      month: ym,
      income: flow.income,
      expense: flow.expense,
      balance: flow.netSavings,
    });
  }

  return result;
}

/**
 * 過去N ヶ月分の本当の資産推移を返す。
 * 各月末時点での口座残高を再計算し、総資産・総負債・純資産を算出する。
 * - asOfDate として各月末日を指定して calculateAccountBalances を呼ぶ
 * - openingBalanceDate を正しく考慮（口座開設前は残高0）
 * - includeInAssets=false の口座を除外
 * - クレジットカードの負債を正しく計上
 * - 未来の取引を反映しない
 */
export function generateAssetTrend(
  accounts: Account[],
  transactions: Transaction[],
  monthsCount: number = 6,
  categoryNameMap?: Map<string, string>
): AssetTrendPoint[] {
  const result: AssetTrendPoint[] = [];
  const now = new Date();

  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    // 月末日を計算（翌月の1日の前日）
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const asOfDate = `${endOfMonth.getFullYear()}-${String(endOfMonth.getMonth() + 1).padStart(2, '0')}-${String(endOfMonth.getDate()).padStart(2, '0')}`;
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    // 該当月末時点での残高を計算
    const balances = calculateAccountBalances(accounts, transactions, asOfDate, categoryNameMap);
    const summary = calculateFinancialSummary(accounts, balances);

    result.push({
      month: ym,
      totalAssets: summary.totalAssets,
      totalLiabilities: summary.totalLiabilities,
      netAssets: summary.netAssets,
    });
  }

  return result;
}