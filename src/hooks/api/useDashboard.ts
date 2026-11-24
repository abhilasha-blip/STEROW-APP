import { useQuery } from '@tanstack/react-query';
import type { ApiError } from '@/api/errors';
import {
  fetchDashboardCounts,
  profileCompletion,
  type DashboardCounts,
  type ProfileCompletion,
  type ServerCounts,
} from '@/api/services/dashboard.service';
import type { MyVehicle } from '@/api/services/vehicle.service';
import { useAuthStore } from '@/store/auth.store';
import { useMyVehicles } from './useDocumentsStep';
import { useDrivingLicenceStepData } from './useDrivingLicenceStep';
import { useProfileStepData } from './useProfileStep';
import { useSharedPeople } from './useShareAccess';
import { queryKeys } from './queryKeys';

export type DashboardData = {
  fullName: string;
  firstName: string;
  email: string;
  avatarUrl: string | null;
  vehicles: MyVehicle[];
  counts: DashboardCounts;
  completion: ProfileCompletion;
  /** The profile, licence or vehicles are still loading (the completion banner waits for them). */
  loading: boolean;
};

const EMPTY_COUNTS: ServerCounts = { documents: null, bookings: null, serviceHistory: null };

export function useDashboardCounts(uid: string | undefined) {
  return useQuery<ServerCounts, ApiError>({
    queryKey: queryKeys.dashboardCounts(uid ?? ''),
    queryFn: () => fetchDashboardCounts(uid as string),
    enabled: !!uid,
  });
}

/**
 * Everything the dashboard shows that comes from the backend: user_details (name, email, avatar), the
 * licence, the active vehicles and the tile counts. Profile completion = the onboarding parts done
 * (profile name + email, licence, a vehicle).
 */
export function useDashboard(): DashboardData {
  const storeUser = useAuthStore(s => s.user);
  const uid = storeUser?.id;
  const profile = useProfileStepData(uid);
  const dl = useDrivingLicenceStepData(uid);
  const vehicles = useMyVehicles(uid);
  const counts = useDashboardCounts(uid);
  // The Share Access tile counts people, from the same query as the Share Access cards.
  const shared = useSharedPeople(uid);

  const fullName = profile.data?.fullName || storeUser?.fullName || '';
  const email = profile.data?.email ?? '';
  return {
    fullName,
    firstName: fullName.split(/\s+/)[0] ?? '',
    email,
    avatarUrl: profile.data?.avatarUrl ?? null,
    vehicles: vehicles.data ?? [],
    counts: { ...(counts.data ?? EMPTY_COUNTS), shares: shared.data?.length ?? null },
    completion: profileCompletion({
      profile: !!fullName && !!email,
      drivingLicence: !!dl.data,
      vehicle: (vehicles.data?.length ?? 0) > 0,
    }),
    loading: profile.isLoading || dl.isLoading || vehicles.isLoading,
  };
}
