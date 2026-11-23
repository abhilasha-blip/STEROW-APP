import type { LocalFile } from './storage.service';

/**
 * Document OCR. The phase 1 brief treats OCR as having no public endpoint, so every reader returns
 * `unavailable` and the user types the values. (The public APP routes `/ocr/driving-license`,
 * `/ocr/rc`, `/ocr/document` do exist and answer 401 without a token – API_PLAN §9.6 O1. Wire them
 * here once the backend confirms the contract; callers already handle every status.)
 */
export type OcrResult<T> = { status: 'ok'; data: T } | { status: 'unavailable' } | { status: 'failed' };

export type DlOcrData = { dlNumber?: string; issuedOn?: string; validUpto?: string };

export const ocrService = {
  /** False while every reader returns `unavailable`: the UI asks for the values instead. */
  isAvailable: (_kind: 'dl' | 'rc') => false,
  readDl: async (_file: LocalFile): Promise<OcrResult<DlOcrData>> => ({ status: 'unavailable' }),
};
