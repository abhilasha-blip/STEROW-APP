import { z } from 'zod';
import { logger } from '@/utils/logger';
import { ENDPOINTS } from '../endpoints';
import { ApiError } from '../errors';
import { unwrap } from '../rest';
import { parseOrThrow } from '../schemas/auth.schemas';
import { getSupabase } from '../supabase';

const { REST } = ENDPOINTS.SUPABASE;
const Count = z.number().int().nonnegative();

/** Dashboard tile counts; null = couldn't be read (shown as "–"), never blocks the dashboard. */
export type DashboardCounts = ServerCounts & {
  /** People the user shares their vehicles with (= the Share Access cards; see useSharedPeople). */
  shares: number | null;
};

/** The counts read with HEAD + count=exact. */
export type ServerCounts = {
  /** Vehicle documents (RC, insurance, PUC, FASTag rows) + the driving licence. */
  documents: number | null;
  /** The user's open service bookings (requested … in service). */
  bookings: number | null;
  /** The user's serviced bookings (service completed … delivered). */
  serviceHistory: number | null;
};

/** service_bookings.status values (ENDPOINTS.md, Services - Bookings) after the service is done: the service history. */
export const SERVICED_STATUSES = ['service_completed', 'invoiced', 'paid', 'out_for_delivery', 'delivered'] as const;
/** Bookings that are neither serviced nor closed without a service. */
const CLOSED_STATUSES = [...SERVICED_STATUSES, 'rejected', 'cancelled'];

const VDOCS = [REST.VDOCS_RC, REST.VDOCS_INSURANCE, REST.VDOCS_POLLUTION, REST.VDOCS_FASTAG] as const;

async function headCount(table: string, filter?: (q: any) => any): Promise<number> {
  let q = getSupabase().from(table).select('id', { count: 'exact', head: true });
  if (filter) {
    q = filter(q);
  }
  return parseOrThrow(Count, unwrap(await q).count, `${table} count`);
}

const orNull = async (what: string, read: () => Promise<number>) => {
  try {
    return await read();
  } catch (e) {
    logger.warn(`dashboard count failed: ${what}`, { kind: e instanceof ApiError ? e.kind : 'unknown' });
    return null;
  }
};

/** All counts in parallel (HEAD + count=exact), each scoped to the signed-in user. */
export async function fetchDashboardCounts(uid: string): Promise<ServerCounts> {
  const [documents, bookings, serviceHistory] = await Promise.all([
    orNull('documents', async () => {
      const counts = await Promise.all([
        ...VDOCS.map(t => headCount(t)),
        headCount(REST.USER_DRIVING_LICENSES, q => q.eq('user_id', uid)),
      ]);
      return counts.reduce((a, b) => a + b, 0);
    }),
    orNull('bookings', () =>
      headCount(REST.SERVICE_BOOKINGS, q => q.eq('customer_id', uid).not('status', 'in', `(${CLOSED_STATUSES.join(',')})`)),
    ),
    orNull('serviceHistory', () =>
      headCount(REST.SERVICE_BOOKINGS, q => q.eq('customer_id', uid).in('status', [...SERVICED_STATUSES])),
    ),
  ]);
  return { documents, bookings, serviceHistory };
}

const VehicleIdRows = z.array(z.object({ vehicle_id: z.string() }));

/**
 * Documents per vehicle (RC, insurance, PUC, FASTag rows) for the given vehicles: the profile-completion
 * "vehicle with a document" item. Vehicles without a document are 0.
 */
export async function fetchVehicleDocumentCounts(vehicleIds: readonly string[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = Object.fromEntries(vehicleIds.map(id => [id, 0]));
  if (!vehicleIds.length) {
    return counts;
  }
  const supabase = getSupabase();
  const tables = await Promise.all(
    VDOCS.map(async t => parseOrThrow(VehicleIdRows, unwrap(await supabase.from(t).select('vehicle_id').in('vehicle_id', [...vehicleIds])).data, t)),
  );
  for (const row of tables.flat()) {
    counts[row.vehicle_id] = (counts[row.vehicle_id] ?? 0) + 1;
  }
  return counts;
}
