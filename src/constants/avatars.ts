import type { ImageSourcePropType } from 'react-native';

/**
 * Preset avatars, in the order of the "Edit Profile Image" grid.
 *
 * The images are cropped from the single sprite sheet embedded in the Figma export
 * (design/onboarding/step1-avatar-picker.svg). The sprite holds 12 distinct avatars; the
 * Figma grid shows 13 cells because one avatar is repeated (cells 5 and 6).
 *
 * `id` is the stable key we will send to / receive from the backend (mapping comes later).
 */
export type AvatarId =
  | 'avatar-01'
  | 'avatar-02'
  | 'avatar-03'
  | 'avatar-04'
  | 'avatar-05'
  | 'avatar-06'
  | 'avatar-07'
  | 'avatar-08'
  | 'avatar-09'
  | 'avatar-10'
  | 'avatar-11'
  | 'avatar-12';

export type PresetAvatar = { id: AvatarId; source: ImageSourcePropType };

export const AVATARS: readonly PresetAvatar[] = [
  { id: 'avatar-01', source: require('@/assets/images/avatars/avatar-01.png') },
  { id: 'avatar-02', source: require('@/assets/images/avatars/avatar-02.png') },
  { id: 'avatar-03', source: require('@/assets/images/avatars/avatar-03.png') },
  { id: 'avatar-04', source: require('@/assets/images/avatars/avatar-04.png') },
  { id: 'avatar-05', source: require('@/assets/images/avatars/avatar-05.png') },
  { id: 'avatar-06', source: require('@/assets/images/avatars/avatar-06.png') },
  { id: 'avatar-07', source: require('@/assets/images/avatars/avatar-07.png') },
  { id: 'avatar-08', source: require('@/assets/images/avatars/avatar-08.png') },
  { id: 'avatar-09', source: require('@/assets/images/avatars/avatar-09.png') },
  { id: 'avatar-10', source: require('@/assets/images/avatars/avatar-10.png') },
  { id: 'avatar-11', source: require('@/assets/images/avatars/avatar-11.png') },
  { id: 'avatar-12', source: require('@/assets/images/avatars/avatar-12.png') },
];

/** Shown before the user picks anything (the design's default selection). */
export const DEFAULT_AVATAR_ID: AvatarId = 'avatar-01';

const BY_ID = new Map(AVATARS.map(a => [a.id, a]));

export const getAvatar = (id: string): PresetAvatar | undefined => BY_ID.get(id as AvatarId);

export const isAvatarId = (id: string): id is AvatarId => BY_ID.has(id as AvatarId);

/** The profile image choice: a preset avatar, a photo (local uri for now), or none. */
export type AvatarValue = { type: 'preset'; id: AvatarId } | { type: 'photo'; uri: string } | null;

export const isSameAvatar = (a: AvatarValue, b: AvatarValue): boolean => {
  if (a === null || b === null) {
    return a === b;
  }
  if (a.type === 'preset' && b.type === 'preset') {
    return a.id === b.id;
  }
  return a.type === 'photo' && b.type === 'photo' && a.uri === b.uri;
};
