import { ApiError } from '../errors';
import {
  drivingLicenseUrl,
  fetchDrivingLicense,
  normaliseDlNumber,
  saveDrivingLicense,
  uploadDrivingLicenseFile,
} from './drivingLicense.service';
import { avatarUrl, fetchProfile, updateProfile, uploadAvatar } from './profile.service';
import type { LocalFile } from './storage.service';
import { logger } from '@/utils/logger';

/** What onboarding 1/4 starts from: the saved profile and DL (URLs signed for display). */
export type ProfileStepData = {
  fullName: string;
  avatarPath: string | null;
  /** Signed URL of the saved avatar (null: none, or it couldn't be signed). */
  avatarUrl: string | null;
  dl: { dlNumber: string; documentPath: string | null; previewUrl: string | null } | null;
};

const signOrNull = async (sign: () => Promise<string>, what: string) => {
  try {
    return await sign();
  } catch (e) {
    logger.warn(`${what}: signed URL failed`, { kind: e instanceof ApiError ? e.kind : 'unknown' });
    return null;
  }
};

export async function loadProfileStep(uid: string): Promise<ProfileStepData> {
  const [profile, dl] = await Promise.all([fetchProfile(uid), fetchDrivingLicense(uid)]);
  const [avatar, dlPreview] = await Promise.all([
    profile.avatarPath ? signOrNull(() => avatarUrl(profile.avatarPath!), 'avatar') : null,
    dl?.documentPath ? signOrNull(() => drivingLicenseUrl(dl.documentPath!), 'driving licence') : null,
  ]);
  return {
    fullName: profile.fullName,
    avatarPath: profile.avatarPath,
    avatarUrl: avatar,
    dl: dl ? { dlNumber: dl.dlNumber, documentPath: dl.documentPath, previewUrl: dlPreview } : null,
  };
}

export type ProfileStepSave = {
  /** Only when it differs from the saved name. */
  fullName?: string;
  /** A new avatar to upload (preset image or photo), `null` to clear it, undefined = unchanged. */
  avatar?: LocalFile | null;
  dlNumber: string;
  /** A newly picked licence file; otherwise the saved one (`existingDlPath`) is kept. */
  dlFile?: LocalFile;
  existingDlPath: string | null;
};

/**
 * Uploads already done in this screen session, keyed by the local file uri, so pressing Next again
 * after a later step failed doesn't upload the same file twice.
 */
export type ProfileStepProgress = { avatar?: { uri: string; path: string }; dl?: { uri: string; path: string } };

export type ProfileStepResult = { photoUpdated: boolean };

/**
 * Onboarding 1/4 Next: validate the DL first (nothing is uploaded if it can't be saved), then
 * avatar upload → PATCH user_details (name / avatar_url) → DL upload → DL upsert.
 */
export async function saveProfileStep(
  uid: string,
  input: ProfileStepSave,
  progress: ProfileStepProgress = {},
  now: () => number = Date.now,
): Promise<ProfileStepResult> {
  if (!normaliseDlNumber(input.dlNumber)) {
    throw new ApiError({ kind: 'validation', code: 'DL_NUMBER_REQUIRED', message: 'Enter the licence number' });
  }
  if (!input.dlFile && !input.existingDlPath) {
    throw new ApiError({ kind: 'validation', code: 'DL_FILE_REQUIRED', message: 'Upload a photo or PDF of your licence' });
  }

  let avatarPath: string | null | undefined;
  if (input.avatar) {
    const done = progress.avatar?.uri === input.avatar.uri ? progress.avatar.path : undefined;
    avatarPath = done ?? (await uploadAvatar(uid, input.avatar, now()));
    progress.avatar = { uri: input.avatar.uri, path: avatarPath };
  } else if (input.avatar === null) {
    avatarPath = null;
  }
  await updateProfile(uid, { fullName: input.fullName, avatarPath });

  let documentPath = input.existingDlPath;
  if (input.dlFile) {
    const done = progress.dl?.uri === input.dlFile.uri ? progress.dl.path : undefined;
    documentPath = done ?? (await uploadDrivingLicenseFile(uid, input.dlFile, now()));
    progress.dl = { uri: input.dlFile.uri, path: documentPath };
  }
  await saveDrivingLicense(uid, { dlNumber: input.dlNumber, documentPath });
  return { photoUpdated: avatarPath !== undefined && avatarPath !== null };
}
