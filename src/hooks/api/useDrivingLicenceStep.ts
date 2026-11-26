import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/api/errors';
import {
  loadDrivingLicenceStep,
  saveDrivingLicenceStep,
  type DrivingLicenceStepData,
  type DrivingLicenceStepProgress,
  type DrivingLicenceStepSave,
} from '@/api/services/drivingLicenceStep.service';
import { ENDPOINTS } from '@/api/endpoints';
import type { MyDocument } from '@/api/services/myDocuments.service';
import type { DrivingLicenceFormValues } from '@/screens/onboarding/schemas/drivingLicence.schema';
import { localFileFromUri } from './useProfileStep';
import { queryKeys } from './queryKeys';
import { invalidateProfileCompletion } from './useProfileCompletionRefresh';

/** Form values → the save request: a new local file is uploaded, the saved one is kept as is. */
export function toDrivingLicenceStepSave(
  values: DrivingLicenceFormValues,
  saved: DrivingLicenceStepData | undefined,
): DrivingLicenceStepSave {
  const uri = values.dlImageUri;
  return {
    dlNumber: values.dlNumber,
    dlFile: uri && uri !== saved?.previewUrl ? localFileFromUri(uri) : undefined,
    existingDlPath: uri ? saved?.documentPath ?? null : null,
    issuedOn: values.issuedOn,
    validUpto: values.validUpto,
  };
}

/** The saved licence as the 2/3 form starts from. */
export const drivingLicencePrefill = (saved: DrivingLicenceStepData | undefined): Partial<DrivingLicenceFormValues> =>
  saved
    ? { dlNumber: saved.dlNumber, dlImageUri: saved.previewUrl, issuedOn: saved.issuedOn, validUpto: saved.validUpto }
    : {};

/** The saved licence as a document (status, read-only card, View). */
export const savedLicenceDocument = (saved: DrivingLicenceStepData | undefined): MyDocument | null =>
  saved
    ? {
        key: 'drivingLicence',
        id: saved.documentPath ?? saved.dlNumber,
        issuer: null,
        number: saved.dlNumber,
        expiry: saved.validUpto,
        documentPath: saved.documentPath,
        bucket: ENDPOINTS.SUPABASE.STORAGE.DRIVING_LICENSES,
      }
    : null;

/** Onboarding 2/3: the saved licence (prefill). Disabled without a user (dev QA screens). */
export function useDrivingLicenceStepData(uid: string | undefined) {
  return useQuery<DrivingLicenceStepData, ApiError>({
    queryKey: queryKeys.drivingLicenceStep(uid ?? ''),
    queryFn: () => loadDrivingLicenceStep(uid as string),
    enabled: !!uid,
    staleTime: 0,
    retry: 1,
  });
}

/** Onboarding 2/3 Next: uploads a new file and upserts the licence; a retry doesn't re-upload. */
export function useSaveDrivingLicenceStep(uid: string, saved: DrivingLicenceStepData | undefined) {
  const queryClient = useQueryClient();
  const progress = useRef<DrivingLicenceStepProgress>({});
  return useMutation<void, ApiError, DrivingLicenceFormValues>({
    mutationFn: values => saveDrivingLicenceStep(uid, toDrivingLicenceStepSave(values, saved), progress.current),
    onSuccess: () => invalidateProfileCompletion(queryClient, uid),
  });
}
