import type { DocumentKey } from '@/constants/onboarding';
import type { LocalFile } from './storage.service';
import { createVehicle, type CreatedVehicle } from './vehicle.service';
import { saveVehicleDocument, type DocumentNumbers } from './vehicleDocuments.service';
import type { VehicleModelOption } from './vehicleMaster.service';

export type DocumentsStepSave = {
  vehicleNumber: string;
  model: VehicleModelOption;
  /** Only the documents that were added (each optional). */
  documents: Partial<Record<DocumentKey, { file: LocalFile; numbers: DocumentNumbers }>>;
};

/**
 * What already succeeded in this screen session: a retry reuses the vehicle (its number is unique) and
 * skips saved documents, so Next can be pressed again after a partial failure without duplicates.
 */
export type DocumentsStepProgress = { vehicle?: CreatedVehicle; saved?: Partial<Record<DocumentKey, string>> };

/** 3/3 Next: create the vehicle (minimal row) → save each added document. Returns the vehicle id. */
export async function saveDocumentsStep(
  uid: string,
  input: DocumentsStepSave,
  progress: DocumentsStepProgress = {},
): Promise<{ vehicleId: string; documents: DocumentKey[] }> {
  const sameVehicle =
    progress.vehicle?.vehicleNumber === input.vehicleNumber.toUpperCase().replace(/\s+/g, '') &&
    progress.vehicle.model.variantId === input.model.variantId;
  const vehicle = sameVehicle ? progress.vehicle! : await createVehicle(input.vehicleNumber, input.model);
  progress.vehicle = vehicle;
  progress.saved = sameVehicle ? progress.saved ?? {} : {};

  for (const [key, doc] of Object.entries(input.documents) as [DocumentKey, { file: LocalFile; numbers: DocumentNumbers }][]) {
    if (!progress.saved[key]) {
      progress.saved[key] = await saveVehicleDocument(uid, key, vehicle, doc.file, doc.numbers);
    }
  }
  return { vehicleId: vehicle.id, documents: Object.keys(progress.saved) as DocumentKey[] };
}
