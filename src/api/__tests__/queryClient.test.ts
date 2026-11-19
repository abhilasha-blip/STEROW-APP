import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { ApiError } from '@/api/errors';
import { bindOnlineManagerToNetInfo, shouldRetryQuery } from '@/api/queryClient';

describe('queryClient', () => {
  it('never retries 4xx, validation or cancellations; retries transient errors twice', () => {
    expect(shouldRetryQuery(0, new ApiError({ kind: 'validation', message: '', status: 400 }))).toBe(false);
    expect(shouldRetryQuery(0, new ApiError({ kind: 'server', message: '', status: 403 }))).toBe(false);
    expect(shouldRetryQuery(0, new ApiError({ kind: 'cancelled', message: '' }))).toBe(false);
    expect(shouldRetryQuery(0, new ApiError({ kind: 'network', message: '' }))).toBe(true);
    expect(shouldRetryQuery(1, new ApiError({ kind: 'server', message: '', status: 503 }))).toBe(true);
    expect(shouldRetryQuery(2, new ApiError({ kind: 'timeout', message: '' }))).toBe(false);
  });

  it('drives React Query online state from NetInfo', () => {
    let listener: (s: { isConnected: boolean | null }) => void = () => undefined;
    (NetInfo.addEventListener as jest.Mock).mockImplementationOnce(fn => {
      listener = fn;
      return jest.fn();
    });
    bindOnlineManagerToNetInfo();
    listener({ isConnected: false });
    expect(onlineManager.isOnline()).toBe(false);
    listener({ isConnected: null });
    expect(onlineManager.isOnline()).toBe(true);
  });
});
