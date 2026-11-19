import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { getEnv } from '@/config/env';
import { logger } from '@/utils/logger';
import { ApiError, normalizeError } from './errors';
import { assertOnline } from './network';
import { getSupabase } from './supabase';

export const APP_TIMEOUT_MS = 15_000;

type Timed = InternalAxiosRequestConfig & { metadata?: { startedAt: number } };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

let instance: AxiosInstance | undefined;

/** axios instance for the STEROW app server (`{ data }` / `{ error }` envelope). */
export function getAppClient(): AxiosInstance {
  if (instance) {
    return instance;
  }
  instance = axios.create({
    baseURL: getEnv().APP_API_BASE_URL,
    timeout: APP_TIMEOUT_MS,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  });

  instance.interceptors.request.use(async (config: Timed) => {
    await assertOnline();
    const { data } = await getSupabase().auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    config.metadata = { startedAt: Date.now() };
    logger.debug(`→ ${config.method?.toUpperCase()} ${config.url}`, config.data);
    return config;
  });

  instance.interceptors.response.use(
    response => {
      const config = response.config as Timed;
      const ms = config.metadata ? Date.now() - config.metadata.startedAt : undefined;
      logger.debug(`← ${response.status} ${config.url} (${ms} ms)`, response.data);
      const body: unknown = response.data;
      // A 2xx carrying { error } is still a failure.
      if (isRecord(body) && isRecord(body.error)) {
        const { message, code } = body.error;
        throw new ApiError({
          kind: 'validation',
          message: typeof message === 'string' ? message : 'Unknown error',
          code: typeof code === 'string' ? code : undefined,
          status: response.status,
          raw: body,
        });
      }
      if (isRecord(body) && 'data' in body) {
        response.data = body.data;
      }
      return response;
    },
    (error: unknown) => {
      const apiError = normalizeError(error);
      if (apiError.kind !== 'cancelled') {
        logger.warn(`✖ ${apiError.kind} ${apiError.status ?? ''} ${apiError.message}`);
      }
      return Promise.reject(apiError);
    },
  );
  return instance;
}

/** POST to the app server and return the unwrapped `data` (unknown: callers validate with zod). */
export async function appPost(
  path: string,
  body: unknown,
  options: { signal?: AbortSignal } = {},
): Promise<unknown> {
  try {
    const response = await getAppClient().post<unknown>(path, body, { signal: options.signal });
    return response.data;
  } catch (e) {
    throw e instanceof ApiError ? e : normalizeError(e);
  }
}

/** Test-only. */
export function __resetAppClientForTests(): void {
  instance = undefined;
}
