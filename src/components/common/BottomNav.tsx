import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, Plus, PieChart, Wallet } from 'lucide-react';

interface BottomNavProps {
  onOpenTransactionModal: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenTransactionModal }) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800 pb-safe">
      <div className="grid grid-cols-5 h-16 max-w-md mx-auto items-center">
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

        <div className="flex justify-center -mt-5">
          <button
            onClick={onOpenTransactionModal}
            className="w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-600/40 active:scale-95 transition transform"
            aria-label="取引を追加"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

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

        <NavLink
          to="/accounts"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 transition-colors ${
              isActive
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
            }`
          }
        >
          <Wallet className="w-5 h-5" />
          <span className="text-[10px]">口座</span>
        </NavLink>
      </div>
    </nav>
  );
};
