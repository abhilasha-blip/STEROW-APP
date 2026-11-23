import type { DocumentKey } from '@/constants/onboarding';
import type { LocalFile } from './storage.service';
import type { VehicleRef } from './vehicle.service';
import { saveVehicleDocument, type DocumentFields } from './vehicleDocuments.service';

export type DocumentInput = { file: LocalFile | null; fields: DocumentFields };

export type DocumentsStepSave = {
  /** The selected vehicle (created earlier with "Add new vehicle", or one the user already has). */
  vehicle: VehicleRef;
  /** Only the documents that were added (each optional): a file, typed details, or both. */
  documents: Partial<Record<DocumentKey, DocumentInput>>;
};

/** Documents already saved in this screen session (per vehicle): a retry skips them. */
export type DocumentsStepProgress = { vehicleId?: string; saved?: Partial<Record<DocumentKey, string>> };

/** 3/3 Next: save each added document against the selected vehicle. */
export async function saveDocumentsStep(
  uid: string,
  input: DocumentsStepSave,
  progress: DocumentsStepProgress = {},
): Promise<{ vehicleId: string; documents: DocumentKey[] }> {
  if (progress.vehicleId !== input.vehicle.id) {
    progress.vehicleId = input.vehicle.id;
    progress.saved = {};
  }
  const saved = (progress.saved ??= {});
  for (const [key, doc] of Object.entries(input.documents) as [DocumentKey, DocumentInput][]) {
    if (!saved[key]) {
      saved[key] = await saveVehicleDocument(uid, key, input.vehicle, doc.file, doc.fields);
    }
  }
  return { vehicleId: input.vehicle.id, documents: Object.keys(saved) as DocumentKey[] };
}
