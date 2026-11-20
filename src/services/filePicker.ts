import { errorCodes, isErrorWithCode, pick, types } from '@react-native-documents/picker';
import { logger } from '@/utils/logger';
import { pickPhoto, type PhotoSource, type PickPhotoResult } from './imagePicker';

/** "Take photo" / "Choose from gallery" / "Choose file (PDF)". */
export type FileSource = PhotoSource | 'document';

/** Opens the system document picker for a single PDF. Validation (type/size) is left to the caller. */
export async function pickPdf(): Promise<PickPhotoResult> {
  try {
    const [file] = await pick({ type: [types.pdf], allowMultiSelection: false, mode: 'import' });
    if (!file?.uri) {
      return { status: 'cancelled' };
    }
    return {
      status: 'picked',
      photo: {
        uri: file.uri,
        fileName: file.name ?? undefined,
        type: file.type ?? undefined,
        fileSize: file.size ?? undefined,
      },
    };
  } catch (error) {
    if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) {
      return { status: 'cancelled' };
    }
    logger.warn('document picker failed', { message: String(error) });
    return { status: 'error', reason: 'other' };
  }
}

export function pickFile(source: FileSource): Promise<PickPhotoResult> {
  return source === 'document' ? pickPdf() : pickPhoto(source);
}
