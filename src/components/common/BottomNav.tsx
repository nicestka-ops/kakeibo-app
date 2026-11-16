import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, FileText, Plus, CalendarDays, BarChart2 } from 'lucide-react';

interface BottomNavProps {
  onOpenTransactionModal: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenTransactionModal }) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800 pb-safe safe-area-inset-bottom">
      <div className="grid grid-cols-5 h-16 max-w-2xl mx-auto items-center px-1">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 transition-colors ${
              isActive
                ? 'text-primary-600 dark:text-primary-400 font-bold'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
            }`
          }
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">ホーム</span>
        </NavLink>

        <NavLink
          to="/transactions"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 transition-colors ${
              isActive
                ? 'text-primary-600 dark:text-primary-400 font-bold'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
            }`
          }
        >
          <FileText className="w-5 h-5" />
          <span className="text-[10px]">履歴</span>
        </NavLink>

        <div className="flex flex-col items-center justify-center -mt-5 z-10">
          <button
            type="button"
            onClick={onOpenTransactionModal}
            className="w-12 h-12 rounded-full bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center shadow-lg shadow-primary-600/35 active:scale-95 transition transform"
            aria-label="登録"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            登録
          </span>
        </div>

        <NavLink
          to="/calendar"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 transition-colors ${
              isActive
                ? 'text-primary-600 dark:text-primary-400 font-bold'
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
            `flex flex-col items-center justify-center gap-0.5 transition-colors ${
              isActive
                ? 'text-primary-600 dark:text-primary-400 font-bold'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
            }`
          }
        >
          <BarChart2 className="w-5 h-5" />
          <span className="text-[10px]">分析</span>
        </NavLink>
      </div>
    </nav>
  );
};
