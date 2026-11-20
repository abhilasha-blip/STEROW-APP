import {
  launchCamera,
  launchImageLibrary,
  type CameraOptions,
  type ImageLibraryOptions,
  type ImagePickerResponse,
} from 'react-native-image-picker';
import { MAX_UPLOAD_BYTES } from '@/constants/onboarding';
import { logger } from '@/utils/logger';

export type PhotoSource = 'camera' | 'gallery';

export type PickedPhoto = {
  uri: string;
  width?: number;
  height?: number;
  fileSize?: number;
  type?: string;
  fileName?: string;
};

export type PickPhotoResult =
  | { status: 'picked'; photo: PickedPhoto }
  | { status: 'cancelled' }
  | { status: 'error'; reason: 'camera_unavailable' | 'permission' | 'too_large' | 'other' };

/**
 * Downscaled JPEG: plenty for OCR on a licence and for an avatar, and keeps uploads small.
 * (No upload happens yet – callers only receive the local file uri.)
 */
const COMMON = {
  mediaType: 'photo',
  maxWidth: 2000,
  maxHeight: 2000,
  quality: 0.8,
  includeBase64: false,
} as const;

const CAMERA_OPTIONS: CameraOptions = { ...COMMON, saveToPhotos: false, cameraType: 'back' };
const LIBRARY_OPTIONS: ImageLibraryOptions = { ...COMMON, selectionLimit: 1 };

export function toPickResult(response: ImagePickerResponse): PickPhotoResult {
  if (response.didCancel) {
    return { status: 'cancelled' };
  }
  if (response.errorCode) {
    logger.warn('image picker error', { code: response.errorCode });
    if (response.errorCode === 'camera_unavailable') {
      return { status: 'error', reason: 'camera_unavailable' };
    }
    if (response.errorCode === 'permission') {
      return { status: 'error', reason: 'permission' };
    }
    return { status: 'error', reason: 'other' };
  }
  const asset = response.assets?.[0];
  if (!asset?.uri) {
    return { status: 'cancelled' };
  }
  if (asset.fileSize !== undefined && asset.fileSize > MAX_UPLOAD_BYTES) {
    return { status: 'error', reason: 'too_large' };
  }
  return {
    status: 'picked',
    photo: {
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      fileSize: asset.fileSize,
      type: asset.type,
      fileName: asset.fileName,
    },
  };
}

/** Opens the camera or the photo library and resolves with the local file uri (or why not). */
export async function pickPhoto(source: PhotoSource): Promise<PickPhotoResult> {
  try {
    const response =
      source === 'camera'
        ? await launchCamera(CAMERA_OPTIONS)
        : await launchImageLibrary(LIBRARY_OPTIONS);
    return toPickResult(response);
  } catch (error) {
    logger.warn('image picker threw', { message: String(error) });
    return { status: 'error', reason: 'other' };
  }
}
