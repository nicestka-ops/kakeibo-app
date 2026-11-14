import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, Plus, CalendarDays, PieChart } from 'lucide-react';

interface BottomNavProps {
  onOpenTransactionModal: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenTransactionModal }) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800 pb-safe safe-area-inset-bottom">
      <div className="grid grid-cols-5 h-16 max-w-2xl mx-auto items-center">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 transition-colors ${
              isActive
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px]">ホーム</span>
        </NavLink>

        <NavLink
          to="/transactions"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 transition-colors ${
              isActive
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
            }`
          }
        >
          <Receipt className="w-5 h-5" />
          <span className="text-[10px]">履歴</span>
        </NavLink>

        <div className="flex justify-center -mt-4 z-10">
          <button
            onClick={onOpenTransactionModal}
            className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-600/40 active:scale-95 transition transform"
            aria-label="取引を追加"
          >
            <Plus className="w-7 h-7 stroke-[2.5]" />
          </button>
        </div>

        <NavLink
          to="/calendar"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 transition-colors ${
              isActive
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
            }`
          }
        >
          <CalendarDays className="w-5 h-5" />
          <span className="text-[10px]">カレンダー</span>
        </NavLink>

        <NavLink
          to="/analytics"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 transition-colors ${
              isActive
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
            }`
          }
        >
          <PieChart className="w-5 h-5" />
          <span className="text-[10px]">分析</span>
        </NavLink>
      </div>
    </nav>
  );
};
