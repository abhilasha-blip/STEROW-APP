import { logger } from '@/utils/logger';
import { ENDPOINTS } from '../endpoints';
import { ApiError, normalizeError } from '../errors';
import { parseOrThrow, Permission, UserDetails, UserRole } from '../schemas/auth.schemas';
import { getSupabase } from '../supabase';
import { z } from 'zod';

export type BootstrapUser = {
  id: string;
  fullName: string;
  /** 10 digits (from user_details, falling back to user_metadata: auth `user.phone` is empty). */
  phone: string;
  roles: string[];
  permissions: Permission[];
};

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

function roleNames(rows: UserRole[]): string[] {
  const names = rows.flatMap(r => (r.roles === null ? [] : Array.isArray(r.roles) ? r.roles : [r.roles]));
  return [...new Set(names.map(r => r.name))];
}

/**
 * Everything the app needs right after sign-in, fetched in parallel.
 * Required: auth user + user_details. Best-effort (logged, empty on failure): roles, permissions,
 * so a permissions hiccup never locks a user out.
 */
export async function fetchBootstrap(uid: string): Promise<BootstrapUser> {
  const supabase = getSupabase();
  const { REST, RPC } = ENDPOINTS.SUPABASE;

  const [userRes, detailsRes, rolesRes, permsRes] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from(REST.USER_DETAILS).select('*').eq('id', uid).maybeSingle(),
    supabase.from(REST.USER_ROLES).select('roles(name)').eq('user_id', uid),
    supabase.rpc(RPC.MY_PERMISSIONS),
  ]);

  if (userRes.error) {
    throw normalizeError(userRes.error);
  }
  if (detailsRes.error) {
    throw normalizeError(detailsRes.error);
  }
  const user = userRes.data.user;
  if (!user || user.id !== uid) {
    throw new ApiError({ kind: 'server', code: 'USER_MISMATCH', message: 'Signed-in user does not match' });
  }
  const details = detailsRes.data ? parseOrThrow(UserDetails, detailsRes.data, 'user_details') : null;

  let roles: string[] = [];
  if (rolesRes.error) {
    logger.warn('user_roles failed', rolesRes.error);
  } else {
    roles = roleNames(parseOrThrow(z.array(UserRole), rolesRes.data, 'user_roles'));
  }

  let permissions: Permission[] = [];
  if (permsRes.error) {
    logger.warn('my_permissions failed', permsRes.error);
  } else {
    permissions = parseOrThrow(z.array(Permission), permsRes.data ?? [], 'my_permissions');
  }

  const meta = user.user_metadata ?? {};
  return {
    id: uid,
    fullName: details?.full_name || str(meta.full_name),
    phone: details?.phone || str(meta.phone),
    roles,
    permissions,
  };
}
