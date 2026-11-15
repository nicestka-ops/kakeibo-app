import { SupabaseClient } from '@supabase/supabase-js';
import {
  Account,
  Category,
  MonthlyBudget,
  PlannedExpense,
  SavingsGoal,
  Transaction,
} from '@/types';

export const KAKEIBO_SYNC_TABLE = 'kakeibo_user_data';
const CLOUD_SYNC_META_KEY = 'kakeibo_cloud_sync_meta';

export interface KakeiboCloudPayload {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  budget: MonthlyBudget;
  plannedExpenses: PlannedExpense[];
  savingsGoals: SavingsGoal[];
}

export interface CloudSyncMeta {
  userId: string;
  updatedAt: string;
}

export interface CloudFetchResult {
  exists: boolean;
  data: KakeiboCloudPayload | null;
  updatedAt: string | null;
  error?: string;
  missingTable?: boolean;
}

export interface CloudUpsertResult {
  updatedAt: string | null;
  error?: string;
  missingTable?: boolean;
}

export const SYNC_SETUP_SQL = `create table if not exists public.kakeibo_user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.kakeibo_user_data enable row level security;

create policy "Users can view their own kakeibo data"
  on public.kakeibo_user_data for select
  using (auth.uid() = user_id);

create policy "Users can insert their own kakeibo data"
  on public.kakeibo_user_data for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own kakeibo data"
  on public.kakeibo_user_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter publication supabase_realtime add table public.kakeibo_user_data;`;

function isMissingTableError(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  if (err.code === '42P01' || err.code === 'PGRST205') return true;
  const msg = (err.message || '').toLowerCase();
  return msg.includes('does not exist') || msg.includes('schema cache');
}

export function getCloudSyncMeta(userId: string): CloudSyncMeta | null {
  try {
    const raw = localStorage.getItem(CLOUD_SYNC_META_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CloudSyncMeta>;
    if (parsed.userId === userId && typeof parsed.updatedAt === 'string') {
      return { userId: parsed.userId, updatedAt: parsed.updatedAt };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveCloudSyncMeta(userId: string, updatedAt: string): void {
  try {
    localStorage.setItem(CLOUD_SYNC_META_KEY, JSON.stringify({ userId, updatedAt }));
  } catch {
    // ignore storage errors
  }
}

export function hasMeaningfulKakeiboData(payload: KakeiboCloudPayload): boolean {
  return (
    payload.accounts.length > 0 ||
    payload.transactions.length > 0 ||
    payload.categories.length > 0 ||
    payload.plannedExpenses.length > 0 ||
    payload.savingsGoals.length > 0
  );
}

export async function fetchCloudData(
  client: SupabaseClient,
  userId: string
): Promise<CloudFetchResult> {
  const { data, error } = await client
    .from(KAKEIBO_SYNC_TABLE)
    .select('data, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    const missingTable = isMissingTableError(error);
    return {
      exists: false,
      data: null,
      updatedAt: null,
      missingTable,
      error: missingTable
        ? 'Supabase に同期用テーブル (kakeibo_user_data) が作成されていません。'
        : error.message,
    };
  }

  if (!data) {
    return { exists: false, data: null, updatedAt: null };
  }

  return {
    exists: true,
    data: data.data as KakeiboCloudPayload,
    updatedAt: data.updated_at as string,
  };
}

export async function upsertCloudData(
  client: SupabaseClient,
  userId: string,
  payload: KakeiboCloudPayload
): Promise<CloudUpsertResult> {
  const nowIso = new Date().toISOString();
  const { data, error } = await client
    .from(KAKEIBO_SYNC_TABLE)
    .upsert(
      {
        user_id: userId,
        data: payload,
        updated_at: nowIso,
      },
      { onConflict: 'user_id' }
    )
    .select('updated_at')
    .single();

  if (error) {
    const missingTable = isMissingTableError(error);
    return {
      updatedAt: null,
      missingTable,
      error: missingTable
        ? 'Supabase に同期用テーブル (kakeibo_user_data) が作成されていません。'
        : error.message,
    };
  }

  return { updatedAt: (data?.updated_at as string) || nowIso };
}
