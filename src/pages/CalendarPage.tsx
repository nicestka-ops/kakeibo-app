import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { fetchDuologEvents, eventSpansDay, type DuologEvent } from '@/services/duologClient';
import { isExcludedFromCashFlow, isExchangeCategory } from '@/services/calculation/balanceEngine';
import {
  getMonthlyPlannedExpenses,
  getNextYearMonth,
  getPreviousYearMonth,
} from '@/services/calculation/forecast';
import { ChevronLeft, ChevronRight, Plus, Info, X, CheckCircle2, Trash2 } from 'lucide-react';

export const CalendarPage: React.FC = () => {
  const {
    transactions,
    categories,
    accounts,
    plannedExpenses,
    monthlyCashFlow,
    selectedYearMonth,
    setSelectedYearMonth,
    updatePlannedExpense,
    deletePlannedExpense,
  } = useApp();

  const [yearStr, monthStr] = selectedYearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const [searchParams] = useSearchParams();
  const initialDateParam = searchParams.get('date');

  const [selectedDay, setSelectedDay] = useState<string>(() => {
    if (initialDateParam && /^\d{4}-\d{2}-\d{2}$/.test(initialDateParam)) return initialDateParam;
    const today = new Date().toISOString().split('T')[0];
    return today.startsWith(selectedYearMonth) ? today : `${selectedYearMonth}-01`;
  });
  const [duologEvents, setDuologEvents] = useState<DuologEvent[]>([]);

  useEffect(() => {
    fetchDuologEvents().then(setDuologEvents);
  }, []);

  useEffect(() => {
    if (initialDateParam && /^\d{4}-\d{2}-\d{2}$/.test(initialDateParam)) {
      setSelectedYearMonth(initialDateParam.slice(0, 7));
      setSelectedDay(initialDateParam);
      setIsDetailModalOpen(true);
    }
  }, [initialDateParam, setSelectedYearMonth]);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [showPlannedBreakdown, setShowPlannedBreakdown] = useState(false);

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const categoryNameMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const plannedSummary = useMemo(
    () => getMonthlyPlannedExpenses(plannedExpenses, selectedYearMonth),
    [plannedExpenses, selectedYearMonth]
  );

  const nextYm = getNextYearMonth(selectedYearMonth);
  const nextMonthPlanned = useMemo(
    () => getMonthlyPlannedExpenses(plannedExpenses, nextYm),
    [plannedExpenses, nextYm]
  );

  const totalForecast = monthlyCashFlow.expense + plannedSummary.total;

  // 日別集計
  const dailyMap = useMemo(() => {
    const map = new Map<string, { expense: number; planned: number }>();
    for (const tx of transactions) {
      if (!tx.date.startsWith(selectedYearMonth)) continue;
      if (isExcludedFromCashFlow(tx, categoryNameMap)) continue;
      const amt = Math.round(Math.abs(tx.amount));
      const entry = map.get(tx.date) || { expense: 0, planned: 0 };
      if (tx.type === 'expense') {
        entry.expense += amt;
      } else if (tx.type === 'income' && isExchangeCategory(tx, categoryNameMap)) {
        entry.expense -= amt;
      }
      map.set(tx.date, entry);
    }
    for (const p of plannedExpenses) {
      if (p.isCompleted || p.kind === 'income' || !p.dueDate.startsWith(selectedYearMonth)) continue;
      const entry = map.get(p.dueDate) || { expense: 0, planned: 0 };
      entry.planned += Math.round(Math.abs(p.amount));
      map.set(p.dueDate, entry);
    }
    return map;
  }, [transactions, plannedExpenses, selectedYearMonth, categoryNameMap]);

  const calendarCells = useMemo(() => {
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells: Array<{ day: number | null; dateStr: string }> = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({ day: null, dateStr: `empty-${i}` });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        day: d,
        dateStr: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      });
    }
    return cells;
  }, [year, month]);

  const selectedDayTransactions = useMemo(
    () => transactions.filter((tx) => tx.date === selectedDay),
    [transactions, selectedDay]
  );

  const selectedDayPlanned = useMemo(
    () => plannedExpenses.filter((p) => p.dueDate === selectedDay),
    [plannedExpenses, selectedDay]
  );

  const selectedDayDuologEvents = useMemo(
    () => duologEvents.filter((ev) => eventSpansDay(ev, selectedDay)),
    [duologEvents, selectedDay]
  );

  const handleJumpToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedYearMonth(today.slice(0, 7));
    setSelectedDay(today);
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
          カレンダー
        </h1>
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent('kakeibo:open-planned-modal', { detail: { date: selectedDay } })
            )
          }
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 text-xs font-bold hover:bg-primary-100 active:scale-95 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>予定を追加</span>
        </button>
      </div>

      {/* Monthly Forecast Card */}
      <div className="rounded-3xl p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">
            📅 {year}年{month}月の支出予測
          </span>
          <span className="text-[10px] font-bold text-slate-400">実績＋予定</span>
        </div>

        <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 tabular-nums">
          ¥{totalForecast.toLocaleString()}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="rounded-2xl p-2.5 bg-pink-50/70 dark:bg-pink-950/30">
            <p className="text-[10px] text-slate-500">実績支出</p>
            <p className="text-sm font-extrabold text-pink-600 dark:text-pink-400 tabular-nums mt-0.5">
              {monthlyCashFlow.expense.toLocaleString()} 円
            </p>
          </div>
          <div className="rounded-2xl p-2.5 bg-amber-50/70 dark:bg-amber-950/30">
            <p className="text-[10px] text-slate-500">
              未完了の予定（{plannedSummary.items.length}件）
            </p>
            <p className="text-sm font-extrabold text-amber-600 dark:text-amber-400 tabular-nums mt-0.5">
              {plannedSummary.total.toLocaleString()} 円
            </p>
          </div>
        </div>

        {plannedSummary.items.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowPlannedBreakdown((prev) => !prev)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-primary-600 dark:text-primary-400"
            >
              <Info className="w-3.5 h-3.5" />
              <span>予定の内訳を見る</span>
            </button>
            {showPlannedBreakdown && (
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 animate-fadeIn">
                {plannedSummary.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300">
                      {item.dueDate.slice(5).replace('-', '/')} {item.description}
                    </span>
                    <span className="font-bold text-amber-600 tabular-nums">
                      {item.amount.toLocaleString()} 円
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
          <span className="text-slate-400">
            {nextYm.replace('-', '年')}月の予測（登録済み予定のみ）
          </span>
          <span className="font-bold text-amber-600 tabular-nums">
            {nextMonthPlanned.total.toLocaleString()} 円
          </span>
        </div>
      </div>

      {/* Calendar Card */}
      <div className="rounded-3xl p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSelectedYearMonth(getPreviousYearMonth(selectedYearMonth))}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="前月"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
              {year}年{month}月
            </p>
            <button
              type="button"
              onClick={handleJumpToday}
              className="text-[10px] font-bold text-primary-600 dark:text-primary-400"
            >
              今日
            </button>
          </div>
          <button
            type="button"
            onClick={() => setSelectedYearMonth(getNextYearMonth(selectedYearMonth))}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="翌月"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Weekdays */}
        <div className="grid grid-cols-7 text-center text-[11px] font-bold pb-1">
          {['日', '月', '火', '水', '木', '金', '土'].map((w, idx) => (
            <div
              key={w}
              className={
                idx === 0
                  ? 'text-rose-500'
                  : idx === 6
                  ? 'text-primary-500'
                  : 'text-slate-400'
              }
            >
              {w}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-y-1.5">
          {calendarCells.map((cell) => {
            if (cell.day === null) {
              return <div key={cell.dateStr} className="h-14" />;
            }
            const info = dailyMap.get(cell.dateStr);
            const isSelected = selectedDay === cell.dateStr;
            const dayOfWeek = new Date(cell.dateStr).getDay();

            return (
              <button
                key={cell.dateStr}
                type="button"
                onClick={() => {
                  setSelectedDay(cell.dateStr);
                  setIsDetailModalOpen(true);
                }}
                className="h-14 flex flex-col items-center justify-start pt-1 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                    isSelected
                      ? 'bg-primary-600 text-white shadow-sm'
                      : dayOfWeek === 0
                      ? 'text-rose-500'
                      : dayOfWeek === 6
                      ? 'text-primary-500'
                      : 'text-slate-800 dark:text-slate-100'
                  }`}
                >
                  {cell.day}
                </span>
                {info && info.expense > 0 && (
                  <span className="text-[9px] font-bold text-pink-500 tabular-nums leading-tight mt-0.5 truncate max-w-full px-0.5">
                    {info.expense.toLocaleString()}
                  </span>
                )}
                {info && info.planned > 0 && (
                  <span className="text-[9px] font-bold text-amber-500 leading-tight">
                    予定
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-pink-500" />
            実績支出
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            支出予定
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary-600" />
            選択中
          </span>
        </div>
      </div>

      {/* Day Detail Bottom Sheet */}
      {isDetailModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fadeIn p-0 sm:p-4"
          onClick={() => setIsDetailModalOpen(false)}
        >
          <div
            className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[82vh] flex flex-col overflow-hidden animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-50">
                  {selectedDay} の明細・予定
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  取引 {selectedDayTransactions.length}件 / 予定 {selectedDayPlanned.length}件
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                aria-label="閉じる"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {selectedDayTransactions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-400">取引履歴</p>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800">
                    {selectedDayTransactions.map((tx) => {
                      const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : undefined;
                      const acc = accountMap.get(tx.accountId);
                      const isPositive = tx.type === 'income' || tx.type === 'transfer_in';
                      return (
                        <div key={tx.id} className="flex items-center justify-between px-3.5 py-2.5">
                          <div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                              {tx.description}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {cat?.name || '未分類'}・{acc?.name || '不明'}
                            </p>
                          </div>
                          <span
                            className={`text-sm font-extrabold tabular-nums ${
                              isPositive ? 'text-emerald-600' : 'text-slate-800 dark:text-slate-100'
                            }`}
                          >
                            {isPositive ? '+' : '-'}
                            {Math.round(Math.abs(tx.amount)).toLocaleString()} 円
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedDayPlanned.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-400">支出予定</p>
                  <div className="space-y-2">
                    {selectedDayPlanned.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40"
                      >
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() =>
                              updatePlannedExpense(p.id, { isCompleted: !p.isCompleted })
                            }
                            className={`p-1 rounded-full transition ${
                              p.isCompleted ? 'text-emerald-600' : 'text-amber-500'
                            }`}
                            title={p.isCompleted ? '未完了に戻す' : '完了にする'}
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                          <div>
                            <p
                              className={`text-sm font-bold ${
                                p.isCompleted
                                  ? 'line-through text-slate-400'
                                  : 'text-slate-800 dark:text-slate-100'
                              }`}
                            >
                              {p.description}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {p.isCompleted ? '完了済み' : '未完了の予定'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-amber-600 tabular-nums">
                            {p.amount.toLocaleString()} 円
                          </span>
                          <button
                            type="button"
                            onClick={() => deletePlannedExpense(p.id)}
                            className="p-1 text-slate-400 hover:text-rose-500"
                            aria-label="削除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedDayDuologEvents.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-400">DuoLog の予定（選択日）</p>
                  <div className="space-y-1.5">
                    {selectedDayDuologEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                            {ev.title}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {ev.is_all_day ? '終日' : (ev.start_time || '').slice(11, 16)}
                            {ev.location ? ` ・ ${ev.location}` : ''}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 shrink-0 ml-2">
                          {ev.type === 'us' ? 'ふたり' : ev.type === 'partner' ? 'パートナー' : '自分'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedDayTransactions.length === 0 &&
                selectedDayPlanned.length === 0 &&
                selectedDayDuologEvents.length === 0 && (
                <p className="py-6 text-center text-sm text-slate-400">
                  この日の取引・予定はありません
                </p>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  window.dispatchEvent(
                    new CustomEvent('kakeibo:open-planned-modal', {
                      detail: { date: selectedDay },
                    })
                  );
                }}
                className="w-full py-3 rounded-2xl bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 font-bold text-xs"
              >
                ＋ この日に支出予定を追加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
