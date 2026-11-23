import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/api/errors';
import { listMyDocuments, type MyDocument } from '@/api/services/myDocuments.service';
import { saveProfileStep, type ProfileStepResult, type ProfileStepSave } from '@/api/services/profileStep.service';
import { queryKeys } from './queryKeys';

/** The selected vehicle's documents + the driving licence (My Documents). */
export function useMyDocuments(uid: string | undefined, vehicleId: string | null) {
  return useQuery<MyDocument[], ApiError>({
    queryKey: [...queryKeys.vehicleDocuments(uid ?? ''), vehicleId],
    queryFn: () => listMyDocuments(vehicleId as string, uid as string),
    enabled: !!uid && !!vehicleId,
  });
}

/** My Profile edits (name, email, photo): the same writes as onboarding 1/3; refreshes the profile. */
export function useEditProfile(uid: string) {
  const queryClient = useQueryClient();
  return useMutation<ProfileStepResult, ApiError, ProfileStepSave>({
    mutationFn: input => saveProfileStep(uid, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profileStep(uid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bootstrap(uid) });
    },
  });
}
