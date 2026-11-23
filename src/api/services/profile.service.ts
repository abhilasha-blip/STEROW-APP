import { z } from 'zod';
import { ENDPOINTS, STORAGE_PATHS } from '../endpoints';
import { ApiError } from '../errors';
import { unwrap } from '../rest';
import { parseOrThrow } from '../schemas/auth.schemas';
import { getSupabase } from '../supabase';
import { getSignedUrl, uploadFile, type LocalFile } from './storage.service';

const { REST, STORAGE } = ENDPOINTS.SUPABASE;

/** `user_details` columns read by onboarding 1/3 (key `id` = uid). No DOB column exists (pending backend). */
const ProfileRow = z.object({
  full_name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
});

export type Profile = {
  fullName: string;
  phone: string;
  /** Storage path in the `avatars` bucket (not a URL), or null. */
  avatarPath: string | null;
};

const UpdatedRows = z.array(z.object({ id: z.string() }));

export async function fetchProfile(uid: string): Promise<Profile> {
  const res = unwrap(
    await getSupabase().from(REST.USER_DETAILS).select('full_name,email,phone,avatar_url').eq('id', uid).maybeSingle(),
  );
  const row = res.data ? parseOrThrow(ProfileRow, res.data, 'user_details') : null;
  return {
    fullName: row?.full_name ?? '',
    phone: row?.phone ?? '',
    avatarPath: row?.avatar_url || null,
  };
}

/**
 * PATCH user_details: only the fields given. Email and DOB are never sent (read-only on the web /
 * no column). A PATCH that matches no row (RLS) is an error, not a silent success.
 */
export async function updateProfile(
  uid: string,
  changes: { fullName?: string; avatarPath?: string | null },
): Promise<void> {
  const body: Record<string, string | null> = {};
  if (changes.fullName !== undefined) {
    body.full_name = changes.fullName;
  }
  if (changes.avatarPath !== undefined) {
    body.avatar_url = changes.avatarPath;
  }
  if (!Object.keys(body).length) {
    return;
  }
  const res = unwrap(await getSupabase().from(REST.USER_DETAILS).update(body).eq('id', uid).select('id'));
  if (!parseOrThrow(UpdatedRows, res.data, 'user_details update').length) {
    throw new ApiError({ kind: 'server', code: 'NOT_UPDATED', message: 'Profile not updated', status: 403 });
  }
}

/** Uploads the photo / preset image to `avatars/<uid>/<timestamp>-<name>`; returns the path. */
export function uploadAvatar(uid: string, file: LocalFile, now: number = Date.now()): Promise<string> {
  return uploadFile(STORAGE.AVATARS, STORAGE_PATHS.avatar(uid, now, file.name), file);
}

export const avatarUrl = (path: string) => getSignedUrl(STORAGE.AVATARS, path);
