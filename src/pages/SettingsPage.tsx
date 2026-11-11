import React, { useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Card } from '@/components/common/Card';
import { exportTransactionsCSV, importTransactionsCSV } from '@/services/migration/csvImporter';
import { Moon, Sun, Monitor, Download, Upload, RefreshCw, ShieldCheck, Database } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { transactions, accounts, categories, resetToDefaultData, addTransaction } = useApp();
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        let count = 0;
        for (const item of result.data) {
          addTransaction(item);
          count++;
        }
        alert(`${count} 件の取引データを正常にインポートしました。`);
      } else {
        alert(`インポートに失敗しました:\n${result.errors.join('\n')}`);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl">
      <Card title="外観設定">
        <p className="text-xs text-slate-400 mb-4">画面のカラーテーマを選択できます</p>
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
      </Card>

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
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">初期サンプルデータに戻す</h4>
                <p className="text-xs text-slate-400">データを初期状態にリセットします</p>
              </div>
            </div>
            <button
              onClick={() => {
                if (confirm('現在のデータをリセットして初期サンプルに戻しますか？')) {
                  resetToDefaultData();
                  alert('初期サンプルデータにリセットしました。');
                }
              }}
              className="px-3.5 py-2 text-xs font-bold bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 border border-slate-200 dark:border-slate-600 rounded-xl shadow-sm hover:bg-slate-50 transition"
            >
              リセット
            </button>
          </div>
        </div>
      </Card>

      <Card title="クラウド同期（Supabase）">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-800 dark:text-slate-100">Local-First モードで動作中（無料・オフライン対応）</span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">ACTIVE</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              現在、無料かつ完全にプライベートなローカルストレージで動作しています。将来的に複数デバイスで同期を行う場合は、Supabase（無料プラン）の接続情報を設定することで即座にクラウド同期へ切り替え可能です。
            </p>
          </div>
        </div>
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
