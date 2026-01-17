// src/lib/supabase.ts
import { AppState, Platform } from "react-native";
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, processLock } from "@supabase/supabase-js";
import type { LockFunc } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

// Таймаут на fetch, чтобы сетевой запрос не держал lock вечно
function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const timeoutMs = 20000;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  const finalInit: RequestInit = {
    ...init,
    signal: init?.signal ?? controller.signal,
  };

  return fetch(input, finalInit).finally(() => clearTimeout(t));
}

// RN lock: игнорируем acquireTimeout от Supabase и всегда ждём предыдущую операцию
const rnLock: LockFunc = async <R,>(name: string, _acquireTimeout: number, fn: () => Promise<R>) => {
  return await processLock<R>(name, -1, fn);
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: rnLock,
  },
  global: {
    fetch: fetchWithTimeout,
  },
});

// Авто-рефреш токена для RN (рекомендованный паттерн)
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
