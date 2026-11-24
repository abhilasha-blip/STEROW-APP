import { useQuery } from '@tanstack/react-query';
import type { ApiError } from '@/api/errors';
import { listSharedPeople, type SharedPerson } from '@/api/services/shareAccess.service';
import { queryKeys } from './queryKeys';

/** The people the signed-in user shares their vehicles with (vehicle_shares). */
export function useSharedPeople(uid: string | undefined) {
  return useQuery<SharedPerson[], ApiError>({
    queryKey: queryKeys.sharedPeople(uid ?? ''),
    queryFn: () => listSharedPeople(uid as string),
    enabled: !!uid,
  });
}
