import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellRing, Calendar, X } from 'lucide-react';
import {
  fetchDuologEvents,
  isLikelySpendingEvent,
  type DuologEvent,
} from '@/services/duologClient';

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const SpendingAnnouncement: React.FC = () => {
  const [events, setEvents] = useState<DuologEvent[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetchDuologEvents().then(setEvents);
  }, []);

  if (dismissed) return null;

  const today = new Date().toISOString().slice(0, 10);
  const limit = addDays(today, 7);

  const upcomingSpendEvents = events.filter((ev) => {
    const start = (ev.start_time || '').slice(0, 10);
    return start >= today && start <= limit && isLikelySpendingEvent(ev);
  });

  if (upcomingSpendEvents.length === 0) return null;

  return (
    <div className="rounded-2xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 p-3.5 flex items-start gap-3 shadow-sm">
      <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
        <BellRing className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
          支出予定のアナウンス（DuoLog・直近7日間 {upcomingSpendEvents.length}件）
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
          「{upcomingSpendEvents.slice(0, 2).map((e) => e.title).join('」「')}」
          {upcomingSpendEvents.length > 2 ? ` ほか${upcomingSpendEvents.length - 2}件` : ''}
          など、出費が伴いそうな予定があります。
        </p>
        <Link
          to="/calendar"
          className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 mt-1.5 hover:underline"
        >
          <Calendar className="w-3 h-3" />
          カレンダーで確認する
        </Link>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 shrink-0"
        aria-label="通知を閉じる"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
