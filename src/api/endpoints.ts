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
      /** One row per user (unique `user_id`): upsert on_conflict=user_id. */
      USER_DRIVING_LICENSES: 'user_driving_licenses',
      /** Vehicles owned by or shared with the user (RLS). */
      USER_VEHICLES: 'user_vehicles',
      VEHICLE_MAKES: 'vehicle_make_master',
      VEHICLE_MODELS: 'vehicle_model_master',
      VEHICLE_VARIANTS: 'vehicle_variant_master',
      /** Vehicle documents, one table per type; files in STORAGE.VEHICLE_DOCS. */
      VDOCS_RC: 'vdocs_regcertificate',
      VDOCS_INSURANCE: 'vdocs_insurance',
      VDOCS_POLLUTION: 'vdocs_pollution',
      VDOCS_FASTAG: 'vdocs_fastag',
      /** Vehicle shares (Share Access): member_role owner/family/driver/guest. */
      VEHICLE_SHARES: 'vehicle_shares',
      SERVICE_BOOKINGS: 'service_bookings',
    },
    RPC: {
      MY_PERMISSIONS: 'my_permissions',
    },
    /** Private buckets; the first path segment is the owner's uid. Viewed through signed URLs. */
    STORAGE: {
      /** `<uid>/<timestamp>-<name>` (profile photo). */
      AVATARS: 'avatars',
      /** `<uid>/<timestamp>-<sanitised name>` (DL photo / PDF). */
      DRIVING_LICENSES: 'driving-licenses',
      /** `<uid>/<uuid>.<ext>` (RC attached to user_vehicles.rc_document). */
      VEHICLE_RC: 'vehicle-rc',
      /** `<uid>/<table>/<uuid>.<ext>` (vdocs_*.document_path). */
      VEHICLE_DOCS: 'vehicle-docs',
    },
  },
} as const;

/** Storage object names: anything but letters, digits, `.`, `_`, `-` becomes `_` (as the web does). */
export const sanitiseFileName = (name: string): string => name.replace(/[^\w.-]/g, '_');

/**
 * Object paths inside the STORAGE buckets (same layout as the web). The first segment is always the
 * owner's uid: the bucket policies key on it.
 */
export const STORAGE_PATHS = {
  /** `avatars`: `<uid>/<timestamp>-<name>`. */
  avatar: (uid: string, timestamp: number, fileName: string) => `${uid}/${timestamp}-${sanitiseFileName(fileName)}`,
  /** `driving-licenses`: `<uid>/<timestamp>-<sanitised name>`. */
  drivingLicense: (uid: string, timestamp: number, fileName: string) =>
    `${uid}/${timestamp}-${sanitiseFileName(fileName)}`,
  /** `vehicle-docs`: `<uid>/<vdocs table>/<uuid>.<ext>` (as the web's My Documents). */
  vehicleDocument: (uid: string, table: string, id: string, extension: string) =>
    `${uid}/${table}/${id}.${sanitiseFileName(extension)}`,
} as const;

export type OtpPurpose = 'signin' | 'signup';
