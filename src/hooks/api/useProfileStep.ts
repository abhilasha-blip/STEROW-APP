import { useRef } from 'react';
import { Image } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/errors';
import {
  loadProfileStep,
  saveProfileStep,
  type ProfileStepData,
  type ProfileStepProgress,
  type ProfileStepResult,
} from '@/api/services/profileStep.service';
import type { LocalFile } from '@/api/services/storage.service';
import { getAvatar, type AvatarValue } from '@/constants/avatars';
import type { ProfileFormValues } from '@/screens/onboarding/schemas/profile.schema';
import { queryKeys } from './queryKeys';

const TYPES: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf' };

/** A picked local file → upload input (type from the extension; camera/gallery photos are JPEG). */
export function localFileFromUri(uri: string, fallbackType = 'image/jpeg'): LocalFile {
  const name = decodeURIComponent(uri.split(/[?#]/)[0].split('/').pop() || 'file');
  const ext = /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase() ?? '';
  return { uri, name, mimeType: TYPES[ext] ?? fallbackType };
}

/** The avatar to upload: a preset is its bundled PNG, a photo the picked file. */
export function avatarFile(avatar: Exclude<AvatarValue, null>): LocalFile {
  if (avatar.type === 'preset') {
    const preset = getAvatar(avatar.id);
    const uri = preset ? Image.resolveAssetSource(preset.source)?.uri : undefined;
    if (!uri) {
      throw new ApiError({ kind: 'unknown', code: 'FILE_UNREADABLE', message: `No asset for ${avatar.id}` });
    }
    return { uri, name: `${avatar.id}.png`, mimeType: 'image/png' };
  }
  return localFileFromUri(avatar.uri);
}

/** The saved avatar as the form shows it (a photo at its signed URL), or null. */
export const savedAvatar = (data: ProfileStepData | undefined): AvatarValue =>
  data?.avatarUrl ? { type: 'photo', uri: data.avatarUrl } : null;

const sameAvatar = (a: AvatarValue, b: AvatarValue) =>
  a === b ||
  (!!a && !!b && (a.type === 'preset' ? b.type === 'preset' && a.id === b.id : b.type === 'photo' && a.uri === b.uri));

/** Form values → the save request: only what changed is sent; the saved DL file isn't re-uploaded. */
export function toProfileStepSave(values: ProfileFormValues, saved: ProfileStepData | undefined) {
  const avatarChanged = !sameAvatar(values.avatar, savedAvatar(saved));
  const dlUri = values.dlImageUri;
  return {
    fullName: values.fullName && values.fullName !== (saved?.fullName ?? '') ? values.fullName : undefined,
    avatar: !avatarChanged ? undefined : values.avatar ? avatarFile(values.avatar) : saved?.avatarPath ? null : undefined,
    dlNumber: values.dlNumber,
    dlFile: dlUri && dlUri !== saved?.dl?.previewUrl ? localFileFromUri(dlUri) : undefined,
    existingDlPath: dlUri ? saved?.dl?.documentPath ?? null : null,
  };
}

/** Onboarding 1/4: the saved profile + DL (prefill). Disabled without a user (dev QA screens). */
export function useProfileStepData(uid: string | undefined) {
  return useQuery<ProfileStepData, ApiError>({
    queryKey: queryKeys.profileStep(uid ?? ''),
    queryFn: () => loadProfileStep(uid as string),
    enabled: !!uid,
    staleTime: 0,
    retry: 1,
  });
}

/** Onboarding 1/4 Next: saves profile + DL; re-pressing Next after a failure doesn't re-upload. */
export function useSaveProfileStep(uid: string, saved: ProfileStepData | undefined) {
  const queryClient = useQueryClient();
  const progress = useRef<ProfileStepProgress>({});
  return useMutation<ProfileStepResult, ApiError, ProfileFormValues>({
    mutationFn: values => saveProfileStep(uid, toProfileStepSave(values, saved), progress.current),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bootstrap(uid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.profileStep(uid) });
    },
  });
}
