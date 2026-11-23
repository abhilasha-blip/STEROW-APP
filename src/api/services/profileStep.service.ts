import { ApiError } from '../errors';
import { avatarUrl, fetchProfile, updateProfile, uploadAvatar } from './profile.service';
import type { LocalFile } from './storage.service';
import { logger } from '@/utils/logger';

/** Upload already done in this screen session, keyed by the local uri (a retry doesn't re-upload). */
export type UploadProgress = { uri: string; path: string };

/** A signed URL for display, or null if signing failed (logged; the screen still works). */
export const signOrNull = async (sign: () => Promise<string>, what: string): Promise<string | null> => {
  try {
    return await sign();
  } catch (e) {
    logger.warn(`${what}: signed URL failed`, { kind: e instanceof ApiError ? e.kind : 'unknown' });
    return null;
  }
};

/** Onboarding 1/3 starts from the saved profile. */
export type ProfileStepData = {
  fullName: string;
  /** '' when none / a placeholder. */
  email: string;
  avatarPath: string | null;
  /** Signed URL of the saved avatar (null: none, or it couldn't be signed). */
  avatarUrl: string | null;
};

export async function loadProfileStep(uid: string): Promise<ProfileStepData> {
  const profile = await fetchProfile(uid);
  const url = profile.avatarPath ? await signOrNull(() => avatarUrl(profile.avatarPath!), 'avatar') : null;
  return { fullName: profile.fullName, email: profile.email, avatarPath: profile.avatarPath, avatarUrl: url };
}

export type ProfileStepSave = {
  /** Only when it differs from the saved name. */
  fullName?: string;
  /** Only when it differs from the saved email. */
  email?: string;
  /** A new avatar to upload (preset image or photo), `null` to clear it, undefined = unchanged. */
  avatar?: LocalFile | null;
};

export type ProfileStepProgress = { avatar?: UploadProgress };

/** What was sent: drives the toast ("Photo updated" / "Profile saved" / none). */
export type ProfileStepResult = { photoUpdated: boolean; profileUpdated: boolean };

/** 1/3 Next: avatar upload → PATCH user_details (name / email / avatar_url), only what changed. */
export async function saveProfileStep(
  uid: string,
  input: ProfileStepSave,
  progress: ProfileStepProgress = {},
  now: () => number = Date.now,
): Promise<ProfileStepResult> {
  let avatarPath: string | null | undefined;
  if (input.avatar) {
    const done = progress.avatar?.uri === input.avatar.uri ? progress.avatar.path : undefined;
    avatarPath = done ?? (await uploadAvatar(uid, input.avatar, now()));
    progress.avatar = { uri: input.avatar.uri, path: avatarPath };
  } else if (input.avatar === null) {
    avatarPath = null;
  }
  await updateProfile(uid, { fullName: input.fullName, email: input.email, avatarPath });
  return {
    photoUpdated: typeof avatarPath === 'string',
    profileUpdated: input.fullName !== undefined || input.email !== undefined || avatarPath !== undefined,
  };
}
