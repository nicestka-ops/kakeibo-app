import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ChevronLeft, ChevronRight, Moon, Sun, Plus, Menu, Cloud, CloudOff, RefreshCw } from 'lucide-react';

interface HeaderProps {
  onOpenTransactionModal: () => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onOpenTransactionModal, onToggleSidebar, sidebarOpen }) => {
  const { selectedYearMonth, setSelectedYearMonth, syncStatus, syncError, syncNow } = useApp();
  const { isDark, toggleTheme } = useTheme();

  const [yearStr, monthStr] = selectedYearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const handlePrevMonth = () => {
    let y = year;
    let m = month - 1;
    if (m < 1) { m = 12; y -= 1; }
    setSelectedYearMonth(`${y}-${String(m).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    let y = year;
    let m = month + 1;
    if (m > 12) { m = 1; y += 1; }
    setSelectedYearMonth(`${y}-${String(m).padStart(2, '0')}`);
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setSelectedYearMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Mobile sidebar toggle */}
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg transition"
            aria-label={sidebarOpen ? 'サイドバーを閉じる' : 'メニューを開く'}
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition"
            aria-label="前月"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleCurrentMonth}
            className="px-2 sm:px-3 py-1 font-bold text-base sm:text-lg text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl transition whitespace-nowrap"
          >
            {year}年 {month}月
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition"
            aria-label="翌月"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {syncStatus !== 'idle' && (
            <button
              onClick={() => void syncNow()}
              title={
                syncStatus === 'syncing'
                  ? 'クラウドと同期中...'
                  : syncStatus === 'error'
                  ? `同期エラー: ${syncError || '再試行'}`
                  : 'クラウド同期済み（クリックで今すぐ同期）'
              }
              className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-medium transition ${
                syncStatus === 'error'
                  ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100'
                  : syncStatus === 'syncing'
                  ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40'
                  : 'text-emerald-600 dark:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              aria-label="同期ステータス"
            >
              {syncStatus === 'syncing' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : syncStatus === 'error' ? (
                <CloudOff className="w-4 h-4" />
              ) : (
                <Cloud className="w-4 h-4" />
              )}
              <span className="hidden md:inline">
                {syncStatus === 'syncing' ? '同期中' : syncStatus === 'error' ? '同期エラー' : '同期済み'}
              </span>
            </button>
          )}
          <button
            onClick={toggleTheme}
            className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="ダークモード切替"
          >
            {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </button>
          {/* Add transaction button - hidden on mobile (use bottom nav instead) */}
          <button
            onClick={onOpenTransactionModal}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md shadow-emerald-600/20 transition transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>取引を記録</span>
          </button>
        </div>
      </div>
    </header>
  );
};
