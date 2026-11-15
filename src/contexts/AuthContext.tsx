import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, SupabaseClient, User } from '@supabase/supabase-js';
import {
  allowedEmails,
  clearStoredSupabaseConfig,
  createSupabaseClientFromConfig,
  getEffectiveSupabaseConfig,
  hasEnvSupabaseConfig,
  isEmailAllowed,
  saveStoredSupabaseConfig,
} from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  supabaseClient: SupabaseClient | null;
  loading: boolean;
  isConfigured: boolean;
  isEnvConfigured: boolean;
  isEmailRestricted: boolean;
  configuredUrl: string | null;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  saveSupabaseConfig: (url: string, anonKey: string) => void;
  resetSupabaseConfig: () => void;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [client, setClient] = useState<SupabaseClient | null>(() =>
    createSupabaseClientFromConfig(getEffectiveSupabaseConfig())
  );
  const [configuredUrl, setConfiguredUrl] = useState<string | null>(
    () => getEffectiveSupabaseConfig()?.url ?? null
  );
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(() => Boolean(getEffectiveSupabaseConfig()));
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorDesc = params.get('error_description') || params.get('error');
    if (errorDesc) {
      setAuthError(decodeURIComponent(errorDesc));
    }
  }, []);

  useEffect(() => {
    if (!client) {
      setSession(null);
      setUser(null);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const applySession = async (nextSession: Session | null) => {
      const nextUser = nextSession?.user ?? null;
      if (nextUser && !isEmailAllowed(nextUser.email)) {
        await client.auth.signOut();
        if (!isMounted) return;
        setSession(null);
        setUser(null);
        setAuthError(
          `このアカウント（${nextUser.email || '不明'}）にはアクセス権限がありません。`
        );
        return;
      }
      if (!isMounted) return;
      setSession(nextSession);
      setUser(nextUser);
    };

    client.auth
      .getSession()
      .then(async ({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          setAuthError(error.message);
        } else {
          await applySession(data.session);
        }
        if (!isMounted) return;
        setLoading(false);

        const params = new URLSearchParams(window.location.search);
        if (params.has('code')) {
          params.delete('code');
          const nextSearch = params.toString();
          const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
          window.history.replaceState(null, '', nextUrl);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setAuthError(err instanceof Error ? err.message : 'セッションの取得に失敗しました');
        setLoading(false);
      });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      void applySession(nextSession).finally(() => {
        if (isMounted) setLoading(false);
      });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [client]);

  const signInWithGoogle = async () => {
    if (!client) {
      setAuthError('Supabase の接続設定が未完了です。設定画面から URL と Anon Key を設定してください。');
      return;
    }

    setAuthError(null);
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`;
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    });

    if (error) {
      setAuthError(error.message);
    }
  };

  const signOut = async () => {
    if (!client) return;
    setAuthError(null);
    const { error } = await client.auth.signOut();
    if (error) {
      setAuthError(error.message);
    }
  };

  const saveSupabaseConfig = (url: string, anonKey: string) => {
    try {
      const normalized = saveStoredSupabaseConfig(url, anonKey);
      const nextClient = createSupabaseClientFromConfig(normalized);
      setClient(nextClient);
      setConfiguredUrl(normalized.url);
      setAuthError(null);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Supabase 設定の保存に失敗しました');
    }
  };

  const resetSupabaseConfig = () => {
    clearStoredSupabaseConfig();
    const effective = getEffectiveSupabaseConfig();
    setClient(createSupabaseClientFromConfig(effective));
    setConfiguredUrl(effective?.url ?? null);
    setSession(null);
    setUser(null);
    setAuthError(null);
  };

  const clearAuthError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        supabaseClient: client,
        loading,
        isConfigured: Boolean(client),
        isEnvConfigured: hasEnvSupabaseConfig,
        isEmailRestricted: allowedEmails.length > 0,
        configuredUrl,
        authError,
        signInWithGoogle,
        signOut,
        saveSupabaseConfig,
        resetSupabaseConfig,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
