import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card } from '@/components/common/Card';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const CalendarPage: React.FC = () => {
  const { transactions, categories, selectedYearMonth } = useApp();
  const [yearStr, monthStr] = selectedYearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const [selectedDay, setSelectedDay] = useState<string>(() => `${selectedYearMonth}-01`);

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const dailySummary: Record<string, { income: number; expense: number }> = {};
  for (const tx of transactions) {
    if (!tx.date.startsWith(selectedYearMonth)) continue;
    if (!dailySummary[tx.date]) dailySummary[tx.date] = { income: 0, expense: 0 };
    if (tx.type === 'income') dailySummary[tx.date].income += tx.amount;
    else if (tx.type === 'expense') dailySummary[tx.date].expense += tx.amount;
  }

  const calendarDays = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${selectedYearMonth}-${String(d).padStart(2, '0')}`;
    calendarDays.push({
      day: d,
      dateStr,
      summary: dailySummary[dateStr] || { income: 0, expense: 0 },
    });
  }

  const selectedDayTransactions = transactions.filter((tx) => tx.date === selectedDay);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card title={`${year}年 ${month}月のカレンダー`}>
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
                  return <div key={`empty-${idx}`} className="h-16 sm:h-20 bg-slate-50/50 dark:bg-slate-800/20 rounded-xl" />;
                }
                const isSelected = cell.dateStr === selectedDay;
                const hasIncome = cell.summary.income > 0;
                const hasExpense = cell.summary.expense > 0;

                return (
                  <button
                    key={cell.dateStr}
                    onClick={() => setSelectedDay(cell.dateStr)}
                    className={`h-16 sm:h-20 p-1.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20'
                        : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="font-bold text-xs text-slate-700 dark:text-slate-300">{cell.day}</span>
                    <div className="space-y-0.5 overflow-hidden">
                      {hasIncome && (
                        <p className="text-[10px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                          +¥{cell.summary.income >= 10000 ? `${Math.round(cell.summary.income / 1000)}k` : cell.summary.income}
                        </p>
                      )}
                      {hasExpense && (
                        <p className="text-[10px] sm:text-xs font-semibold text-rose-500 truncate">
                          -¥{cell.summary.expense >= 10000 ? `${Math.round(cell.summary.expense / 1000)}k` : cell.summary.expense}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        <div>
          <Card title={`${selectedDay} の取引`}>
            {selectedDayTransactions.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-400">この日の取引はありません</p>
            ) : (
              <div className="space-y-3">
                {selectedDayTransactions.map((tx) => {
                  const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : undefined;
                  return (
                    <div
                      key={tx.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
                          style={{ backgroundColor: cat?.color || '#94a3b8' }}
                        >
                          {tx.type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-bold text-xs text-slate-800 dark:text-slate-100">{tx.description}</p>
                          <p className="text-[10px] text-slate-400">{cat?.name || 'カテゴリなし'}</p>
                        </div>
                      </div>
                      <span className={`font-bold text-xs sm:text-sm ${tx.type === 'income' ? 'text-emerald-600' : 'text-slate-800 dark:text-slate-100'}`}>
                        {tx.type === 'income' ? '+' : '-'}¥{tx.amount.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
