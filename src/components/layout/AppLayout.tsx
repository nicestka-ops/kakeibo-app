import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from '@/components/common/Header';
import { Sidebar } from '@/components/common/Sidebar';
import { BottomNav } from '@/components/common/BottomNav';
import { TransactionFormModal } from '@/components/forms/TransactionFormModal';
import { PlannedExpenseModal } from '@/components/forms/PlannedExpenseModal';
import { TrendingDown, TrendingUp, ArrowLeftRight, CalendarClock, X } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const [isRegisterSheetOpen, setIsRegisterSheetOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txInitialType, setTxInitialType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [isPlannedModalOpen, setIsPlannedModalOpen] = useState(false);
  const [plannedInitialDate, setPlannedInitialDate] = useState<string | undefined>(undefined);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
    // 動画の画面遷移時スピナー演出
    setIsRouteLoading(true);
    const timer = window.setTimeout(() => setIsRouteLoading(false), 140);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  useEffect(() => {
    const handleOpenPlanned = (e: Event) => {
      const detail = (e as CustomEvent<{ date?: string }>).detail;
      setPlannedInitialDate(detail?.date);
      setIsPlannedModalOpen(true);
    };
    const handleOpenTx = (e: Event) => {
      const detail = (e as CustomEvent<{ type?: 'expense' | 'income' | 'transfer' }>).detail;
      setTxInitialType(detail?.type || 'expense');
      setIsTxModalOpen(true);
    };
    window.addEventListener('kakeibo:open-planned-modal', handleOpenPlanned);
    window.addEventListener('kakeibo:open-tx-modal', handleOpenTx);
    return () => {
      window.removeEventListener('kakeibo:open-planned-modal', handleOpenPlanned);
      window.removeEventListener('kakeibo:open-tx-modal', handleOpenTx);
    };
  }, []);

  const openTxWithType = (t: 'expense' | 'income' | 'transfer') => {
    setIsRegisterSheetOpen(false);
    setTxInitialType(t);
    setIsTxModalOpen(true);
  };

  const openPlanned = () => {
    setIsRegisterSheetOpen(false);
    setPlannedInitialDate(undefined);
    setIsPlannedModalOpen(true);
  };

  return (
    <div className="flex min-h-screen bg-[#F5F6FA] dark:bg-slate-950 overflow-x-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - Desktop: always visible */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Desktop Header */}
        <div className="hidden md:block">
          <Header
            onOpenTransactionModal={() => setIsRegisterSheetOpen(true)}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            sidebarOpen={sidebarOpen}
          />
        </div>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-3 md:pt-5 pb-24 md:pb-10">
          <div className="max-w-3xl lg:max-w-5xl mx-auto w-full">
            {isRouteLoading ? (
              <div className="flex items-center justify-center py-28">
                <div className="w-7 h-7 rounded-full border-[3px] border-primary-200 border-t-primary-600 animate-spin" />
              </div>
            ) : (
              <Outlet />
            )}
          </div>
        </main>

        <BottomNav onOpenTransactionModal={() => setIsRegisterSheetOpen(true)} />
      </div>

      {/* 「登録する」ボトムシート */}
      {isRegisterSheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fadeIn p-0 sm:p-4"
          onClick={() => setIsRegisterSheetOpen(false)}
        >
          <div
            className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-5 pb-8 sm:pb-5 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-50">
                登録する
              </h2>
              <button
                type="button"
                onClick={() => setIsRegisterSheetOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                aria-label="閉じる"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => openTxWithType('expense')}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[0.99] transition text-left"
              >
                <div className="w-11 h-11 rounded-2xl bg-pink-100 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">支出</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    実際に使ったお金を記録
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => openTxWithType('income')}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[0.99] transition text-left"
              >
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">収入</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    入ってきたお金を記録
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => openTxWithType('transfer')}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[0.99] transition text-left"
              >
                <div className="w-11 h-11 rounded-2xl bg-primary-100 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">口座間振替</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    口座・現金間の移動を記録
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={openPlanned}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[0.99] transition text-left"
              >
                <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <CalendarClock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">支出予定</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    これから支払う予定を登録
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      <TransactionFormModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        initialType={txInitialType}
      />

      <PlannedExpenseModal
        isOpen={isPlannedModalOpen}
        onClose={() => setIsPlannedModalOpen(false)}
        initialDate={plannedInitialDate}
      />
    </div>
  );
};
