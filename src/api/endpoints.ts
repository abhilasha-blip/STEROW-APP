/**
 * THE single registry of every backend path the app calls, grouped by server.
 * Base URLs live in `src/config/env.ts`; no other file may contain a URL or path string
 * (enforced by `npm run check:urls`).
 *
 * NEVER add the website's internal server-function routes: their hashes change with every web
 * build (check:urls rejects them).
 */
export const ENDPOINTS = {
  /** STEROW app server (`APP_API_BASE_URL`): `{ data }` / `{ error: { code, message } }`. */
  APP: {
    AUTH: {
      OTP_REQUEST: '/auth/otp/request',
      OTP_VERIFY: '/auth/otp/verify',
    },
  },
  /** Supabase (`SUPABASE_URL`), called through supabase-js: table, RPC and storage names only. */
  SUPABASE: {
    REST: {
      USER_DETAILS: 'user_details',
      USER_ROLES: 'user_roles',
    },
    RPC: {
      MY_PERMISSIONS: 'my_permissions',
    },
  },
} as const;

export type OtpPurpose = 'signin' | 'signup';
