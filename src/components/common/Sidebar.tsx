import React from 'react';
import { NavLink } from 'react-router-dom';
import { X, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  Wallet,
  CalendarDays,
  PiggyBank,
  Target,
  Settings,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'ホーム', icon: LayoutDashboard },
  { to: '/transactions', label: '取引履歴', icon: Receipt },
  { to: '/analytics', label: '分析', icon: PieChart },
  { to: '/accounts', label: '口座・資産', icon: Wallet },
  { to: '/calendar', label: 'カレンダー', icon: CalendarDays },
  { to: '/budgets', label: '月間予算', icon: PiggyBank },
  { to: '/goals', label: '貯金目標', icon: Target },
  { to: '/settings', label: '設定', icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, isConfigured, signInWithGoogle, signOut } = useAuth();

  const renderAuthFooter = () => (
    <div className="pt-4 mt-auto border-t border-slate-100 dark:border-slate-800 space-y-3">
      {isConfigured && (
        user ? (
          <div className="flex items-center justify-between gap-2 px-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <div className="flex items-center gap-2.5 min-w-0">
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt={user.user_metadata?.full_name || 'アバター'}
                  className="w-8 h-8 rounded-full object-cover shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                  {user.user_metadata?.full_name || user.user_metadata?.name || 'Google ユーザー'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={signOut}
              title="ログアウト"
              aria-label="ログアウト"
              className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 transition shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 rounded-xl transition"
          >
            <LogIn className="w-4 h-4" />
            <span>Google でログイン</span>
          </button>
        )
      )}
      <div className="text-xs text-slate-400 px-3">
        <p className="font-medium text-slate-500 dark:text-slate-400">独立型モダン家計簿</p>
        <p className="text-[11px] text-slate-400 mt-0.5">v1.0.0 (Local-First)</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile/Tablet overlay sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 p-4 transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 lg:z-auto ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="メインナビゲーション"
      >
        <div className="lg:hidden flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg text-slate-800 dark:text-slate-100 tracking-tight">
                kakeibo
              </h1>
              <p className="text-xs text-slate-400">家計簿マネージャー</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="サイドバーを閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-3 rounded-2xl font-semibold text-sm transition-all duration-150 ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {renderAuthFooter()}
      </aside>

      {/* Desktop permanent sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 p-4 shrink-0 transition-colors">
        <div className="flex items-center gap-3 px-3 py-4 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-slate-800 dark:text-slate-100 tracking-tight">
              kakeibo
            </h1>
            <p className="text-xs text-slate-400">家計簿マネージャー</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-3 rounded-2xl font-semibold text-sm transition-all duration-150 ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {renderAuthFooter()}
      </aside>
    </>
  );
};
