import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_CONFIG_STORAGE_KEY = 'kakeibo_supabase_config';

interface StoredSupabaseConfig {
  url: string;
  anonKey: string;
}

const envUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

export const hasEnvSupabaseConfig = Boolean(envUrl && envAnonKey);

export function getStoredSupabaseConfig(): StoredSupabaseConfig | null {
  try {
    const raw = localStorage.getItem(SUPABASE_CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSupabaseConfig>;
    if (parsed.url?.trim() && parsed.anonKey?.trim()) {
      return { url: parsed.url.trim(), anonKey: parsed.anonKey.trim() };
    }
    return null;
  } catch {
    return null;
  }
}

export function getEffectiveSupabaseConfig(): StoredSupabaseConfig | null {
  if (hasEnvSupabaseConfig) {
    return { url: envUrl, anonKey: envAnonKey };
  }
  return getStoredSupabaseConfig();
}

export function createSupabaseClientFromConfig(config: StoredSupabaseConfig | null): SupabaseClient | null {
  if (!config) return null;
  return createClient(config.url, config.anonKey, {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

export function saveStoredSupabaseConfig(url: string, anonKey: string): StoredSupabaseConfig {
  const normalized = { url: url.trim(), anonKey: anonKey.trim() };
  localStorage.setItem(SUPABASE_CONFIG_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function clearStoredSupabaseConfig(): void {
  localStorage.removeItem(SUPABASE_CONFIG_STORAGE_KEY);
}
