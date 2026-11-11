import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card } from '@/components/common/Card';
import { generateMonthlyTrend } from '@/services/calculation/balanceEngine';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

export const AnalyticsPage: React.FC = () => {
  const { transactions, categories, categoryBreakdown, monthlyCashFlow } = useApp();
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const pieData = Object.entries(categoryBreakdown)
    .map(([catId, amount]) => {
      const cat = categoryMap.get(catId);
      return {
        name: cat?.name || 'その他',
        value: amount,
        color: cat?.color || '#94a3b8',
      };
    })
    .sort((a, b) => b.value - a.value);

  const barData = generateMonthlyTrend(transactions, 6);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="カテゴリー別支出割合">
          {pieData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-slate-400">
              今月の支出データがありません
            </div>
          ) : (
            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => [`¥${Number(val).toLocaleString()}`, '金額']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="カテゴリー別内訳一覧">
          {pieData.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">データがありません</div>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {pieData.map((item) => {
                const percent =
                  monthlyCashFlow.expense > 0
                    ? Math.round((item.value / monthlyCashFlow.expense) * 100)
                    : 0;

                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-semibold text-slate-800 dark:text-slate-100">
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400">{percent}%</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">
                          ¥{item.value.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${percent}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Card title="収支推移（直近6ヶ月）">
        <div className="h-72 sm:h-80 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                tickFormatter={(v) => `¥${Math.round(v / 10000)}万`}
              />
              <Tooltip
                formatter={(val: number) => [`¥${Number(val).toLocaleString()}`, '']}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="income" name="収入" fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" name="支出" fill="#f43f5e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};
