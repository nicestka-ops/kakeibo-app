import { createClient } from '@supabase/supabase-js';

export interface DuologEvent {
  id: string;
  title: string;
  start_time: string;
  end_time?: string | null;
  is_all_day: boolean;
  location?: string | null;
  type: 'me' | 'partner' | 'us';
}

const SPEND_KEYWORDS = [
  'デート',
  '旅行',
  'グランピング',
  'コテージ',
  '映画',
  'カフェ',
  '食事',
  'ランチ',
  'ディナー',
  '飲み',
  '買い物',
  'ショッピング',
  '温泉',
  '誕生日',
  '記念日',
  'プレゼント',
  '試合',
  'ライブ',
];

export function isLikelySpendingEvent(ev: DuologEvent): boolean {
  if (ev.type === 'us') return true;
  if (ev.location && ev.location.trim().length > 0) return true;
  return SPEND_KEYWORDS.some((kw) => ev.title.includes(kw));
}

export function eventSpansDay(ev: DuologEvent, dateStr: string): boolean {
  const start = (ev.start_time || '').slice(0, 10);
  const end = (ev.end_time || '').slice(0, 10) || start;
  return dateStr >= start && dateStr <= end;
}

export async function fetchDuologEvents(): Promise<DuologEvent[]> {
  const url = import.meta.env.VITE_DUOLOG_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_DUOLOG_SUPABASE_ANON_KEY as string | undefined;
  const shareKey = import.meta.env.VITE_DUOLOG_SHARE_KEY as string | undefined;

  if (!url || !anonKey || !shareKey) return [];

  try {
    const client = createClient(url, anonKey);
    const { data, error } = await client.rpc('get_shared_events_for_kakeibo', {
      p_share_key: shareKey,
    });
    if (error || !Array.isArray(data)) return [];
    return data as DuologEvent[];
  } catch {
    return [];
  }
}
