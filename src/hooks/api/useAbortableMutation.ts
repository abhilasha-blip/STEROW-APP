import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import type { ApiError } from '@/api/errors';
import { normalizeError } from '@/api/errors';

export type AbortableMutation<TInput, TData> = UseMutationResult<TData, ApiError, TInput> & {
  /** Abort the in-flight request (also done automatically on unmount). */
  abort: () => void;
};

/**
 * useMutation with: no retries, an AbortSignal per call (aborted on unmount or on the next call),
 * errors normalised to ApiError, and no double submit (a call while pending is ignored).
 */
export function useAbortableMutation<TInput, TData>(
  fn: (input: TInput, signal: AbortSignal) => Promise<TData>,
): AbortableMutation<TInput, TData> {
  const controllerRef = useRef<AbortController | null>(null);

  const mutation = useMutation<TData, ApiError, TInput>({
    retry: 0,
    mutationFn: async input => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      try {
        return await fn(input, controller.signal);
      } catch (e) {
        throw normalizeError(e);
      } finally {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }
      }
    },
  });

  const abort = useCallback(() => controllerRef.current?.abort(), []);
  useEffect(() => abort, [abort]);

  const { mutate: rawMutate, mutateAsync: rawMutateAsync, isPending } = mutation;
  const pendingRef = useRef(false);
  pendingRef.current = isPending;

  const mutate = useCallback<typeof rawMutate>(
    (...args) => {
      if (pendingRef.current) {
        return;
      }
      pendingRef.current = true;
      rawMutate(...args);
    },
    [rawMutate],
  );

  return { ...mutation, mutate, mutateAsync: rawMutateAsync, abort };
}
