import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card } from '@/components/common/Card';
import { isExcludedFromCashFlow } from '@/services/calculation/balanceEngine';
import { ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight, CalendarDays } from 'lucide-react';

export const CalendarPage: React.FC = () => {
  const { transactions, categories, plannedExpenses, selectedYearMonth, setSelectedYearMonth } = useApp();
  const [yearStr, monthStr] = selectedYearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const [selectedDay, setSelectedDay] = useState<string>(() => `${selectedYearMonth}-01`);

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const categoryNameMap = new Map(categories.map((c) => [c.id, c.name]));
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const dailySummary: Record<string, { income: number; expense: number }> = {};
  for (const tx of transactions) {
    if (!tx.date.startsWith(selectedYearMonth)) continue;
    if (isExcludedFromCashFlow(tx, categoryNameMap)) continue;
    if (!dailySummary[tx.date]) dailySummary[tx.date] = { income: 0, expense: 0 };
    if (tx.type === 'income') dailySummary[tx.date].income += tx.amount;
    else if (tx.type === 'expense') dailySummary[tx.date].expense += tx.amount;
  }

  const dailyPlanned: Record<string, number> = {};
  for (const p of plannedExpenses) {
    if (!p.dueDate.startsWith(selectedYearMonth)) continue;
    dailyPlanned[p.dueDate] = (dailyPlanned[p.dueDate] || 0) + p.amount;
  }

  const calendarDays = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${selectedYearMonth}-${String(d).padStart(2, '0')}`;
    calendarDays.push({
      day: d,
      dateStr,
      summary: dailySummary[dateStr] || { income: 0, expense: 0 },
      planned: dailyPlanned[dateStr] || 0,
    });
  }

  const selectedDayTransactions = transactions.filter((tx) => tx.date === selectedDay);
  const selectedDayPlanned = plannedExpenses.filter((p) => p.dueDate === selectedDay);

  const handlePrevMonth = () => {
    let y = year;
    let m = month - 1;
    if (m < 1) { m = 12; y -= 1; }
    setSelectedYearMonth(`${y}-${String(m).padStart(2, '0')}`);
    setSelectedDay(`${y}-${String(m).padStart(2, '0')}-01`);
  };

  const handleNextMonth = () => {
    let y = year;
    let m = month + 1;
    if (m > 12) { m = 1; y += 1; }
    setSelectedYearMonth(`${y}-${String(m).padStart(2, '0')}`);
    setSelectedDay(`${y}-${String(m).padStart(2, '0')}-01`);
  };

  return (
    <div className="space-y-5 animate-fadeIn px-1 sm:px-0">
      {/* Month Navigation */}
      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition"
            aria-label="前月"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="font-bold text-lg sm:text-xl text-slate-800 dark:text-slate-100">
            {year}年 {month}月
          </h2>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition"
            aria-label="翌月"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card title={`${year}年 ${month}月のカレンダー`} className="p-3 sm:p-4">
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400 mb-2">
              <span className="text-rose-500">日</span>
              <span>月</span>
              <span>火</span>
              <span>水</span>
              <span>木</span>
              <span>金</span>
              <span className="text-blue-500">土</span>
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarDays.map((cell, idx) => {
                if (!cell) {
                  return <div key={`empty-${idx}`} className="h-14 sm:h-18 bg-slate-50/50 dark:bg-slate-800/20 rounded-xl" />;
                }
                const isSelected = cell.dateStr === selectedDay;
                const hasIncome = cell.summary.income > 0;
                const hasExpense = cell.summary.expense > 0;
                const hasPlanned = cell.planned > 0;

                return (
                  <button
                    key={cell.dateStr}
                    onClick={() => setSelectedDay(cell.dateStr)}
                    className={`h-14 sm:h-18 p-1.5 sm:p-2 rounded-xl border text-left transition flex flex-col justify-between min-h-0 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20'
                        : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <span className={`font-bold text-xs sm:text-sm ${isSelected ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'}`}>
                      {cell.day}
                    </span>
                    <div className="space-y-0.5 overflow-hidden min-h-0">
                      {hasIncome && (
                        <p className="text-[9px] sm:text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                          +¥{cell.summary.income >= 10000 ? `${Math.round(cell.summary.income / 1000)}k` : cell.summary.income}
                        </p>
                      )}
                      {hasExpense && (
                        <p className="text-[9px] sm:text-[10px] font-semibold text-rose-500 truncate">
                          -¥{cell.summary.expense >= 10000 ? `${Math.round(cell.summary.expense / 1000)}k` : cell.summary.expense}
                        </p>
                      )}
                      {hasPlanned && (
                        <p className="text-[9px] sm:text-[10px] font-semibold text-amber-600 dark:text-amber-400 truncate">
                          予¥{cell.planned >= 10000 ? `${Math.round(cell.planned / 1000)}k` : cell.planned}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Selected Day Details */}
        <div>
          <Card title={`${selectedDay} の取引・予定`} className="p-3 sm:p-4">
            {/* Transactions */}
            {selectedDayTransactions.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  取引 ({selectedDayTransactions.length}件)
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedDayTransactions.map((tx) => {
                    const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : undefined;
                    return (
                      <div
                        key={tx.id}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
                            style={{ backgroundColor: cat?.color || '#94a3b8' }}
                          >
                            {tx.type === 'income' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">{tx.description}</p>
                            <p className="text-[10px] text-slate-400 truncate">{cat?.name || 'カテゴリなし'}</p>
                          </div>
                        </div>
                        <span className={`font-bold text-xs ${tx.type === 'income' ? 'text-emerald-600' : 'text-slate-800 dark:text-slate-100'} shrink-0 ml-2`}>
                          {tx.type === 'income' ? '+' : '-'}¥{tx.amount.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Planned Expenses */}
            {selectedDayPlanned.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" />
                  支出予定 ({selectedDayPlanned.length}件)
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedDayPlanned.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-800 flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">{p.description}</p>
                        {p.categoryId && (
                          <p className="text-[10px] text-slate-400 truncate">
                            {categories.find(c => c.id === p.categoryId)?.name || 'カテゴリなし'}
                          </p>
                        )}
                      </div>
                      <span className="font-bold text-xs text-slate-700 dark:text-slate-200 shrink-0 ml-2">
                        ¥{p.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedDayTransactions.length === 0 && selectedDayPlanned.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">この日の取引・予定はありません</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
