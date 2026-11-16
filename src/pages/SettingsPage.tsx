import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { ACCENT_COLOR_PRESETS, useTheme } from '@/contexts/ThemeContext';
import { Card } from '@/components/common/Card';
import { exportTransactionsCSV, importTransactionsCSV } from '@/services/migration/csvImporter';
import { calculateCardBillingSummary } from '@/services/calculation/cardBilling';
import { SYNC_SETUP_SQL } from '@/services/sync/cloudSync';
import { Moon, Sun, Monitor, Download, Upload, RefreshCw, ShieldCheck, Database, Palette, Bell, Key, Trash2, LogIn, LogOut, User as UserIcon, Cloud, CloudOff, CreditCard, Check } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const {
    transactions,
    accounts,
    categories,
    resetToDefaultData,
    importTransactionsBatch,
    updateAccount,
    syncStatus,
    lastSyncedAt,
    syncError,
    syncMissingTable,
    syncNow,
    migratePayPayExpensesToMastercard,
  } = useApp();
  const {
    user,
    loading: authLoading,
    isConfigured,
    isEnvConfigured,
    configuredUrl,
    authError,
    signInWithGoogle,
    signOut,
    saveSupabaseConfig,
    resetSupabaseConfig,
    clearAuthError,
  } = useAuth();
  const { theme, setTheme, accentColor, setAccentColor } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [supabaseUrlInput, setSupabaseUrlInput] = useState(configuredUrl || '');
  const [supabaseAnonKeyInput, setSupabaseAnonKeyInput] = useState('');

  const creditCards = accounts.filter((a) => a.type === 'credit_card' && a.isActive);
  const paymentSourceAccounts = accounts.filter((a) => a.type !== 'credit_card' && a.isActive);
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [cardPaymentAccountId, setCardPaymentAccountId] = useState<string>('');
  const [cardClosingDay, setCardClosingDay] = useState<number>(31);
  const [cardPaymentDay, setCardPaymentDay] = useState<number>(28);
  const [cardMonthOffset, setCardMonthOffset] = useState<number>(1);
  const [cardAutoDebit, setCardAutoDebit] = useState<boolean>(true);
  const [cardSavedToast, setCardSavedToast] = useState<boolean>(false);

  const activeCard =
    creditCards.find((c) => c.id === selectedCardId) || creditCards[0] || null;

  useEffect(() => {
    if (!activeCard) return;
    setSelectedCardId(activeCard.id);
    setCardPaymentAccountId(activeCard.paymentAccountId || '');
    setCardClosingDay(activeCard.closingDay ?? 31);
    setCardPaymentDay(activeCard.paymentDay ?? 28);
    setCardMonthOffset(activeCard.paymentMonthOffset ?? 1);
    setCardAutoDebit(activeCard.autoDebitEnabled ?? true);
  }, [activeCard?.id]);

  const handleSaveCardBillingSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCard) return;
    updateAccount(activeCard.id, {
      paymentAccountId: cardPaymentAccountId || undefined,
      closingDay: cardClosingDay,
      paymentDay: cardPaymentDay,
      paymentMonthOffset: cardMonthOffset,
      autoDebitEnabled: cardAutoDebit,
    });
    setCardSavedToast(true);
    window.setTimeout(() => setCardSavedToast(false), 2500);
  };

  const cardBillingPreview = activeCard
    ? calculateCardBillingSummary(
        {
          ...activeCard,
          paymentAccountId: cardPaymentAccountId || undefined,
          closingDay: cardClosingDay,
          paymentDay: cardPaymentDay,
          paymentMonthOffset: cardMonthOffset,
          autoDebitEnabled: cardAutoDebit,
        },
        transactions,
        undefined,
        new Map(categories.map((c) => [c.id, c.name]))
      )
    : null;

  const handleSaveSupabaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseUrlInput.trim() || !supabaseAnonKeyInput.trim()) return;
    saveSupabaseConfig(supabaseUrlInput, supabaseAnonKeyInput);
    setSupabaseAnonKeyInput('');
  };

  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const handleExportCSV = () => {
    const csvContent = exportTransactionsCSV(transactions, accountMap, categoryMap);
    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kakeibo_transactions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const accReverseMap = new Map(accounts.map((a) => [a.name, a.id]));
      const catReverseMap = new Map(categories.map((c) => [c.name, c.id]));

      const result = importTransactionsCSV(text, accReverseMap, catReverseMap);
      if (result.success && result.data.length > 0) {
        const { addedCount, skippedCount } = importTransactionsBatch(
          result.data,
          result.createdAccounts,
          result.createdCategories
        );
        const notes: string[] = [];
        if (skippedCount > 0) {
          notes.push(`重複データ ${skippedCount} 件をスキップしました`);
        }
        if (result.createdAccounts && result.createdAccounts.length > 0) {
          notes.push(`決済手段 ${result.createdAccounts.length} 件を自動追加しました`);
        }
        if (result.createdCategories && result.createdCategories.length > 0) {
          notes.push(`カテゴリー ${result.createdCategories.length} 件を自動追加しました`);
        }
        if (result.errors.length > 0) {
          notes.push(`スキップ/警告 ${result.errors.length} 件:\n${result.errors.slice(0, 5).join('\n')}`);
        }
        alert(
          `${addedCount} 件の取引データを正常にインポートしました。` +
            (notes.length > 0 ? `\n\n${notes.join('\n')}` : '')
        );
      } else {
        alert(`インポートに失敗しました:\n${result.errors.join('\n')}`);
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const handleReset = () => {
    if (confirm('現在のデータをリセットして初期状態（空）に戻しますか？\nこの操作は元に戻せません。')) {
      resetToDefaultData();
      alert('初期状態（空）にリセットしました。');
    }
  };

  const handleClearAll = () => {
    if (confirm('すべてのデータを完全に削除しますか？\nこの操作は元に戻せません。')) {
      if (confirm('本当に削除しますか？バックアップを取ってから実行してください。')) {
        localStorage.clear();
        location.reload();
      }
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn max-w-4xl px-1 sm:px-0">
      {/* Appearance Settings */}
      <Card title="外観・テーマカラー設定">
        <p className="text-xs text-slate-400 mb-4">画面のカラーモードとテーマカラーを選択できます</p>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setTheme('light')}
            className={`p-3.5 rounded-2xl border text-center transition flex flex-col items-center gap-2 ${
              theme === 'light'
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Sun className="w-5 h-5 text-amber-500" />
            <span className="text-xs font-bold">ライトモード</span>
          </button>

          <button
            onClick={() => setTheme('dark')}
            className={`p-3.5 rounded-2xl border text-center transition flex flex-col items-center gap-2 ${
              theme === 'dark'
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Moon className="w-5 h-5 text-indigo-400" />
            <span className="text-xs font-bold">ダークモード</span>
          </button>

          <button
            onClick={() => setTheme('system')}
            className={`p-3.5 rounded-2xl border text-center transition flex flex-col items-center gap-2 ${
              theme === 'system'
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Monitor className="w-5 h-5 text-slate-500" />
            <span className="text-xs font-bold">端末に合わせる</span>
          </button>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <Palette className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">テーマカラー</span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {ACCENT_COLOR_PRESETS.map((preset) => {
              const selected = accentColor === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setAccentColor(preset.id)}
                  className={`p-2 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
                    selected
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white shadow-sm"
                    style={{ backgroundColor: preset.swatchHex }}
                  >
                    {selected && <Check className="w-3.5 h-3.5" />}
                  </span>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    {preset.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Credit Card Billing Settings */}
      <Card title="クレジットカード引き落とし設定">
        <p className="text-xs text-slate-400 mb-4">
          締め日・引き落とし日・引き落とし先口座を設定します。引き落とし日前の利用分（先月分＋今月分）を未払いとして自動計算し、引き落とし日以降は自動で引き落とし先口座から減算します。
        </p>

        {creditCards.length === 0 ? (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            クレジットカード種別の口座がまだありません。「口座管理」からクレジットカード口座を追加するか、CSVインポート後に設定できます。
          </div>
        ) : (
          <form onSubmit={handleSaveCardBillingSettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  対象クレジットカード
                </label>
                <div className="relative">
                  <select
                    value={activeCard?.id || ''}
                    onChange={(e) => setSelectedCardId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  >
                    {creditCards.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  引き落とし先口座
                </label>
                <select
                  value={cardPaymentAccountId}
                  onChange={(e) => setCardPaymentAccountId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                >
                  <option value="">（未設定 / 自動引き落とししない）</option>
                  {paymentSourceAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  締め日
                </label>
                <select
                  value={cardClosingDay}
                  onChange={(e) => setCardClosingDay(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                >
                  <option value={31}>末日（1日〜末日利用）</option>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      毎月 {d} 日締め
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  引き落とし月
                </label>
                <select
                  value={cardMonthOffset}
                  onChange={(e) => setCardMonthOffset(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                >
                  <option value={0}>当月</option>
                  <option value={1}>翌月</option>
                  <option value={2}>翌々月</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  引き落とし日
                </label>
                <select
                  value={cardPaymentDay}
                  onChange={(e) => setCardPaymentDay(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      毎月 {d} 日
                    </option>
                  ))}
                  <option value={31}>末日</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 text-emerald-500" />
                <div>
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    引き落とし日の自動反映を有効にする
                  </div>
                  <div className="text-[11px] text-slate-400">
                    引き落とし日を過ぎた締め分を自動で銀行残高から引き落とします
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={cardAutoDebit}
                onChange={(e) => setCardAutoDebit(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 rounded"
              />
            </div>

            {cardBillingPreview && (
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/50 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    未払い残高（引き落とし前合計）
                  </span>
                  <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-300">
                    ¥{cardBillingPreview.unpaidTotal.toLocaleString()}
                  </span>
                </div>
                {cardBillingPreview.nextDebitDate ? (
                  <div className="text-xs text-slate-600 dark:text-slate-300 flex flex-wrap items-center justify-between gap-2">
                    <span>
                      次回引き落とし予定（{cardBillingPreview.nextDebitDate}）
                    </span>
                    <span className="font-bold">
                      ¥{cardBillingPreview.nextDebitAmount.toLocaleString()}
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    現在未払いの引き落とし予定はありません
                  </div>
                )}
                {cardBillingPreview.unpaidCycles.length > 0 && (
                  <div className="pt-1.5 border-t border-emerald-200/50 dark:border-emerald-900/40 space-y-1">
                    {cardBillingPreview.unpaidCycles.map((c) => (
                      <div
                        key={c.closingYm}
                        className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400"
                      >
                        <span>
                          {c.closingYm} 利用分 → {c.debitDate} 引き落とし予定
                        </span>
                        <span className="font-semibold">¥{c.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              {cardSavedToast && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  設定を保存しました
                </span>
              )}
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition"
              >
                引き落とし設定を保存
              </button>
            </div>
          </form>
        )}
      </Card>

      {/* Cloud Sync */}
      <Card title="クラウド同期（アカウント間同期）">
        <p className="text-xs text-slate-400 mb-4">
          同じ Google アカウントでログインした PC・スマホ間で自動的に家計簿データを同期します。
        </p>
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                syncStatus === 'error'
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {syncStatus === 'error' ? (
                <CloudOff className="w-5 h-5" />
              ) : (
                <Cloud className="w-5 h-5" />
              )}
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                {syncStatus === 'syncing'
                  ? '同期中...'
                  : syncStatus === 'error'
                  ? '同期エラー'
                  : syncStatus === 'synced'
                  ? '同期済み'
                  : '未同期'}
              </h4>
              <p className="text-xs text-slate-400">
                {lastSyncedAt
                  ? `最終同期: ${new Date(lastSyncedAt).toLocaleString('ja-JP')}`
                  : 'ログイン中のアカウントと同期します'}
              </p>
            </div>
          </div>
          <button
            onClick={() => void syncNow()}
            disabled={syncStatus === 'syncing'}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl shadow-sm hover:bg-slate-50 disabled:opacity-50 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            <span>今すぐ同期</span>
          </button>
        </div>

        {syncError && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 space-y-2">
            <p className="font-bold">{syncError}</p>
            {syncMissingTable && (
              <div className="space-y-1.5">
                <p>Supabase の SQL Editor で以下の SQL を一度だけ実行してください：</p>
                <pre className="p-2 rounded-lg bg-slate-900 text-slate-100 overflow-x-auto text-[11px] leading-relaxed">
                  {SYNC_SETUP_SQL}
                </pre>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Data Management */}
      <Card title="データ管理">
        <p className="text-xs text-slate-400 mb-4">
          取引履歴のバックアップやCSV移行が行えます。データは端末内のLocalStorageに安全に保存されています。
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">CSVエクスポート</h4>
                <p className="text-xs text-slate-400">取引データをCSV形式でダウンロード</p>
              </div>
            </div>
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 text-xs font-bold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl shadow-sm hover:bg-slate-50 transition"
            >
              書き出す
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">CSVインポート</h4>
                <p className="text-xs text-slate-400">Base44や他家計簿のCSVを取り込む</p>
              </div>
            </div>
            <input type="file" ref={fileInputRef} accept=".csv" onChange={handleImportCSV} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 text-xs font-bold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl shadow-sm hover:bg-slate-50 transition"
            >
              読み込む
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  PayPay銀行の支出をクレカへ一括修正
                </h4>
                <p className="text-xs text-slate-400">
                  PayPay銀行の支出のみ Amazon Prime Mastercard（クレジットカード）へ移動します（収入は銀行のまま維持）
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const count = migratePayPayExpensesToMastercard();
                if (count > 0) {
                  alert(`${count} 件の支出データを Amazon Prime Mastercard へ修正しました。`);
                } else {
                  alert('修正対象の「PayPay銀行の支出」データはありませんでした。');
                }
              }}
              className="px-3.5 py-2 text-xs font-bold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl shadow-sm hover:bg-slate-50 transition whitespace-nowrap"
            >
              一括修正
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">初期状態（空）にリセット</h4>
                <p className="text-xs text-slate-400">取引・口座・目標などのデータを空の状態に戻します</p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="px-3.5 py-2 text-xs font-bold bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 border border-slate-200 dark:border-slate-600 rounded-xl shadow-sm hover:bg-slate-50 transition"
            >
              リセット
            </button>
          </div>
        </div>
      </Card>

      {/* Cloud Sync & Google Auth */}
      <Card title="アカウント・クラウド連携（Supabase Auth）">
        <div className="space-y-4">
          {authError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 flex items-center justify-between gap-2">
              <p className="text-xs text-rose-600 dark:text-rose-400">{authError}</p>
              <button
                onClick={clearAuthError}
                className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline shrink-0"
              >
                閉じる
              </button>
            </div>
          )}

          {!isConfigured ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-100">Supabase 接続設定を入力してください</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">未設定</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Supabase プロジェクトの URL と Anon Key を入力すると、このブラウザ上でそのまま Google ログインが利用できるようになります（GitHub Secrets に設定すれば全端末で入力不要になります）。
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveSupabaseConfig} className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Project URL (`VITE_SUPABASE_URL`)
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://xxxxxxxxxxxx.supabase.co"
                    value={supabaseUrlInput}
                    onChange={(e) => setSupabaseUrlInput(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Anon Public Key (`VITE_SUPABASE_ANON_KEY`)
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={supabaseAnonKeyInput}
                    onChange={(e) => setSupabaseAnonKeyInput(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition"
                >
                  接続設定を保存して有効化
                </button>
              </form>
            </div>
          ) : authLoading ? (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-400">
              認証状態を確認中...
            </div>
          ) : user ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/50">
              <div className="flex items-center gap-3.5 min-w-0">
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt={user.user_metadata?.full_name || 'Google アバター'}
                    className="w-11 h-11 rounded-full object-cover border border-emerald-200 dark:border-emerald-800 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <UserIcon className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                      {user.user_metadata?.full_name || user.user_metadata?.name || 'Google ユーザー'}
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                      ログイン中
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {user.email}
                  </p>
                </div>
              </div>
              <button
                onClick={signOut}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition shrink-0"
              >
                <LogOut className="w-4 h-4" />
                <span>ログアウト</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-100">Google アカウントでログイン</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">未ログイン</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Supabase Auth を使用して Google アカウントでサインインできます（家計簿データは引き続き端末の LocalStorage にも保存されます）。
                  </p>
                </div>
              </div>
              <button
                onClick={signInWithGoogle}
                className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition shrink-0"
              >
                <LogIn className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Google でログイン</span>
              </button>
            </div>
          )}

          {isConfigured && !isEnvConfigured && (
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span className="truncate">接続先: {configuredUrl}</span>
              <button
                onClick={resetSupabaseConfig}
                className="text-rose-500 hover:underline font-semibold shrink-0 ml-2"
              >
                接続設定を解除
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* Advanced Settings */}
      <Card title="詳細設定">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">カスタムテーマカラー</h4>
                <p className="text-xs text-slate-400">アクセントカラーを変更（準備中）</p>
              </div>
            </div>
            <span className="text-xs text-slate-400">近日対応</span>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">通知設定</h4>
                <p className="text-xs text-slate-400">支出予定のリマインド等（準備中）</p>
              </div>
            </div>
            <span className="text-xs text-slate-400">近日対応</span>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">パスワードロック</h4>
                <p className="text-xs text-slate-400">アプリ起動時の認証（準備中）</p>
              </div>
            </div>
            <span className="text-xs text-slate-400">近日対応</span>
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card title="危険な操作">
        <button
          onClick={() => setShowDangerZone(!showDangerZone)}
          className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-rose-700 dark:text-rose-300">すべてのデータを削除</h4>
              <p className="text-xs text-rose-500 dark:text-rose-400">LocalStorageを完全にクリアします</p>
            </div>
          </div>
          <span className="text-xs font-bold text-rose-500 dark:text-rose-400">注意</span>
        </button>

        {showDangerZone && (
          <div className="mt-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 animate-fadeIn">
            <p className="text-xs text-rose-600 dark:text-rose-400 mb-3">
              この操作は元に戻せません。必ずCSVエクスポートでバックアップを取ってから実行してください。
            </p>
            <button
              onClick={handleClearAll}
              className="w-full py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition"
            >
              完全に削除する
            </button>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>お客様の家計簿データやCSVファイルがGitHub等に公開されることは一切ありません。</span>
        </div>
      </Card>
    </div>
  );
};
