import React, { type PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import { __resetSupabaseForTests, getSupabase } from '@/api/supabase';
import { useAbortableMutation } from '@/hooks/api/useAbortableMutation';
import { useBootstrap } from '@/hooks/api/useBootstrap';
import { makeSession, UID } from '../../../../test/msw/fixtures';
import { server } from '../../../../test/msw/server';
import { urls } from '../../../../test/msw/urls';

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => __resetSupabaseForTests());

describe('useBootstrap', () => {
  it('fetches the bootstrap for a user and stays idle without one', async () => {
    await getSupabase().auth.setSession(makeSession());
    const { result } = await renderHook(() => useBootstrap(UID), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.data?.fullName).toBe('Test User'));

    const idle = await renderHook(() => useBootstrap(undefined), { wrapper: wrapper() });
    expect(idle.result.current.fetchStatus).toBe('idle');
  });

  it('surfaces errors', async () => {
    await getSupabase().auth.setSession(makeSession());
    server.use(http.get(urls.userDetails, () => HttpResponse.json({ code: 'x', message: 'no' }, { status: 403 })));
    const { result } = await renderHook(() => useBootstrap(UID), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.error?.status).toBe(403));
  });
});

describe('useAbortableMutation', () => {
  it('ignores mutate() while pending, normalizes errors and aborts on unmount', async () => {
    const signals: AbortSignal[] = [];
    let release: () => void = () => undefined;
    const fn = jest.fn((_input: number, signal: AbortSignal) => {
      signals.push(signal);
      return new Promise<number>((resolve, reject) => {
        release = () => resolve(1);
        signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
      });
    });
    const { result, unmount } = await renderHook(() => useAbortableMutation(fn), { wrapper: wrapper() });

    await act(async () => {
      result.current.mutate(1);
      result.current.mutate(2);
    });
    expect(fn).toHaveBeenCalledTimes(1);
    await act(async () => release());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await act(async () => {
      result.current.mutate(3);
    });
    await act(async () => result.current.abort());
    await waitFor(() => expect(result.current.error?.kind).toBe('cancelled'));

    await act(async () => {
      result.current.mutate(4);
    });
    await unmount();
    expect(signals.at(-1)?.aborted).toBe(true);
  });
});
