import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { type Session } from '@supabase/supabase-js';

import { type Tables } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export type Account = Tables<'accounts'>;

type AuthState = {
  session: Session | null;
  account: Account | null;
  /** True until the stored session (and its account) has been resolved. */
  loading: boolean;
};

const AuthContext = createContext<AuthState>({ session: null, account: null, loading: true });

type AccountResult = { userId: string; account: Account | null };

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [accountResult, setAccountResult] = useState<AccountResult | null>(null);

  // 1. Session: read the persisted one and follow auth changes.
  // Keep the callback synchronous: calling Supabase inside it can deadlock.
  useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        const { data } = await supabase.auth.getSession();
        if (active) setSession(data.session);
      } catch {
        // The stored session could not be read: continue as signed out.
        if (active) setSession(null);
      } finally {
        if (active) setSessionReady(true);
      }
    }

    void loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setSessionReady(true);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // 2. Account: load it whenever the signed-in user changes.
  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!userId) return;

    const currentUserId = userId; // narrowed to string, usable inside the function below
    let active = true;

    async function loadAccount() {
      let loaded: Account | null = null;
      try {
        const { data } = await supabase.from('accounts').select('*').eq('id', currentUserId).single();
        loaded = data ?? null;
      } catch {
        // Treat a failed request like a missing account, so we never stay loading.
      }
      if (active) setAccountResult({ userId: currentUserId, account: loaded });
    }

    void loadAccount();

    return () => {
      active = false;
    };
  }, [userId]);

  const value = useMemo<AuthState>(() => {
    const accountLoaded = accountResult?.userId === userId;
    return {
      session,
      account: userId && accountLoaded ? accountResult.account : null,
      loading: !sessionReady || (userId !== null && !accountLoaded),
    };
  }, [session, sessionReady, userId, accountResult]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Current session and account (from the `accounts` table). */
export function useAccount(): AuthState {
  return useContext(AuthContext);
}