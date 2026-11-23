import { ApiError, normalizeError } from './errors';

type RestFailure = { error: { message: string } & object; status: number };

/**
 * PostgREST / Storage errors carry no HTTP status of their own: attach the response's so 4xx are
 * never retried. Status 0 = the fetch never completed (offline / aborted).
 */
export const restError = (res: RestFailure): ApiError =>
  res.status === 0
    ? new ApiError({ kind: 'network', message: res.error.message, raw: res.error })
    : normalizeError({ ...res.error, message: res.error.message, status: res.status });

/** Throws the normalised error of a supabase-js result, else returns it. */
export function unwrap<T extends { error: ({ message: string } & object) | null; status: number }>(
  res: T,
): T & { error: null } {
  if (res.error) {
    throw restError(res as RestFailure);
  }
  return res as T & { error: null };
}
