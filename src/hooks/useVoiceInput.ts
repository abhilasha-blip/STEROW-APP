import { useCallback, useState } from 'react';

export type VoiceInputStatus = 'idle' | 'listening';

export type VoiceInput = {
  /** false until speech recognition is wired: the UI says "coming soon". */
  supported: boolean;
  status: VoiceInputStatus;
  /** Recognised text (always '' in the stub). */
  transcript: string;
  language: string;
  setLanguage: (code: string) => void;
  start: () => void;
  stop: () => void;
};

/**
 * STUB (UI only): no recording or speech recognition yet. start/stop only flip the status so the mic
 * card can show its listening state; replace the body with a real recogniser later (same shape).
 */
export function useVoiceInput(initialLanguage = 'en-IN'): VoiceInput {
  const [status, setStatus] = useState<VoiceInputStatus>('idle');
  const [language, setLanguage] = useState(initialLanguage);
  const start = useCallback(() => setStatus('listening'), []);
  const stop = useCallback(() => setStatus('idle'), []);
  return { supported: false, status, transcript: '', language, setLanguage, start, stop };
}
