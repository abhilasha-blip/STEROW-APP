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
export type DashboardCounts = {
  /** Vehicle documents (RC, insurance, PUC, FASTag rows) + the driving licence. */
  documents: number | null;
  /** vehicle_shares rows visible to the user. */
  shares: number | null;
  /** service_bookings rows visible to the user. */
  bookings: number | null;
};

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

/** All counts in parallel (HEAD + count=exact; RLS limits rows to the user's). */
export async function fetchDashboardCounts(uid: string): Promise<DashboardCounts> {
  const [documents, shares, bookings] = await Promise.all([
    orNull('documents', async () => {
      const counts = await Promise.all([
        ...VDOCS.map(t => headCount(t)),
        headCount(REST.USER_DRIVING_LICENSES, q => q.eq('user_id', uid)),
      ]);
      return counts.reduce((a, b) => a + b, 0);
    }),
    orNull('shares', () => headCount(REST.VEHICLE_SHARES)),
    orNull('bookings', () => headCount(REST.SERVICE_BOOKINGS)),
  ]);
  return { documents, shares, bookings };
}

/** The onboarding parts the "profile pending" banner counts. */
export type ProfileCompletion = {
  profile: boolean;
  drivingLicence: boolean;
  vehicle: boolean;
  /** 0–100, rounded. */
  percent: number;
  /** First incomplete onboarding step ("Complete Now"), or null when complete. */
  nextStep: 'Step1Profile' | 'Step2DrivingLicence' | 'Step3Documents' | null;
};

export function profileCompletion(parts: { profile: boolean; drivingLicence: boolean; vehicle: boolean }): ProfileCompletion {
  const done = [parts.profile, parts.drivingLicence, parts.vehicle].filter(Boolean).length;
  return {
    ...parts,
    percent: Math.round((done / 3) * 100),
    nextStep: !parts.profile
      ? 'Step1Profile'
      : !parts.drivingLicence
      ? 'Step2DrivingLicence'
      : !parts.vehicle
      ? 'Step3Documents'
      : null,
  };
}
