// src/auth/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { requestHistorySync } from "../services/sync";

type AuthState = {
  isLoading: boolean;
  session: Session | null;
  user: User | null;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  const lastSyncedUserIdRef = useRef<string | null>(null);

  // 1) Инициализация сессии + подписка на auth события
  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        setSession(error ? null : (data.session ?? null));
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // Важно: тут НЕ делаем await и НЕ вызываем запросы к БД/Supabase
      setSession(newSession ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // 2) Автосинк при появлении user (вне onAuthStateChange)
  useEffect(() => {
    const userId = session?.user?.id ?? null;
    if (!userId) return;

    if (lastSyncedUserIdRef.current !== userId) {
      lastSyncedUserIdRef.current = userId;
      requestHistorySync(userId).catch(() => {});
    }
  }, [session?.user?.id]);

  const value = useMemo<AuthState>(() => {
    return {
      isLoading,
      session,
      user: session?.user ?? null,

      signUp: async (email: string, password: string) => {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      },

      signIn: async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },

      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
    };
  }, [isLoading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
