import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/api/errors';
import { latestSavedDocuments, listMyDocuments, type MyDocument } from '@/api/services/myDocuments.service';
import { DOCUMENT_KEYS } from '@/constants/onboarding';
import type { SavedDocuments } from '@/screens/onboarding/schemas/documents.schema';
import { saveProfileStep, type ProfileStepResult, type ProfileStepSave } from '@/api/services/profileStep.service';
import { queryKeys } from './queryKeys';
import { invalidateProfileCompletion } from './useProfileCompletionRefresh';

/** The selected vehicle's documents + the driving licence (My Documents). */
export function useMyDocuments(uid: string | undefined, vehicleId: string | null) {
  return useQuery<MyDocument[], ApiError>({
    queryKey: [...queryKeys.vehicleDocuments(uid ?? ''), vehicleId],
    queryFn: () => listMyDocuments(vehicleId as string, uid as string),
    enabled: !!uid && !!vehicleId,
  });
}

/**
 * The selected vehicle's saved documents, newest per type (RC, Insurance, Pollution, FASTag): what
 * locks a document card. Re-read per vehicle, so switching the vehicle switches the locks.
 */
export function useSavedVehicleDocuments(uid: string | undefined, vehicleId: string | null) {
  const docs = useMyDocuments(uid, vehicleId);
  const saved = useMemo<SavedDocuments>(() => {
    const latest = latestSavedDocuments(docs.data);
    return Object.fromEntries(DOCUMENT_KEYS.flatMap(k => (latest[k] ? [[k, latest[k]]] : [])));
  }, [docs.data]);
  return { saved, isLoading: docs.isLoading && !!vehicleId };
}

/** My Profile edits (name, email, photo): the same writes as onboarding 1/3; refreshes the profile. */
export function useEditProfile(uid: string) {
  const queryClient = useQueryClient();
  return useMutation<ProfileStepResult, ApiError, ProfileStepSave>({
    mutationFn: input => saveProfileStep(uid, input),
    onSuccess: () => {
      invalidateProfileCompletion(queryClient, uid);
      queryClient.invalidateQueries({ queryKey: queryKeys.bootstrap(uid) });
    },
  });
}
