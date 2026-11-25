import { useQuery } from '@tanstack/react-query';
import type { ApiError } from '@/api/errors';
import {
  fetchDashboardCounts,
  fetchVehicleDocumentCounts,
  type DashboardCounts,
  type ServerCounts,
} from '@/api/services/dashboard.service';
import type { MyVehicle } from '@/api/services/vehicle.service';
import { useAuthStore } from '@/store/auth.store';
import { getProfileCompletion, type ProfileCompletion } from '@/utils/profileCompletion';
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

/** Documents per vehicle (profile completion: "at least one vehicle with a document"). */
export function useVehicleDocumentCounts(uid: string | undefined, vehicleIds: readonly string[] | undefined) {
  const ids = vehicleIds ?? [];
  return useQuery<Record<string, number>, ApiError>({
    queryKey: queryKeys.vehicleDocumentCounts(uid ?? '', ids),
    queryFn: () => fetchVehicleDocumentCounts(ids),
    enabled: !!uid && ids.length > 0,
    staleTime: 0,
  });
}

/**
 * Everything the dashboard shows that comes from the backend: user_details (name, email, avatar), the
 * licence, the active vehicles and the tile counts. Profile completion: getProfileCompletion (name,
 * email, photo, mobile, licence number + file, a vehicle with a document).
 */
export function useDashboard(): DashboardData {
  const storeUser = useAuthStore(s => s.user);
  const uid = storeUser?.id;
  const profile = useProfileStepData(uid);
  const dl = useDrivingLicenceStepData(uid);
  const vehicles = useMyVehicles(uid);
  const vehicleDocs = useVehicleDocumentCounts(uid, vehicles.data?.map(v => v.id));
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
    completion: getProfileCompletion(
      { fullName, email, avatarPath: profile.data?.avatarPath },
      dl.data,
      (vehicles.data ?? []).map(v => ({ documentCount: vehicleDocs.data?.[v.id] ?? 0 })),
    ),
    loading: profile.isLoading || dl.isLoading || vehicles.isLoading || vehicleDocs.isLoading,
  };
}
