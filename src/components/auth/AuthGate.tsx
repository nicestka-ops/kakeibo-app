import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, LogIn, ShieldAlert, Database } from 'lucide-react';

export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    user,
    loading,
    isConfigured,
    isEmailRestricted,
    authError,
    signInWithGoogle,
    saveSupabaseConfig,
    clearAuthError,
  } = useAuth();

  const [urlInput, setUrlInput] = useState('');
  const [anonKeyInput, setAnonKeyInput] = useState('');

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
        <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-lg mb-4 animate-pulse">
          <img
            src={`${import.meta.env.BASE_URL}icon-192.png?v=3`}
            alt="kakeibo"
            className="w-full h-full object-cover"
          />
        </div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          認証状態を確認しています...
        </p>
      </div>
    );
  }

  if (user) {
    return <>{children}</>;
  }

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || !anonKeyInput.trim()) return;
    saveSupabaseConfig(urlInput, anonKeyInput);
    setAnonKeyInput('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-8">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg">
            <img
              src={`${import.meta.env.BASE_URL}icon-192.png?v=3`}
              alt="kakeibo"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              kakeibo
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              <span>プライベート家計簿アプリ</span>
            </p>
          </div>
        </div>

        {authError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-rose-600 dark:text-rose-400 leading-relaxed">
                {authError}
              </p>
            </div>
            <button
              onClick={clearAuthError}
              className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline shrink-0"
            >
              閉じる
            </button>
          </div>
        )}

        {!isConfigured ? (
          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50 flex items-start gap-2.5">
              <Database className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Supabase の接続情報が未設定です。Project URL と Anon Key を入力して接続してください。
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Project URL
              </label>
              <input
                type="url"
                required
                placeholder="https://xxxxxxxxxxxx.supabase.co"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Anon Public Key
              </label>
              <input
                type="password"
                required
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={anonKeyInput}
                onChange={(e) => setAnonKeyInput(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md transition"
            >
              接続設定を保存して次へ
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-center text-slate-500 dark:text-slate-400 leading-relaxed">
              {isEmailRestricted
                ? '許可された Google アカウントでログインしてください。'
                : '続行するには Google アカウントでログインしてください。'}
            </p>
            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition active:scale-[0.99]"
            >
              <LogIn className="w-4 h-4" />
              <span>Google でログイン</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
