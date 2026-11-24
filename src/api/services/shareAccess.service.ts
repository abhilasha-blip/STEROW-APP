import { z } from 'zod';
import { ENDPOINTS } from '../endpoints';
import { unwrap } from '../rest';
import { parseOrThrow } from '../schemas/auth.schemas';
import { getSupabase } from '../supabase';

const { REST } = ENDPOINTS.SUPABASE;

export type ShareRole = 'owner' | 'family' | 'driver' | 'guest';

/**
 * vehicle_shares columns as the web's Share Access page reads / writes them (share-access-*.js):
 * owner_id, vehicle_id, member_user_id (set once the member signs up), member_phone, member_name,
 * member_role, method (otp / link), status (pending / active …), is_active, can_book_service,
 * valid_from / valid_to, invite_token. There is no member e-mail column.
 */
const ShareRow = z.object({
  id: z.string(),
  vehicle_id: z.string(),
  member_user_id: z.string().nullable().optional(),
  member_phone: z.string().nullable().optional(),
  member_name: z.string().nullable().optional(),
  member_role: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
});
type ShareRowT = z.infer<typeof ShareRow>;

/** One person the signed-in user shares vehicles with (their shares grouped). */
export type SharedPerson = {
  id: string;
  name: string | null;
  phone: string | null;
  role: ShareRole | null;
  /** The member has signed up and the share is active (the web's "Active"). */
  verified: boolean;
  vehicleIds: string[];
};

const ROLES: readonly ShareRole[] = ['owner', 'family', 'driver', 'guest'];
const asRole = (r: string | null | undefined): ShareRole | null =>
  ROLES.includes(r as ShareRole) ? (r as ShareRole) : null;

/** Active shares on the user's own vehicles (owner_id = uid; shares *with* the user are excluded). */
const ownedActiveShares = (q: any, uid: string) => q.eq('owner_id', uid).eq('is_active', true);

/**
 * Groups share rows by member, keeping first-seen order. Keyed by phone first (every share has one), so a
 * member's pending (no user id yet) and active shares are one person; else the user id, else the row.
 */
export function groupShares(rows: ShareRowT[]): SharedPerson[] {
  const people = new Map<string, SharedPerson>();
  for (const r of rows) {
    const key = r.member_phone || r.member_user_id || r.id;
    const verified = r.status === 'active' && !!r.member_user_id;
    const existing = people.get(key);
    if (existing) {
      if (!existing.vehicleIds.includes(r.vehicle_id)) {
        existing.vehicleIds.push(r.vehicle_id);
      }
      existing.name ??= r.member_name ?? null;
      existing.verified ||= verified;
      continue;
    }
    people.set(key, {
      id: r.id,
      name: r.member_name ?? null,
      phone: r.member_phone ?? null,
      role: asRole(r.member_role),
      verified,
      vehicleIds: [r.vehicle_id],
    });
  }
  return [...people.values()];
}

export async function listSharedPeople(uid: string): Promise<SharedPerson[]> {
  const res = unwrap(
    await ownedActiveShares(
      getSupabase()
        .from(REST.VEHICLE_SHARES)
        .select('id,vehicle_id,member_user_id,member_phone,member_name,member_role,status'),
      uid,
    ).order('created_at', { ascending: false }),
  );
  return groupShares(parseOrThrow(z.array(ShareRow), res.data, 'vehicle_shares'));
}
