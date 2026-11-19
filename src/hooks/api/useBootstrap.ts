import { useQuery } from '@tanstack/react-query';
import type { ApiError } from '@/api/errors';
import { fetchBootstrap, type BootstrapUser } from '@/api/services/user.service';
import { queryKeys } from './queryKeys';

/**
 * The signed-in user's profile, roles and permissions. The auth store fills this cache at sign-in;
 * screens read it here (and it refetches after an offline start once back online).
 */
export function useBootstrap(uid: string | undefined) {
  return useQuery<BootstrapUser, ApiError>({
    queryKey: queryKeys.bootstrap(uid ?? ''),
    queryFn: () => fetchBootstrap(uid as string),
    enabled: !!uid,
  });
}
