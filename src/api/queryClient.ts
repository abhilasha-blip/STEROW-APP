import NetInfo from '@react-native-community/netinfo';
import { onlineManager, QueryClient } from '@tanstack/react-query';
import { normalizeError } from './errors';

const MAX_QUERY_RETRIES = 2;

/** No retry on 4xx / cancellations; transient failures retry twice. Mutations never retry. */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  const e = normalizeError(error);
  if (e.kind === 'cancelled' || e.kind === 'validation') {
    return false;
  }
  if (e.status !== undefined && e.status >= 400 && e.status < 500) {
    return false;
  }
  return failureCount < MAX_QUERY_RETRIES;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: shouldRetryQuery, staleTime: 5 * 60_000 },
    mutations: { retry: 0 },
  },
});

/** React Query pauses/refetches with real connectivity instead of the browser `online` event. */
export function bindOnlineManagerToNetInfo(): void {
  onlineManager.setEventListener(setOnline =>
    NetInfo.addEventListener(state => setOnline(state.isConnected !== false)),
  );
}
