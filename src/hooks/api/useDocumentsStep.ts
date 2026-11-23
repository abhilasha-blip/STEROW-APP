import { useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { ApiError } from '@/api/errors';
import {
  saveDocumentsStep,
  type DocumentsStepProgress,
  type DocumentsStepSave,
} from '@/api/services/documentsStep.service';
import type { LocalFile } from '@/api/services/storage.service';
import { fetchVehicleModelOptions, type VehicleModelOption } from '@/api/services/vehicleMaster.service';
import { attachedDocuments, type DocumentsFormValues } from '@/screens/onboarding/schemas/documents.schema';
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

/** 3/3 form values → the save request (only the documents with a file). */
export function toDocumentsStepSave(values: DocumentsFormValues, model: VehicleModelOption): DocumentsStepSave {
  const file = (f: { uri: string; name: string; mimeType: string }): LocalFile => ({
    uri: f.uri,
    name: f.name,
    mimeType: f.mimeType,
  });
  const documents: DocumentsStepSave['documents'] = {};
  for (const key of attachedDocuments(values)) {
    const f = values[key]!;
    documents[key] = {
      file: file(f),
      numbers:
        key === 'insurance'
          ? { policyNo: values.insurancePolicyNo, insurer: values.insurer }
          : key === 'pollution'
          ? { certificateNo: values.pucCertificateNo }
          : key === 'fastag'
          ? { fastagId: values.fastagId }
          : {},
    };
  }
  return { vehicleNumber: values.vehicleNumber, model, documents };
}

/** 3/3 Next: vehicle + added documents; a retry after a partial failure doesn't duplicate anything. */
export function useSaveDocumentsStep(uid: string) {
  const progress = useRef<DocumentsStepProgress>({});
  return useMutation<{ vehicleId: string }, ApiError, { values: DocumentsFormValues; model: VehicleModelOption }>({
    mutationFn: ({ values, model }) => saveDocumentsStep(uid, toDocumentsStepSave(values, model), progress.current),
  });
}
