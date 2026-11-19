import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native';
import { getEnv } from '@/config/env';
import { keychainStorage } from '@/storage/keychainStorage';
import { assertOnline } from './network';

let client: SupabaseClient | undefined;

/** fetch that fails fast while offline (supabase-js maps the thrown error to AuthRetryableFetchError). */
const offlineAwareFetch: typeof fetch = async (input, init) => {
  await assertOnline();
  return fetch(input, init);
};

/** The single Supabase client. Session persistence: Keychain. Token refresh: supabase-js. */
export function getSupabase(): SupabaseClient {
  if (!client) {
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = getEnv();
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: keychainStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      global: { fetch: offlineAwareFetch },
    });
  }
  return client;
}

/**
 * Refresh only while the app is in the foreground (Supabase's React Native guidance):
 * a timer can't run reliably in the background, and on return the client refreshes immediately.
 */
export function bindAutoRefreshToAppState(): () => void {
  const supabase = getSupabase();
  const apply = (state: AppStateStatus) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  };
  apply(AppState.currentState === 'active' ? 'active' : 'background');
  const sub: NativeEventSubscription = AppState.addEventListener('change', apply);
  return () => {
    sub.remove();
    supabase.auth.stopAutoRefresh();
  };
}

/** Test-only: drop the cached client so each test starts from a clean auth state. */
export function __resetSupabaseForTests(): void {
  client = undefined;
}
