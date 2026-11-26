import { z } from 'zod';
import { isFeatureEnabled } from '@/config/features';
import { toDataUrl } from '@/utils/base64';
import { fromOcrResponse, type AutofillDocType, type AutofillValues } from '@/utils/documentAutofill';
import { logger } from '@/utils/logger';
import { appPost } from '../appClient';
import { ENDPOINTS } from '../endpoints';
import { normalizeError } from '../errors';
import { readLocalFile } from '../files';
import type { LocalFile } from './storage.service';
import { DOCUMENT_TABLES } from './vehicleDocuments.service';

/**
 * Document OCR: the ONLY place that calls the backend's OCR. Behind the OCR_ENABLED flag (default off):
 * off → `unavailable` and the user types the details, as before. Contract (docs/api/ocr-findings.md):
 * - licence: `POST APP/ocr/driving-license { image }` → `{ dl_number, issued_on, valid_upto, vehicle_classes }`
 * - RC / insurance / PUC / FASTag: `POST APP/ocr/document { table, image }` → that vdocs table's columns
 * where `image` is a data URL ("data:image/jpeg;base64,…"), as the web's FileReader.readAsDataURL.
 */
export type OcrFailure = 'timeout' | 'unreadable' | 'lowConfidence' | 'empty' | 'error';

export type OcrReadResult =
  | { status: 'ok'; fields: AutofillValues }
  | { status: 'unavailable' }
  | { status: 'failed'; reason: OcrFailure };

/** Generous: the provider reads a photo of a few MB. On timeout the user types the details. */
export const OCR_TIMEOUT_MS = 30_000;
/** A response carrying an overall `confidence` (0–1) below this is treated as unreadable. */
export const OCR_MIN_CONFIDENCE = 0.5;

const { OCR } = ENDPOINTS.APP;

/** Any JSON object (unknown keys are ignored; values are validated field by field). */
const Response = z.record(z.string(), z.unknown());

const UNREADABLE = /could not read|couldn't read|unable to read|not readable|unreadable|no text|not a (driving )?licen[cs]e|invalid image/i;

function failure(e: unknown): OcrFailure {
  const err = normalizeError(e);
  if (err.kind === 'timeout') {
    return 'timeout';
  }
  if (err.status === 422 || UNREADABLE.test(err.message)) {
    return 'unreadable';
  }
  return 'error';
}

async function read(
  docType: AutofillDocType,
  file: LocalFile,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<OcrReadResult> {
  if (!isFeatureEnabled('OCR_ENABLED')) {
    return { status: 'unavailable' };
  }
  try {
    const image = toDataUrl(file.mimeType, await readLocalFile(file.uri));
    const raw = await appPost(
      docType === 'dl' ? OCR.DRIVING_LICENSE : OCR.DOCUMENT,
      docType === 'dl' ? { image } : { table: DOCUMENT_TABLES[docType], image },
      { signal: options.signal, timeoutMs: options.timeoutMs ?? OCR_TIMEOUT_MS },
    );
    const parsed = Response.safeParse(raw);
    if (!parsed.success) {
      return { status: 'failed', reason: 'unreadable' };
    }
    const confidence = parsed.data.confidence;
    if (typeof confidence === 'number' && confidence < OCR_MIN_CONFIDENCE) {
      return { status: 'failed', reason: 'lowConfidence' };
    }
    const fields = fromOcrResponse(docType, parsed.data);
    if (!Object.keys(fields).length) {
      return { status: 'failed', reason: 'empty' };
    }
    return { status: 'ok', fields };
  } catch (e) {
    const reason = failure(e);
    // Never the image or the values: only what failed.
    logger.info('ocr failed', { docType, reason });
    return { status: 'failed', reason };
  }
}

export const ocrService = {
  /** False while the flag is off: no "Or", no "Reading your document…", the form as before. */
  isAvailable: (_docType?: AutofillDocType) => isFeatureEnabled('OCR_ENABLED'),
  read,
};
