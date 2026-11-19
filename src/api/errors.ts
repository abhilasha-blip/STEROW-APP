import { isAxiosError } from 'axios';

export type ApiErrorKind = 'network' | 'timeout' | 'validation' | 'server' | 'cancelled' | 'unknown';

/**
 * The only error type that leaves the API layer.
 * `message` is the backend's (or transport's) message, NEVER shown to users directly:
 * map it with `toUserError()` in errorMessages.ts.
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly code?: string;
  readonly raw?: unknown;

  constructor(params: {
    kind: ApiErrorKind;
    message: string;
    status?: number;
    code?: string;
    raw?: unknown;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.kind = params.kind;
    this.status = params.status;
    this.code = params.code;
    this.raw = params.raw;
  }
}

type UnknownRecord = Record<string, unknown>;
const isRecord = (v: unknown): v is UnknownRecord => typeof v === 'object' && v !== null;
const str = (v: unknown): string | undefined => (typeof v === 'string' && v.length ? v : undefined);

/**
 * Backend validation errors sometimes arrive as a JSON string (e.g. a zod issue list or
 * `{"error":{"message":"…"}}` serialised into the message). Pull a human message out of it.
 */
export function extractMessageFromRawJson(text: string): string | undefined {
  const trimmed = text.trim();
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) {
    return undefined;
  }
  try {
    return findMessage(JSON.parse(trimmed));
  } catch {
    return undefined;
  }
}

function findMessage(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const m = findMessage(item);
      if (m) {
        return m;
      }
    }
    return undefined;
  }
  if (!isRecord(value)) {
    return str(value);
  }
  return (
    str(value.message) ??
    str(value.msg) ??
    str(value.error_description) ??
    (isRecord(value.error) ? findMessage(value.error) : str(value.error))
  );
}

/** Message + code out of any of the backend envelopes: APP, PostgREST, GoTrue. */
function readEnvelope(body: unknown): { message?: string; code?: string } {
  if (typeof body === 'string') {
    return { message: extractMessageFromRawJson(body) ?? str(body) };
  }
  if (!isRecord(body)) {
    return {};
  }
  // APP server: { error: { code, message } }
  if (isRecord(body.error)) {
    const message = str(body.error.message);
    return {
      message: message ? extractMessageFromRawJson(message) ?? message : undefined,
      code: str(body.error.code),
    };
  }
  // PostgREST { code, message, details, hint } / GoTrue { error_code, msg } | { error, error_description }
  const message = str(body.message) ?? str(body.msg) ?? str(body.error_description) ?? str(body.error);
  return {
    message: message ? extractMessageFromRawJson(message) ?? message : undefined,
    code: str(body.error_code) ?? str(body.code),
  };
}

const kindForStatus = (status: number): ApiErrorKind =>
  status >= 500 ? 'server' : status >= 400 ? 'validation' : 'unknown';

/** Maps axios errors, Supabase AuthError / PostgrestError, raw-JSON strings and anything else to ApiError. */
export function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (isAxiosError(error)) {
    if (error.code === 'ERR_CANCELED') {
      return new ApiError({ kind: 'cancelled', message: 'Request cancelled', raw: error });
    }
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError({ kind: 'timeout', message: 'Request timed out', raw: error });
    }
    if (!error.response) {
      return new ApiError({ kind: 'network', message: 'Network error', raw: error });
    }
    const { status, data } = error.response;
    const { message, code } = readEnvelope(data);
    return new ApiError({
      kind: kindForStatus(status),
      message: message ?? `HTTP ${status}`,
      status,
      code,
      raw: data,
    });
  }

  if (isRecord(error)) {
    const name = str(error.name);
    // Supabase AuthRetryableFetchError / fetch TypeError: no response reached us.
    if (name === 'AuthRetryableFetchError' || (error instanceof TypeError && /network/i.test(error.message))) {
      return new ApiError({ kind: 'network', message: 'Network error', raw: error });
    }
    if (name === 'AbortError') {
      return new ApiError({ kind: 'cancelled', message: 'Request cancelled', raw: error });
    }
    // Supabase AuthError has `status`; PostgrestError has `code` + `details` + `hint`.
    const status = typeof error.status === 'number' ? error.status : undefined;
    const { message, code } = readEnvelope(error);
    if (message) {
      return new ApiError({
        kind: status ? kindForStatus(status) : name?.startsWith('Auth') || 'details' in error ? 'server' : 'unknown',
        message,
        status,
        code,
        raw: error,
      });
    }
  }

  if (typeof error === 'string') {
    return new ApiError({
      kind: 'validation',
      message: extractMessageFromRawJson(error) ?? error,
      raw: error,
    });
  }

  return new ApiError({ kind: 'unknown', message: 'Unknown error', raw: error });
}
