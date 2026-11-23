import { ApiError } from '../errors';
import {
  drivingLicenseUrl,
  fetchDrivingLicense,
  normaliseDlNumber,
  saveDrivingLicense,
  uploadDrivingLicenseFile,
} from './drivingLicense.service';
import { signOrNull, type UploadProgress } from './profileStep.service';
import type { LocalFile } from './storage.service';

/** Onboarding 2/3 starts from the saved licence (file signed for display). */
export type DrivingLicenceStepData = {
  dlNumber: string;
  documentPath: string | null;
  previewUrl: string | null;
  issuedOn: string | null;
  validUpto: string | null;
} | null;

export async function loadDrivingLicenceStep(uid: string): Promise<DrivingLicenceStepData> {
  const dl = await fetchDrivingLicense(uid);
  if (!dl) {
    return null;
  }
  const previewUrl = dl.documentPath
    ? await signOrNull(() => drivingLicenseUrl(dl.documentPath!), 'driving licence')
    : null;
  return { dlNumber: dl.dlNumber, documentPath: dl.documentPath, previewUrl, issuedOn: dl.issuedOn, validUpto: dl.validUpto };
}

export type DrivingLicenceStepSave = {
  dlNumber: string;
  /** A newly picked licence file; otherwise the saved one (`existingDlPath`) is kept. */
  dlFile?: LocalFile;
  existingDlPath: string | null;
  issuedOn: string | null;
  validUpto: string | null;
};

export type DrivingLicenceStepProgress = { dl?: UploadProgress };

/** 2/3 Next: validate (nothing is uploaded if it can't be saved) → DL upload → DL upsert. */
export async function saveDrivingLicenceStep(
  uid: string,
  input: DrivingLicenceStepSave,
  progress: DrivingLicenceStepProgress = {},
  now: () => number = Date.now,
): Promise<void> {
  if (!normaliseDlNumber(input.dlNumber)) {
    throw new ApiError({ kind: 'validation', code: 'DL_NUMBER_REQUIRED', message: 'Enter the licence number' });
  }
  if (!input.dlFile && !input.existingDlPath) {
    throw new ApiError({ kind: 'validation', code: 'DL_FILE_REQUIRED', message: 'Upload a photo or PDF of your licence' });
  }
  let documentPath = input.existingDlPath;
  if (input.dlFile) {
    const done = progress.dl?.uri === input.dlFile.uri ? progress.dl.path : undefined;
    documentPath = done ?? (await uploadDrivingLicenseFile(uid, input.dlFile, now()));
    progress.dl = { uri: input.dlFile.uri, path: documentPath };
  }
  await saveDrivingLicense(uid, {
    dlNumber: input.dlNumber,
    documentPath,
    issuedOn: input.issuedOn,
    validUpto: input.validUpto,
  });
}
