import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/api/errors';
import {
  saveDocumentsStep,
  type DocumentsStepProgress,
  type DocumentsStepSave,
} from '@/api/services/documentsStep.service';
import { createVehicle, listMyVehicles, type MyVehicle } from '@/api/services/vehicle.service';
import {
  fetchVehicleCatalog,
  fetchVehicleModelOptions,
  type VehicleCatalog,
  type VehicleModelOption,
} from '@/api/services/vehicleMaster.service';
import { DOCUMENT_KEYS } from '@/constants/onboarding';
import { documentStatus, type DocumentsFormValues } from '@/screens/onboarding/schemas/documents.schema';
import { queryKeys } from './queryKeys';

/** Master data changes rarely: one fetch per hour is plenty. */
const MASTER_STALE_MS = 60 * 60 * 1000;

export function useVehicleModels(enabled = true) {
  return useQuery<VehicleModelOption[], ApiError>({
    queryKey: queryKeys.vehicleModels(),
    queryFn: fetchVehicleModelOptions,
    staleTime: MASTER_STALE_MS,
    enabled,
  });
}

export function useVehicleCatalog(enabled = true) {
  return useQuery<VehicleCatalog, ApiError>({
    queryKey: queryKeys.vehicleCatalog(),
    queryFn: fetchVehicleCatalog,
    staleTime: MASTER_STALE_MS,
    enabled,
  });
}

/** The user's active vehicles (selector, carousel, counts). */
export function useMyVehicles(uid: string | undefined) {
  return useQuery<MyVehicle[], ApiError>({
    queryKey: queryKeys.myVehicles(uid ?? ''),
    queryFn: listMyVehicles,
    enabled: !!uid,
  });
}

/** "Add new vehicle": creates the minimal vehicle and refreshes the user's list. */
export function useCreateVehicle(uid: string) {
  const queryClient = useQueryClient();
  return useMutation<{ id: string }, ApiError, { vehicleNumber: string; model: VehicleModelOption }>({
    mutationFn: ({ vehicleNumber, model }) => createVehicle(vehicleNumber, model),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.myVehicles(uid) }),
  });
}

/** 3/3 form values → the save request: only the documents marked "Added". */
export function toDocumentsStepSave(values: DocumentsFormValues, vehicle: MyVehicle): DocumentsStepSave {
  const documents: DocumentsStepSave['documents'] = {};
  for (const key of DOCUMENT_KEYS) {
    const entry = values[key];
    if (documentStatus(key, entry) === 'added') {
      documents[key] = {
        file: entry.file ? { uri: entry.file.uri, name: entry.file.name, mimeType: entry.file.mimeType } : null,
        fields: entry.fields ?? {},
      };
    }
  }
  return { vehicle, documents };
}

/** 3/3 Next: saves the added documents; a retry after a partial failure doesn't duplicate any. */
export function useSaveDocumentsStep(uid: string) {
  const queryClient = useQueryClient();
  const progress = useRef<DocumentsStepProgress>({});
  return useMutation<{ vehicleId: string }, ApiError, { values: DocumentsFormValues; vehicle: MyVehicle }>({
    mutationFn: ({ values, vehicle }) => saveDocumentsStep(uid, toDocumentsStepSave(values, vehicle), progress.current),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.vehicleDocuments(uid) }),
  });
}
