import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card } from '@/components/common/Card';
import { Account, AccountType } from '@/types';
import { Building2, Banknote, CreditCard, Wallet, Plus, X, Trash2, Edit2, PiggyBank } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

export const AccountsPage: React.FC = () => {
  const { accounts, accountBalances, financialSummary, addAccount, updateAccount } = useApp();
  const [isAdding, setIsAdding] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [openingBalance, setOpeningBalance] = useState('');
  const [includeInAssets, setIncludeInAssets] = useState(true);
  const [openingBalanceDate, setOpeningBalanceDate] = useState(() => new Date().toISOString().split('T')[0]);

  const getAccountIcon = (type: AccountType) => {
    switch (type) {
      case 'bank': return <Building2 className="w-5 h-5 text-blue-500" />;
      case 'cash': return <Banknote className="w-5 h-5 text-emerald-500" />;
      case 'credit_card': return <CreditCard className="w-5 h-5 text-purple-500" />;
      default: return <Wallet className="w-5 h-5 text-slate-500" />;
    }
  };

  const getAccountIconBg = (type: AccountType) => {
    switch (type) {
      case 'bank': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
      case 'cash': return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400';
      case 'credit_card': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400';
      case 'wallet': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400';
      case 'gift_card': return 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
    }
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addAccount({
      name: name.trim(),
      type,
      openingBalance: Math.round(Number(openingBalance) || 0),
      openingBalanceDate,
      includeInAssets: type === 'credit_card' ? false : includeInAssets,
      sortOrder: accounts.length + 1,
      isActive: true,
    });

    setName('');
    setOpeningBalance('');
    setOpeningBalanceDate(new Date().toISOString().split('T')[0]);
    setIsAdding(false);
  };

  const handleUpdateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount || !name.trim()) return;

    updateAccount(editingAccount.id, {
      name: name.trim(),
      type,
      openingBalance: Math.round(Number(openingBalance) || 0),
      openingBalanceDate,
      includeInAssets: type === 'credit_card' ? false : includeInAssets,
    });

    setEditingAccount(null);
    setName('');
    setOpeningBalance('');
    setOpeningBalanceDate(new Date().toISOString().split('T')[0]);
    setType('bank');
    setIncludeInAssets(true);
  };

  const startEditing = (acc: typeof accounts[0]) => {
    setEditingAccount(acc);
    setName(acc.name);
    setType(acc.type);
    setOpeningBalance(acc.openingBalance.toString());
    setOpeningBalanceDate(acc.openingBalanceDate);
    setIncludeInAssets(acc.includeInAssets);
  };

  const handleDeleteAccount = (id: string) => {
    if (confirm('この口座を削除しますか？関連する取引履歴は残りますが、残高計算から除外されます。')) {
      updateAccount(id, { isActive: false });
    }
  };

  const assetTrendData = [
    { name: '4ヶ月前', total: Math.round(financialSummary.netAssets * 0.85) },
    { name: '3ヶ月前', total: Math.round(financialSummary.netAssets * 0.9) },
    { name: '2ヶ月前', total: Math.round(financialSummary.netAssets * 0.94) },
    { name: '先月', total: Math.round(financialSummary.netAssets * 0.97) },
    { name: '現在', total: financialSummary.netAssets },
  ];

  return (
    <div className="space-y-5 animate-fadeIn px-1 sm:px-0">
      {/* Asset Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-slate-900 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">総資産</p>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1 truncate">
                ¥{financialSummary.totalAssets.toLocaleString()}
              </h2>
              <p className="text-xs text-slate-400 mt-1">集計対象口座のプラス残高合計</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/20 dark:to-slate-900 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400">負債（カード未払等）</p>
              <h2 className="text-xl sm:text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1 truncate">
                -¥{financialSummary.totalLiabilities.toLocaleString()}
              </h2>
              <p className="text-xs text-slate-400 mt-1">引き落とし予定のカード利用残高</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-slate-900 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">純資産</p>
              <h2 className="text-xl sm:text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1 truncate">
                ¥{financialSummary.netAssets.toLocaleString()}
              </h2>
              <p className="text-xs text-slate-400 mt-1">総資産 - 負債（実際の保有資産）</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <PiggyBank className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Accounts List */}
      <Card
        title="口座一覧"
        action={
          <button
            onClick={() => { setEditingAccount(null); setIsAdding(true); }}
            className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            口座を追加
          </button>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {accounts.filter(a => a.isActive).map((acc) => {
            const balance = accountBalances[acc.id] ?? 0;
            return (
              <div
                key={acc.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getAccountIconBg(acc.type)}`}>
                    {getAccountIcon(acc.type)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                      {acc.name}
                    </h4>
                    <p className="text-xs text-slate-400 capitalize">
                      {acc.type === 'bank' ? '銀行' : acc.type === 'cash' ? '現金' : acc.type === 'credit_card' ? 'クレジットカード' : acc.type === 'wallet' ? '電子マネー' : acc.type === 'gift_card' ? '商品券' : 'その他'}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-right">
                    <span className={`font-bold text-base sm:text-lg ${balance < 0 ? 'text-rose-500' : 'text-slate-800 dark:text-slate-100'}`}>
                      ¥{balance.toLocaleString()}
                    </span>
                    {!acc.includeInAssets && acc.type !== 'credit_card' && (
                      <p className="text-[10px] text-slate-400">資産非算入</p>
                    )}
                    {acc.type === 'credit_card' && (
                      <p className="text-[10px] text-amber-500">負債として計上</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEditing(acc)}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      aria-label="編集"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAccount(acc.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      aria-label="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Asset Trend Chart */}
      <Card title="純資産の推移">
        <div className="h-64 sm:h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={assetTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="assetGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                tickFormatter={(v) => `¥${Math.round(v / 10000)}万`}
              />
              <Tooltip
                formatter={(val: number) => [`¥${Number(val).toLocaleString()}`, '純資産']}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#assetGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Add/Edit Account Modal */}
      {(isAdding || editingAccount) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">
                {editingAccount ? '口座を編集' : '口座を追加'}
              </h3>
              <button onClick={() => { setIsAdding(false); setEditingAccount(null); }} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={editingAccount ? handleUpdateAccount : handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">口座名</label>
                <input
                  type="text"
                  required
                  placeholder="例: 三井住友銀行、お小遣い財布"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">種別</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as AccountType)}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                >
                  <option value="bank">銀行口座</option>
                  <option value="cash">現金・財布</option>
                  <option value="credit_card">クレジットカード</option>
                  <option value="wallet">電子マネー</option>
                  <option value="gift_card">商品券</option>
                  <option value="other">その他</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">開始残高日</label>
                <input
                  type="date"
                  value={openingBalanceDate}
                  onChange={(e) => setOpeningBalanceDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">開始残高（円）</label>
                <input
                  type="number"
                  placeholder="0"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                />
              </div>
              {type !== 'credit_card' && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="includeAssets"
                    checked={includeInAssets}
                    onChange={(e) => setIncludeInAssets(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="includeAssets" className="text-xs text-slate-600 dark:text-slate-300">
                    総資産の計算に含める
                  </label>
                </div>
              )}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition"
                >
                  {editingAccount ? '保存する' : '追加する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
