import { z } from 'zod';
import { logger } from '@/utils/logger';
import { ApiError } from '../errors';

/** `POST /auth/otp/request` → data. Confirmed live 2026-11-19. */
export const OtpRequestResponse = z.object({
  requestId: z.string().min(1),
  isNewUser: z.boolean().optional(),
});
export type OtpRequestResponse = z.infer<typeof OtpRequestResponse>;

const TokenHashVariant = z.object({ tokenHash: z.string().min(1) });
const SessionVariant = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_in: z.number().optional(),
  token_type: z.string().optional(),
});

/**
 * `POST /auth/otp/verify` → data. The public API returns a session (confirmed live);
 * the web returns `{ tokenHash }`. Both are accepted.
 */
export const OtpVerifyResponse = z.union([SessionVariant, TokenHashVariant]);
export type OtpVerifyResponse = z.infer<typeof OtpVerifyResponse>;

/** `user_details` row (key `id` = auth uid; confirmed live). Only the columns the app reads. */
export const UserDetails = z.object({
  id: z.string().min(1),
  full_name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  referral_code: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
  is_active: z.boolean().nullable().optional(),
});
export type UserDetails = z.infer<typeof UserDetails>;

const RoleRef = z.object({ name: z.string() });
/** `user_roles?select=roles(name)` row; PostgREST may embed an object, an array or null. */
export const UserRole = z.object({ roles: z.union([RoleRef, z.array(RoleRef), z.null()]) });
export type UserRole = z.infer<typeof UserRole>;

/** `rpc/my_permissions` row. */
export const Permission = z.object({
  menu_id: z.string(),
  can_view: z.boolean(),
  can_create: z.boolean(),
  can_edit: z.boolean(),
  can_delete: z.boolean(),
});
export type Permission = z.infer<typeof Permission>;

/** Validate a backend payload; a mismatch is loud in dev and an ApiError everywhere. */
export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown, what: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    logger.error(`Schema mismatch: ${what}`, result.error.issues);
    throw new ApiError({
      kind: 'server',
      code: 'SCHEMA_MISMATCH',
      message: `Unexpected response for ${what}`,
      raw: result.error.issues,
    });
  }
  return result.data;
}
