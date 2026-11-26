import { useCallback, useEffect, useRef, useState } from 'react';
import { ocrService } from '@/api/services/ocr.service';
import type { LocalFile } from '@/api/services/storage.service';
import { useToast } from '@/components/Toast';
import { strings } from '@/constants/strings';
import { mergeAutofill, type AutofillDocType, type AutofillField, type AutofillValues } from '@/utils/documentAutofill';

export type AutofillState =
  | { phase: 'idle' }
  /** "Reading your document…" (spinner on the card). */
  | { phase: 'reading' }
  /** The review form: pre-filled values; `filled` were read from the document ("Auto-filled – please check"). */
  | { phase: 'review'; values: AutofillValues; filled: AutofillField[] };

/**
 * Autofill from an uploaded document: after a file is picked → reading → a review form pre-filled with
 * what was read (each field editable) → Confirm hands the values back. The OCR flag off → nothing
 * happens (`start` resolves false) and the user fills the form as before. A timeout, an unreadable
 * document or nothing read → the toast "Could not read the document. Please enter the details." and the
 * same form with the current values (manual).
 */
export function useDocumentAutofill(docType: AutofillDocType) {
  const toast = useToast();
  const [state, setState] = useState<AutofillState>({ phase: 'idle' });
  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => abort.current?.abort(), []);

  /** Reads `file`; `current` = the form's values now (a read value replaces one only if non-empty). */
  const start = useCallback(
    async (file: LocalFile, current: AutofillValues): Promise<boolean> => {
      if (!ocrService.isAvailable(docType)) {
        return false;
      }
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      setState({ phase: 'reading' });
      const result = await ocrService.read(docType, file, { signal: controller.signal });
      if (controller.signal.aborted) {
        return false;
      }
      if (result.status === 'ok') {
        const { values, filled } = mergeAutofill(current, result.fields);
        setState({ phase: 'review', values, filled });
        return true;
      }
      if (result.status === 'unavailable') {
        setState({ phase: 'idle' });
        return false;
      }
      toast.error(strings.autofill.couldNotRead);
      setState({ phase: 'review', values: current, filled: [] });
      return true;
    },
    [docType, toast],
  );

  /** Closes the review form (Confirm or dismiss); a read in progress is dropped. */
  const close = useCallback(() => {
    abort.current?.abort();
    setState({ phase: 'idle' });
  }, []);

  return { state, start, close, reading: state.phase === 'reading' };
}
